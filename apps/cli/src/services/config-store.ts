import { dirname } from "node:path";
import * as fs from "node:fs/promises";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CONFIG_PATH, DEFAULT_CONFIG, type CliConfig, decodeCliConfig } from "../config.js";
import { CliConfigError } from "../errors.js";

export interface ConfigStore {
  readonly read: Effect.Effect<CliConfig, CliConfigError>;
  readonly write: (config: CliConfig) => Effect.Effect<void, CliConfigError>;
}

export const ConfigStore = Context.GenericTag<ConfigStore>("@dotlet/ConfigStore");

export const ConfigStoreLive = Layer.succeed(ConfigStore, {
  read: Effect.tryPromise({
    try: () => fs.readFile(CONFIG_PATH, "utf8"),
    catch: (cause) => cause,
  }).pipe(
    Effect.flatMap((raw) =>
      Effect.try({
        try: () => JSON.parse(raw) as unknown,
        catch: (cause) =>
          new CliConfigError({
            message: "Invalid CLI config JSON",
            cause,
          }),
      }),
    ),
    Effect.flatMap(decodeCliConfig),
    Effect.catchAll((error) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === "ENOENT"
      ) {
        return Effect.succeed(DEFAULT_CONFIG);
      }

      return Effect.fail(
        error instanceof CliConfigError
          ? error
          : new CliConfigError({
              message: "Unable to read CLI config",
              cause: error,
            }),
      );
    }),
  ),
  write: (config) =>
    Effect.tryPromise({
      try: async () => {
        await fs.mkdir(dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), {
          mode: 0o600,
        });
      },
      catch: (cause) =>
        new CliConfigError({
          message: "Unable to write CLI config",
          cause,
        }),
    }),
});
