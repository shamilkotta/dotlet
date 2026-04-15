import { dirname } from "node:path";
import * as fs from "node:fs/promises";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CliPathError } from "../errors.js";

export interface FileService {
  readonly readUtf8: (path: string) => Effect.Effect<string, CliPathError>;
  readonly writeUtf8: (path: string, content: string) => Effect.Effect<void, CliPathError>;
  readonly mkdirp: (path: string) => Effect.Effect<void, CliPathError>;
  readonly exists: (path: string) => Effect.Effect<boolean>;
}

export const FileService = Context.GenericTag<FileService>("@dotlet/FileService");

export const FileServiceLive = Layer.succeed(FileService, {
  readUtf8: (path) =>
    Effect.tryPromise({
      try: () => fs.readFile(path, "utf8"),
      catch: (cause) =>
        new CliPathError({
          message: `Unable to read ${path}`,
          cause,
        }),
    }),
  writeUtf8: (path, content) =>
    Effect.tryPromise({
      try: () => fs.writeFile(path, content, "utf8"),
      catch: (cause) =>
        new CliPathError({
          message: `Unable to write ${path}`,
          cause,
        }),
    }),
  mkdirp: (path) =>
    Effect.tryPromise({
      try: () => fs.mkdir(path, { recursive: true }),
      catch: (cause) =>
        new CliPathError({
          message: `Unable to create directory ${path}`,
          cause,
        }),
    }),
  exists: (path) =>
    Effect.promise(() =>
      fs
        .access(path)
        .then(() => true)
        .catch(() => false),
    ),
});

export function ensureParentDir(path: string): Effect.Effect<void, CliPathError, FileService> {
  return Effect.gen(function* () {
    const fileService = yield* FileService;
    yield* fileService.mkdirp(dirname(path));
  });
}

export function readIfExists(
  path: string,
): Effect.Effect<string | null, CliPathError, FileService> {
  return Effect.gen(function* () {
    const fileService = yield* FileService;
    const exists = yield* fileService.exists(path);
    if (!exists) {
      return null;
    }
    return yield* fileService.readUtf8(path);
  });
}
