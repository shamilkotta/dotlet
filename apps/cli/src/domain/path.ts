import { createHash } from "node:crypto";
import * as fs from "node:fs/promises";
import { homedir } from "node:os";
import { join, normalize, relative, resolve } from "node:path";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CliPathError } from "../errors.js";

export function normalizePath(inputPath: string): string {
  if (!inputPath || inputPath.trim() === "") {
    throw new Error("Path is required");
  }

  const home = homedir();
  const expanded = inputPath.startsWith("~/")
    ? resolve(home, inputPath.slice(2))
    : resolve(inputPath);

  return normalize(expanded);
}

export function keyPath(inputPath: string, options: { name?: string; absolute?: boolean }) {
  const home = homedir();
  if (options.name?.trim()) {
    const name = options.name.trim();
    return name.startsWith(home) ? name.replace(home, "~") : name;
  }

  if (!options.absolute && inputPath.startsWith(".")) {
    return inputPath;
  }

  const normal = normalizePath(inputPath);
  return normal.startsWith(home) ? normal.replace(home, "~") : normal;
}

export type FileHashEntry = {
  content: Buffer;
  hash: string;
  size: number;
};

export interface PathService {
  readonly normalizePath: (inputPath: string) => Effect.Effect<string, CliPathError>;
  readonly keyPath: (
    inputPath: string,
    options: { name?: string; absolute?: boolean },
  ) => Effect.Effect<string, CliPathError>;
  readonly hashes: (
    inputPath: string,
    key: string,
  ) => Effect.Effect<Map<string, FileHashEntry>, CliPathError>;
}

export const PathService = Context.GenericTag<PathService>("@dotlet/PathService");

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}

function relativeKey(root: string, filePath: string, key: string): string {
  const rel = relative(root, filePath);
  const result = join(key, rel);
  if (key.startsWith("./") && !result.startsWith("./")) {
    return "./" + result;
  }
  return result;
}

async function collectFilesRecursive(
  dir: string,
  out: Map<string, FileHashEntry>,
  { root, key }: { root: string; key: string },
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = normalize(join(dir, entry.name));
    if (entry.isDirectory()) {
      await collectFilesRecursive(fullPath, out, { root, key });
    } else if (entry.isFile()) {
      const buf = await fs.readFile(fullPath);
      const pathKey = relativeKey(root, fullPath, key);
      out.set(pathKey, {
        content: buf,
        hash: createHash("sha256").update(buf).digest("hex"),
        size: buf.length,
      });
    }
  }
}

export async function hashFiles(
  inputPath: string,
  key: string,
): Promise<Map<string, FileHashEntry>> {
  if (!inputPath || inputPath.trim() === "") {
    throw new Error("Path is required");
  }

  let inputStats;
  try {
    inputStats = await fs.stat(inputPath);
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      throw new Error(`Path does not exist: ${inputPath}`);
    }
    throw error;
  }

  const out = new Map<string, FileHashEntry>();

  if (inputStats.isFile()) {
    const buf = await fs.readFile(inputPath);
    const fileKey = relativeKey(inputPath, inputPath, key);
    out.set(fileKey, {
      content: buf,
      hash: createHash("sha256").update(buf).digest("hex"),
      size: buf.length,
    });
    return out;
  }

  if (!inputStats.isDirectory()) {
    throw new Error("Path must be a file or directory");
  }

  await collectFilesRecursive(inputPath, out, { root: inputPath, key });
  if (out.size === 0) {
    throw new Error(`Directory contains no files: ${inputPath}`);
  }
  return out;
}

export const PathServiceLive = Layer.succeed(PathService, {
  normalizePath: (inputPath) =>
    Effect.try({
      try: () => normalizePath(inputPath),
      catch: (cause) =>
        new CliPathError({
          message: cause instanceof Error ? cause.message : "Invalid path",
          cause,
        }),
    }),
  keyPath: (inputPath, options) =>
    Effect.try({
      try: () => keyPath(inputPath, options),
      catch: (cause) =>
        new CliPathError({
          message: cause instanceof Error ? cause.message : "Invalid path",
          cause,
        }),
    }),
  hashes: (inputPath, key) =>
    Effect.tryPromise({
      try: () => hashFiles(inputPath, key),
      catch: (cause) =>
        new CliPathError({
          message: cause instanceof Error ? cause.message : "Unable to hash files",
          cause,
        }),
    }),
});
