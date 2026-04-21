import chalk from "chalk";
import figures from "figures";
import * as Effect from "effect/Effect";
import { type CliConfig } from "./config.js";
import {
  CliApiError,
  CliAuthError,
  CliBrowserError,
  CliConfigError,
  CliDownloadError,
  CliPathError,
  CliUploadError,
  CliValidationError,
} from "./errors.js";
import { buildPullApiPath, resolvePullTarget, writePulledFiles } from "./domain/pull.js";
import { buildUploadOncePerHash, uploadMissingFiles } from "./domain/push.js";
import { PathService } from "./domain/path.js";
import { Browser } from "./services/browser.js";
import { ConfigStore } from "./services/config-store.js";
import { DotletApi } from "./services/dotlet-api.js";
import { Terminal } from "./services/terminal.js";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) {
    return `${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

function requireAccessToken(config: CliConfig): Effect.Effect<string, CliAuthError> {
  return config.accessToken
    ? Effect.succeed(config.accessToken)
    : Effect.fail(new CliAuthError({ message: "Not logged in. Run dotlet login first." }));
}

function requireDeviceName(
  device: string | undefined,
  config: CliConfig,
): Effect.Effect<string, CliValidationError> {
  const resolved = device ?? config.device;
  return resolved
    ? Effect.succeed(resolved)
    : Effect.fail(
        new CliValidationError({
          message:
            "No device selected. Please specify a device with --device or set a default device with 'dotlet device use <device>'.",
        }),
      );
}

function visibilityBadge(visibility: string | undefined): string {
  if (!visibility) {
    return chalk.gray("unknown");
  }
  return visibility === "public" ? chalk.green(visibility) : chalk.magenta(visibility);
}

export function runLogin() {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const api = yield* DotletApi;
    const browser = yield* Browser;
    const terminal = yield* Terminal;
    const config = yield* configStore.read;
    const start = yield* api.startDeviceAuthorization();

    yield* configStore.write({ ...config });

    const verificationUrl = start.verification_uri_complete ?? start.verification_uri;
    const boxContent = [
      `${chalk.bold("URL")}      ${verificationUrl}`,
      `${chalk.bold("Code")}     ${start.user_code}`,
      `${chalk.bold("Expires")}  about ${formatDuration(start.expires_in)}`,
    ].join("\n");

    yield* terminal.log();
    yield* terminal.log(chalk.bold("dotlet login"));
    yield* terminal.box(boxContent);

    const browserOpenedAt = Date.now();
    yield* browser.openUrl(verificationUrl).pipe(
      Effect.matchEffect({
        onFailure: () =>
          terminal.warn("Could not open browser automatically. Open the URL manually."),
        onSuccess: () =>
          terminal.success(
            `Browser opened (${((Date.now() - browserOpenedAt) / 1000).toFixed(1)}s)`,
          ),
      }),
    );

    const startedAt = Date.now();
    const timeoutMs = start.expires_in * 1000;
    let pollingIntervalSeconds = start.interval;

    yield* terminal.startSpinner("Waiting for authorization...");

    while (Date.now() - startedAt < timeoutMs) {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remainingSeconds = Math.max(Math.ceil(timeoutMs / 1000) - elapsedSeconds, 0);

      yield* terminal.updateSpinner(
        `Waiting for authorization... ${formatDuration(elapsedSeconds)} elapsed, ${formatDuration(remainingSeconds)} remaining`,
      );

      yield* Effect.sleep(`${pollingIntervalSeconds} seconds`);

      const result = yield* api.pollDeviceToken(start.device_code);
      switch (result._tag) {
        case "Authorized": {
          const sessionPayload = yield* api
            .getSession(result.accessToken)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));
          const ownerUsername =
            sessionPayload?.user.username?.trim() ?? sessionPayload?.user.name?.trim();
          yield* configStore.write({
            ...config,
            accessToken: result.accessToken,
            ...(ownerUsername ? { username: ownerUsername } : {}),
          });
          yield* terminal.succeedSpinner("Login successful. CLI is now authorized.");
          return;
        }
        case "Pending":
          continue;
        case "SlowDown":
          pollingIntervalSeconds += 5;
          continue;
        case "Denied":
          yield* terminal.stopSpinner;
          yield* Effect.fail(new CliAuthError({ message: "Access denied by user." }));
        case "Expired":
          yield* terminal.stopSpinner;
          yield* Effect.fail(
            new CliAuthError({
              message: "Device code has expired. Please run dotlet login again.",
            }),
          );
      }
    }

    yield* terminal.stopSpinner;
    yield* Effect.fail(new CliAuthError({ message: "Timed out waiting for device approval." }));
  });
}

export function runLogout() {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const terminal = yield* Terminal;
    const config = yield* configStore.read;

    if (!config.accessToken) {
      yield* terminal.warn("Already logged out.");
      return;
    }

    yield* configStore.write({
      ...config,
      accessToken: undefined,
      username: undefined,
    });
    yield* terminal.success("Logged out successfully.");
  });
}

export function runPush(options: {
  path: string;
  device?: string;
  name?: string;
  absolute?: boolean;
  message?: string;
  visibility?: "public" | "private";
}) {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const terminal = yield* Terminal;
    const pathService = yield* PathService;
    const api = yield* DotletApi;
    const config = yield* configStore.read;
    const accessToken = yield* requireAccessToken(config);
    const normalizedPath = yield* pathService.normalizePath(options.path);
    const key = yield* pathService.keyPath(options.path, {
      name: options.name,
      absolute: options.absolute,
    });
    const device = yield* requireDeviceName(options.device, config);

    yield* terminal.startSpinner("Scanning files...");
    const filesMap = yield* pathService
      .hashes(normalizedPath, key)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));
    yield* terminal.succeedSpinner(
      `Scanned ${filesMap.size} file${filesMap.size === 1 ? "" : "s"}`,
    );

    const files = [...filesMap.entries()].map(([path, entry]) => ({
      path,
      contentHash: entry.hash,
      size: entry.size,
    }));

    const body = {
      device,
      message: options.message,
      files,
      visibility: options.visibility,
    };

    yield* terminal.startSpinner("Pushing to dotlet...");
    let result = yield* api
      .pushIslets(body, accessToken)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));

    if (result.status === "missing_files") {
      yield* terminal.stopSpinner;
      const missingResult = result;
      const uploadOncePerHash = yield* Effect.try({
        try: () => buildUploadOncePerHash([...missingResult.missingFiles], filesMap),
        catch: (cause) =>
          new CliValidationError({
            message: cause instanceof Error ? cause.message : "Invalid upload state",
            cause,
          }),
      });

      yield* uploadMissingFiles(uploadOncePerHash);

      yield* terminal.startSpinner("Finalizing push...");
      result = yield* api
        .pushIslets(body, accessToken)
        .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));
    }

    if (result.status !== "ok") {
      yield* terminal.stopSpinner;
    }

    const okResult =
      result.status === "ok"
        ? result
        : yield* Effect.fail(
            new CliApiError({
              message: `Unexpected push response: ${JSON.stringify(result)}`,
            }),
          );

    yield* terminal.succeedSpinner("Push complete");

    yield* terminal.success(
      `Pushed ${normalizedPath} (${okResult.created.length} updated, ${okResult.unchanged.length} unchanged)`,
    );
    for (const created of okResult.created) {
      yield* terminal.muted(
        `  ${figures.pointer} ${created.path} ${chalk.gray(created.revisionId)}`,
      );
    }
  });
}

export function runPull(options: {
  name: string;
  force?: boolean;
  path?: string;
  device?: string;
  version?: string;
}) {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const api = yield* DotletApi;
    const terminal = yield* Terminal;
    const config = yield* configStore.read;
    const accessToken = yield* requireAccessToken(config);
    const target = yield* Effect.try({
      try: () =>
        resolvePullTarget({
          raw: options.name,
          deviceFlag: options.device,
          versionFlag: options.version,
          username: config.username,
          device: config.device,
        }),
      catch: (cause) =>
        new CliValidationError({
          message: cause instanceof Error ? cause.message : "Invalid pull target",
          cause,
        }),
    });

    yield* terminal.startSpinner("Fetching islet...");
    const payload = yield* api
      .pullIslet(buildPullApiPath(target), accessToken)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));

    if (payload.files.length === 0) {
      yield* terminal.stopSpinner;
      yield* Effect.fail(
        new CliValidationError({
          message: `Islet not found: ${target.device}:${target.islet}`,
        }),
      );
    }

    yield* terminal.succeedSpinner("Fetched islet manifest");

    yield* writePulledFiles([...payload.files], target.islet, options).pipe(
      Effect.tapError(() => Effect.ignore(terminal.stopSpinner)),
    );
  });
}

export function runList(options: { device?: string } = {}) {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const terminal = yield* Terminal;
    const api = yield* DotletApi;
    const config = yield* configStore.read;
    const accessToken = yield* requireAccessToken(config);
    const device = yield* requireDeviceName(options.device, config);

    yield* terminal.startSpinner("Fetching islets...");
    const payload = yield* api
      .listIslets(device, accessToken)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));

    if (payload.islets.length === 0) {
      yield* terminal.stopSpinner;
      yield* terminal.warn(`No islets found for device "${payload.device}".`);
      return;
    }

    yield* terminal.succeedSpinner(
      `Found ${payload.islets.length} islet${payload.islets.length === 1 ? "" : "s"}`,
    );
    yield* terminal.info(`${chalk.bold(payload.device)}`);
    yield* terminal.log();
    for (const islet of payload.islets) {
      yield* terminal.log(`  ${figures.pointer} ${islet.path}`);
    }
  });
}

export function runDeviceList(options: { username?: string }) {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const terminal = yield* Terminal;
    const api = yield* DotletApi;
    const config = yield* configStore.read;
    const accessToken = yield* requireAccessToken(config);

    yield* terminal.startSpinner("Fetching devices...");
    const payload = yield* api
      .listDevices(options.username, accessToken)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));

    if (payload.devices.length === 0) {
      yield* terminal.stopSpinner;
      const scope = options.username?.trim() ? ` for @${options.username.trim()}` : "";
      yield* terminal.warn(`No devices found${scope}.`);
      return;
    }

    yield* terminal.succeedSpinner(
      `Fetched ${payload.devices.length} device${payload.devices.length === 1 ? "" : "s"}`,
    );
    yield* terminal.log();
    const defaultDeviceLower = config.device?.toLowerCase();
    const nameColWidth = Math.max(...payload.devices.map((d) => d.name.length), 4);

    for (const device of payload.devices) {
      const isDefault = defaultDeviceLower && device.name.toLowerCase() === defaultDeviceLower;
      const radio = isDefault ? chalk.green(figures.radioOn) : chalk.gray(figures.radioOff);
      const namePadded = device.name.padEnd(nameColWidth);
      yield* terminal.log(`  ${radio}  ${namePadded}  ${visibilityBadge(device.visibility)}`);
    }
  });
}

export function runDeviceCreate(options: { name: string; visibility?: "public" | "private" }) {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const terminal = yield* Terminal;
    const api = yield* DotletApi;
    const config = yield* configStore.read;
    const accessToken = yield* requireAccessToken(config);

    yield* terminal.startSpinner("Creating device...");
    const result = yield* api
      .createDevice(options.name, options.visibility, accessToken)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));
    yield* terminal.succeedSpinner(`Created device: ${result.device.name}`);
  });
}

export function runDeviceUse(options: { name: string }) {
  return Effect.gen(function* () {
    const configStore = yield* ConfigStore;
    const terminal = yield* Terminal;
    const api = yield* DotletApi;
    const config = yield* configStore.read;
    const accessToken = yield* requireAccessToken(config);

    yield* terminal.startSpinner("Verifying device...");
    const payload = yield* api
      .listDevices(undefined, accessToken)
      .pipe(Effect.tapError(() => Effect.ignore(terminal.stopSpinner)));
    const nameLower = options.name.toLowerCase();
    const exists = payload.devices.some((device) => device.name.toLowerCase() === nameLower);

    if (!exists) {
      yield* terminal.stopSpinner;
      yield* Effect.fail(
        new CliValidationError({
          message: `Device "${options.name}" not found.`,
        }),
      );
    }

    yield* configStore.write({
      ...config,
      device: options.name,
    });
    yield* terminal.succeedSpinner(`Default device set to ${options.name}`);
  });
}

export function formatCliError(error: unknown): string {
  if (
    error instanceof CliApiError ||
    error instanceof CliAuthError ||
    error instanceof CliBrowserError ||
    error instanceof CliConfigError ||
    error instanceof CliDownloadError ||
    error instanceof CliPathError ||
    error instanceof CliUploadError ||
    error instanceof CliValidationError
  ) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
