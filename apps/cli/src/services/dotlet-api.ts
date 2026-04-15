import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { type CliConfig } from "../config.js";
import { CliApiError, CliDownloadError, CliUploadError } from "../errors.js";
import { formatHttpErrorMessage } from "../format-http-error.js";
import { ConfigStore } from "./config-store.js";

const DeviceStartSchema = Schema.Struct({
  device_code: Schema.String,
  user_code: Schema.String,
  verification_uri: Schema.String,
  verification_uri_complete: Schema.optional(Schema.String),
  expires_in: Schema.Number,
  interval: Schema.Number,
});

const DeviceTokenSuccessSchema = Schema.Struct({
  access_token: Schema.String,
});

const PushOkSchema = Schema.Struct({
  status: Schema.Literal("ok"),
  created: Schema.Array(
    Schema.Struct({
      path: Schema.String,
      revisionId: Schema.String,
    }),
  ),
  unchanged: Schema.Array(Schema.String),
});

const PushMissingFilesSchema = Schema.Struct({
  status: Schema.Literal("missing_files"),
  missingFiles: Schema.Array(
    Schema.Struct({
      path: Schema.String,
      contentHash: Schema.String,
      uploadUrl: Schema.String,
    }),
  ),
  unchanged: Schema.Array(Schema.String),
});

const PushResponseSchema = Schema.Union(PushOkSchema, PushMissingFilesSchema);

const PullResponseSchema = Schema.Struct({
  files: Schema.Array(
    Schema.Struct({
      path: Schema.String,
      downloadUrl: Schema.String,
    }),
  ),
});

const DeviceListResponseSchema = Schema.Struct({
  owner: Schema.NullOr(Schema.String),
  devices: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      visibility: Schema.optional(
        Schema.Union(Schema.Literal("public"), Schema.Literal("private")),
      ),
    }),
  ),
});

const CreateDeviceResponseSchema = Schema.Struct({
  device: Schema.Struct({
    name: Schema.String,
  }),
});

const ListIsletsResponseSchema = Schema.Struct({
  device: Schema.String,
  islets: Schema.Array(
    Schema.Struct({
      path: Schema.String,
    }),
  ),
});

const GetSessionResponseSchema = Schema.Union(
  Schema.Null,
  Schema.Struct({
    session: Schema.Unknown,
    user: Schema.Struct({
      id: Schema.String,
      name: Schema.optional(Schema.String),
      username: Schema.optional(Schema.String),
    }),
  }),
);

type DeviceStart = Schema.Schema.Type<typeof DeviceStartSchema>;
type GetSessionResponse = Schema.Schema.Type<typeof GetSessionResponseSchema>;
type PushResponse = Schema.Schema.Type<typeof PushResponseSchema>;
type PullResponse = Schema.Schema.Type<typeof PullResponseSchema>;
type DeviceListResponse = Schema.Schema.Type<typeof DeviceListResponseSchema>;
type CreateDeviceResponse = Schema.Schema.Type<typeof CreateDeviceResponseSchema>;
type ListIsletsResponse = Schema.Schema.Type<typeof ListIsletsResponseSchema>;

export interface DotletApi {
  readonly startDeviceAuthorization: () => Effect.Effect<DeviceStart, CliApiError>;
  readonly pollDeviceToken: (
    deviceCode: string,
  ) => Effect.Effect<
    | { readonly _tag: "Authorized"; readonly accessToken: string }
    | { readonly _tag: "Pending" }
    | { readonly _tag: "SlowDown" }
    | { readonly _tag: "Denied" }
    | { readonly _tag: "Expired" },
    CliApiError
  >;
  readonly pushIslets: (
    body: {
      device: string;
      message?: string;
      files: Array<{ path: string; contentHash: string; size: number }>;
    },
    accessToken: string,
  ) => Effect.Effect<PushResponse, CliApiError>;
  readonly pullIslet: (
    path: string,
    accessToken: string,
  ) => Effect.Effect<PullResponse, CliApiError>;
  readonly listIslets: (
    device: string,
    accessToken: string,
  ) => Effect.Effect<ListIsletsResponse, CliApiError>;
  readonly listDevices: (
    username: string | undefined,
    accessToken: string,
  ) => Effect.Effect<DeviceListResponse, CliApiError>;
  readonly getSession: (accessToken: string) => Effect.Effect<GetSessionResponse, CliApiError>;
  readonly createDevice: (
    name: string,
    visibility: "public" | "private" | undefined,
    accessToken: string,
  ) => Effect.Effect<CreateDeviceResponse, CliApiError>;
  readonly uploadMissingFile: (
    uploadUrl: string,
    content: Buffer,
    size: number,
  ) => Effect.Effect<void, CliUploadError>;
  readonly downloadText: (url: string, path: string) => Effect.Effect<string, CliDownloadError>;
}

export const DotletApi = Context.GenericTag<DotletApi>("@dotlet/DotletApi");

function decodeSchema<A, I>(
  schema: Schema.Schema<A, I, never>,
  input: unknown,
  message: string,
): Effect.Effect<A, CliApiError> {
  return Effect.try({
    try: () => Schema.decodeUnknownSync(schema)(input),
    catch: (cause) =>
      new CliApiError({
        message,
        cause,
      }),
  });
}

function parseJsonSafe(text: string): unknown {
  return text ? (JSON.parse(text) as unknown) : {};
}

function buildUrl(config: CliConfig, path: string) {
  return `${config.apiBaseUrl}${path}`;
}

export const DotletApiLive = Layer.effect(
  DotletApi,
  Effect.gen(function* () {
    const configStore = yield* ConfigStore;

    const requestJson = <A, I>(
      path: string,
      init: RequestInit,
      schema: Schema.Schema<A, I, never>,
      accessToken?: string,
    ): Effect.Effect<A, CliApiError> =>
      configStore.read.pipe(
        Effect.mapError(
          (cause) =>
            new CliApiError({
              message: "Unable to load CLI config",
              cause,
            }),
        ),
        Effect.flatMap((config) =>
          Effect.tryPromise({
            try: async () => {
              const headers = new Headers(init.headers);
              headers.set("content-type", "application/json");
              if (accessToken) {
                headers.set("authorization", `Bearer ${accessToken}`);
              }

              const response = await fetch(buildUrl(config, path), {
                ...init,
                headers,
              });

              if (!response.ok) {
                const body = await response.text();
                throw new CliApiError({
                  message: formatHttpErrorMessage(response.status, body),
                  status: response.status,
                  body,
                });
              }

              return response.json() as Promise<unknown>;
            },
            catch: (cause) =>
              cause instanceof CliApiError
                ? cause
                : new CliApiError({
                    message: "Request failed",
                    cause,
                  }),
          }).pipe(
            Effect.flatMap((json) =>
              decodeSchema(schema, json, "Server returned an invalid response shape"),
            ),
          ),
        ),
      );

    return {
      startDeviceAuthorization: () =>
        requestJson(
          "/api/auth/device/code",
          {
            method: "POST",
            body: JSON.stringify({
              client_id: "dotlet-cli",
              scope: "openid profile email",
            }),
          },
          DeviceStartSchema,
        ),
      pollDeviceToken: (deviceCode) =>
        configStore.read.pipe(
          Effect.mapError(
            (cause) =>
              new CliApiError({
                message: "Unable to load CLI config",
                cause,
              }),
          ),
          Effect.flatMap((config) =>
            Effect.tryPromise({
              try: async () => {
                const response = await fetch(buildUrl(config, "/api/auth/device/token"), {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                    device_code: deviceCode,
                    client_id: "dotlet-cli",
                  }),
                });

                const text = await response.text();
                const json = parseJsonSafe(text) as Record<string, unknown>;

                if (response.ok) {
                  const decoded = await Effect.runPromise(
                    decodeSchema(
                      DeviceTokenSuccessSchema,
                      json,
                      "Device token response was invalid",
                    ),
                  );
                  return {
                    _tag: "Authorized" as const,
                    accessToken: decoded.access_token,
                  };
                }

                const errorCode = typeof json.error === "string" ? json.error : undefined;
                if (errorCode === "authorization_pending") {
                  return { _tag: "Pending" as const };
                }
                if (errorCode === "slow_down") {
                  return { _tag: "SlowDown" as const };
                }
                if (errorCode === "access_denied") {
                  return { _tag: "Denied" as const };
                }
                if (errorCode === "expired_token") {
                  return { _tag: "Expired" as const };
                }

                throw new CliApiError({
                  message: formatHttpErrorMessage(response.status, text, "Token exchange failed"),
                  status: response.status,
                  body: text,
                });
              },
              catch: (cause) =>
                cause instanceof CliApiError
                  ? cause
                  : new CliApiError({
                      message: "Unable to poll device token",
                      cause,
                    }),
            }),
          ),
        ),
      pushIslets: (body, accessToken) =>
        requestJson(
          "/api/islets/push",
          {
            method: "POST",
            body: JSON.stringify(body),
          },
          PushResponseSchema,
          accessToken,
        ),
      pullIslet: (path, accessToken) =>
        requestJson(path, { method: "GET" }, PullResponseSchema, accessToken),
      listIslets: (device, accessToken) =>
        requestJson(
          `/api/islets?device=${encodeURIComponent(device)}`,
          { method: "GET" },
          ListIsletsResponseSchema,
          accessToken,
        ),
      listDevices: (username, accessToken) => {
        const query = username?.trim() ? `?username=${encodeURIComponent(username.trim())}` : "";
        return requestJson(
          `/api/devices${query}`,
          { method: "GET" },
          DeviceListResponseSchema,
          accessToken,
        );
      },
      getSession: (accessToken) =>
        requestJson(
          "/api/auth/get-session",
          { method: "GET" },
          GetSessionResponseSchema,
          accessToken,
        ),
      createDevice: (name, visibility, accessToken) =>
        requestJson(
          "/api/devices",
          {
            method: "POST",
            body: JSON.stringify({ name, visibility }),
          },
          CreateDeviceResponseSchema,
          accessToken,
        ),
      uploadMissingFile: (uploadUrl, content, size) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(uploadUrl, {
              method: "PUT",
              headers: {
                "content-length": String(size),
              },
              body: new Uint8Array(content),
            });
            if (!response.ok) {
              const body = await response.text();
              throw new CliUploadError({
                message: formatHttpErrorMessage(response.status, body, "Upload failed"),
                status: response.status,
                body,
              });
            }
          },
          catch: (cause) =>
            cause instanceof CliUploadError
              ? cause
              : new CliUploadError({
                  message: "Upload failed",
                  cause,
                }),
        }),
      downloadText: (url, path) =>
        Effect.tryPromise({
          try: async () => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new CliDownloadError({
                message: `Failed to download ${path}: ${response.status}`,
                status: response.status,
              });
            }
            return response.text();
          },
          catch: (cause) =>
            cause instanceof CliDownloadError
              ? cause
              : new CliDownloadError({
                  message: `Failed to download ${path}`,
                  cause,
                }),
        }),
    } satisfies DotletApi;
  }),
);
