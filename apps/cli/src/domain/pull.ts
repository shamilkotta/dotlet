import { basename } from "node:path";
import figures from "figures";
import * as Effect from "effect/Effect";
import { CliPathError } from "../errors.js";
import { DotletApi } from "../services/dotlet-api.js";
import { FileService, ensureParentDir, readIfExists } from "../services/file-service.js";
import { Terminal } from "../services/terminal.js";
import { normalizePath } from "./path.js";

export type PullTarget = {
  device: string;
  islet: string;
  version?: string;
};

export type PullFile = {
  path: string;
  downloadUrl: string;
};

export type ResolvePullTargetInput = {
  raw: string;
  deviceFlag?: string;
  versionFlag?: string;
  username?: string;
  device?: string;
};

function mergeVersions(inline: string | undefined, flag: string | undefined): string | undefined {
  const i = inline?.trim() || undefined;
  const f = flag?.trim() || undefined;
  if (i && f && i !== f) {
    throw new Error(
      "Conflicting version: use either one ?v= in the target or --version, not two different values.",
    );
  }
  return f ?? i;
}

function isHttpUrl(raw: string): boolean {
  const t = raw.trim().toLowerCase();
  return t.startsWith("http://") || t.startsWith("https://");
}

function parsePullWebUrl(raw: string): { device: string; islet: string; version?: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Invalid pull URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Pull URL must use http or https");
  }
  const segments = parsed.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (segments.length < 3 || segments[segments.length - 1] !== "islet") {
    throw new Error("Pull URL path must be /{username}/{device}/islet");
  }
  const deviceSegment = segments[segments.length - 2];
  const usernameSegment = segments[segments.length - 3];
  if (!usernameSegment || !deviceSegment) {
    throw new Error("Pull URL path must include username and device before /islet");
  }
  const n = parsed.searchParams.get("n")?.trim();
  if (!n) {
    throw new Error("Pull URL must include a non-empty n query parameter (islet path)");
  }
  const v = parsed.searchParams.get("v")?.trim() || undefined;
  return {
    device: `${usernameSegment}/${deviceSegment}`,
    islet: n,
    version: v,
  };
}

function splitIsletPathAndVersionQuery(raw: string): { path: string; version?: string } {
  const trimmed = raw.trim();
  const q = trimmed.indexOf("?");
  if (q === -1) {
    return { path: trimmed };
  }
  const path = trimmed.slice(0, q).trim();
  const query = trimmed.slice(q + 1);
  const version = new URLSearchParams(query).get("v")?.trim() || undefined;
  return { path, version };
}

function isFullPullTargetShape(trimmed: string): boolean {
  const c = trimmed.indexOf(":");
  if (c === -1) {
    return false;
  }
  return trimmed.slice(0, c).includes("/");
}

function parseFullPullTarget(trimmed: string): { device: string; islet: string; version?: string } {
  const firstColon = trimmed.indexOf(":");
  const devicePart = trimmed.slice(0, firstColon).trim();
  const rest = trimmed.slice(firstColon + 1);
  if (!devicePart || !rest) {
    throw new Error("Pull target must be in format username/device:islet");
  }
  const deviceSegments = devicePart.split("/");
  if (deviceSegments.length !== 2 || !deviceSegments[0] || !deviceSegments[1]) {
    throw new Error("Pull target must be in format username/device:islet");
  }
  const device = devicePart;
  const { path: islet, version } = splitIsletPathAndVersionQuery(rest);
  if (!islet) {
    throw new Error(
      "Pull target must be in format username/device:islet or username/device:islet?v=version",
    );
  }
  return { device, islet, version };
}

function parseShortPullTarget(trimmed: string): { islet: string; version?: string } {
  const { path: islet, version } = splitIsletPathAndVersionQuery(trimmed);
  if (!islet) {
    throw new Error("Islet path is required (use islet or islet?v=version)");
  }
  return { islet, version };
}

function resolveDeviceStringForShortPull(
  deviceFromFlagOrDefault: string,
  sessionUsername: string | undefined,
): string {
  const parts = deviceFromFlagOrDefault
    .trim()
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (parts.length === 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  if (parts.length === 1) {
    const user = sessionUsername?.trim();
    if (!user) {
      throw new Error(
        "No username in config. Run dotlet login again, or use --device username/device or the full form username/device:islet.",
      );
    }
    return `${user}/${parts[0]}`;
  }
  throw new Error(
    "Invalid device: use a device name, username/device, --device, or dotlet device use <device>.",
  );
}

export function resolvePullTarget(input: ResolvePullTargetInput): PullTarget {
  const raw = input.raw.trim();
  if (!raw) {
    throw new Error("Pull target is required");
  }

  if (input.deviceFlag?.trim() && isHttpUrl(raw)) {
    throw new Error("Cannot use --device with a web URL; the device is already in the URL.");
  }

  if (isHttpUrl(raw)) {
    const parsed = parsePullWebUrl(raw);
    const version = mergeVersions(parsed.version, input.versionFlag);
    return {
      device: parsed.device,
      islet: parsed.islet,
      version,
    };
  }

  const trimmed = raw;

  if (input.deviceFlag?.trim() && isFullPullTargetShape(trimmed)) {
    throw new Error(
      "Cannot combine --device with username/device:islet; specify the device in the target or use a short islet name with --device.",
    );
  }

  if (isFullPullTargetShape(trimmed)) {
    const { device, islet, version: inlineV } = parseFullPullTarget(trimmed);
    const version = mergeVersions(inlineV, input.versionFlag);
    return { device, islet, version };
  }

  const short = parseShortPullTarget(trimmed);
  const deviceSource = input.deviceFlag?.trim() ?? input.device?.trim();
  if (!deviceSource) {
    throw new Error(
      "No device selected. Specify --device or set a default device with dotlet device use <device>.",
    );
  }

  const device = resolveDeviceStringForShortPull(deviceSource, input.username);
  const version = mergeVersions(short.version, input.versionFlag);
  return {
    device,
    islet: short.islet,
    version,
  };
}

export function parsePullTarget(rawTarget: string): PullTarget {
  const trimmed = rawTarget.trim();
  const colon = trimmed.indexOf(":");
  if (colon === -1) {
    throw new Error("Pull target must be in format username/device:islet");
  }

  const device = trimmed.slice(0, colon).trim();
  const afterColon = trimmed.slice(colon + 1);
  const { path: islet, version } = splitIsletPathAndVersionQuery(afterColon);

  if (!device || !islet) {
    throw new Error("Pull target must be in format username/device:islet");
  }

  const deviceSegments = device.split("/");
  if (deviceSegments.length !== 2 || !deviceSegments[0] || !deviceSegments[1]) {
    throw new Error("Pull target must be in format username/device:islet");
  }

  return {
    device,
    islet,
    version,
  };
}

export function buildPullApiPath(target: PullTarget): string {
  let path = `/api/islets/pull?device=${encodeURIComponent(target.device)}&islet=${encodeURIComponent(target.islet)}`;
  if (target.version) {
    path += `&v=${encodeURIComponent(target.version)}`;
  }
  return path;
}

export function resolvePullOutputPath(
  file: PullFile,
  islet: string,
  options: { path?: string },
): string {
  if (!options.path) {
    return normalizePath(file.path);
  }

  const normalizedPath = normalizePath(options.path);
  const looksLikeDirectory = options.path.endsWith("/") || file.path !== islet;
  if (!looksLikeDirectory) {
    return normalizedPath;
  }

  const destination = normalizedPath.replace(/\/+$/, "");
  const trimmedIslet = islet.replace(/\/+$/, "");
  if (file.path === trimmedIslet) {
    return `${destination}/${basename(file.path)}`;
  }
  if (!file.path.startsWith(trimmedIslet)) {
    return `${destination}/${file.path.replace(/^\/+/, "")}`;
  }
  const isletLen = trimmedIslet.length;

  return destination + file.path.slice(isletLen);
}

export function writePulledFiles(
  files: PullFile[],
  islet: string,
  options: { force?: boolean; path?: string },
) {
  return Effect.gen(function* () {
    const api = yield* DotletApi;
    const terminal = yield* Terminal;
    const fileService = yield* FileService;
    const written: string[] = [];
    const skipped: string[] = [];

    const total = files.length;
    yield* terminal.startSpinner(`Pulling files... (0/${total})`);

    let index = 0;
    for (const file of files) {
      index += 1;
      yield* terminal.updateSpinner(`Pulling files... (${index}/${total})`);

      const outputPath = yield* Effect.try({
        try: () => resolvePullOutputPath(file, islet, options),
        catch: (cause) =>
          new CliPathError({
            message: cause instanceof Error ? cause.message : "Invalid output path",
            cause,
          }),
      });

      yield* ensureParentDir(outputPath);
      if (!options.force) {
        const existing = yield* readIfExists(outputPath);
        if (existing !== null) {
          skipped.push(outputPath);
          continue;
        }
      }

      const content = yield* api.downloadText(file.downloadUrl, file.path);
      yield* fileService.writeUtf8(outputPath, content);
      written.push(outputPath);
    }

    yield* terminal.succeedSpinner(
      `Pulled ${written.length} file${written.length === 1 ? "" : "s"}`,
    );

    for (const path of skipped) {
      yield* terminal.warn(`Skipped existing file: ${path} (use --force)`);
    }

    for (const path of written) {
      yield* terminal.muted(`  ${figures.pointer} ${path}`);
    }

    return written;
  });
}
