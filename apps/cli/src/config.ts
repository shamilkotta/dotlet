import { homedir } from "node:os";
import { resolve } from "node:path";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { CliConfigError } from "./errors.js";

export const CONFIG_PATH = resolve(homedir(), ".config", "dotlet", "config.json");

export const DEFAULT_API_BASE_URL = process.env.DOTLET_BASE_URL ?? "http://localhost:3000";

const UrlSchema = Schema.String.pipe(Schema.pattern(/^https?:\/\/\S+$/));

export const CliConfigSchema = Schema.Struct({
  apiBaseUrl: UrlSchema,
  device: Schema.optional(Schema.String),
  accessToken: Schema.optional(Schema.String),
  username: Schema.optional(Schema.String),
});

const PartialCliConfigSchema = Schema.partial(CliConfigSchema);

export type CliConfig = Schema.Schema.Type<typeof CliConfigSchema>;

export const DEFAULT_CONFIG: CliConfig = {
  apiBaseUrl: DEFAULT_API_BASE_URL,
};

export function decodeCliConfig(input: unknown): Effect.Effect<CliConfig, CliConfigError> {
  return Schema.decodeUnknown(PartialCliConfigSchema)(input).pipe(
    Effect.map((partial) => ({
      apiBaseUrl: partial.apiBaseUrl ?? DEFAULT_CONFIG.apiBaseUrl,
      device: partial.device ?? DEFAULT_CONFIG.device,
      accessToken: partial.accessToken,
      username: partial.username,
    })),
    Effect.mapError(
      (cause) =>
        new CliConfigError({
          message: "Invalid CLI config",
          cause,
        }),
    ),
  );
}
