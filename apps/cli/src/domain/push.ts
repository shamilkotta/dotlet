import * as Effect from "effect/Effect";
import { CliUploadError } from "../errors.js";
import { DotletApi } from "../services/dotlet-api.js";
import { Terminal } from "../services/terminal.js";
import type { FileHashEntry } from "./path.js";

export function buildUploadOncePerHash(
  missingFiles: Array<{ path: string; contentHash: string; uploadUrl: string }>,
  filesMap: Map<string, FileHashEntry>,
): Map<string, { uploadUrl: string; content: Buffer; size: number }> {
  const uploadOncePerHash = new Map<string, { uploadUrl: string; content: Buffer; size: number }>();
  for (const missingFile of missingFiles) {
    if (!uploadOncePerHash.has(missingFile.contentHash)) {
      const entry = filesMap.get(missingFile.path);
      if (!entry?.content) {
        throw new Error(`Missing local file for path: ${missingFile.path}`);
      }
      uploadOncePerHash.set(missingFile.contentHash, {
        uploadUrl: missingFile.uploadUrl,
        content: entry.content,
        size: entry.size,
      });
    }
  }
  return uploadOncePerHash;
}

export function uploadMissingFiles(
  uploads: Map<string, { uploadUrl: string; content: Buffer; size: number }>,
): Effect.Effect<void, CliUploadError, DotletApi | Terminal> {
  return Effect.gen(function* () {
    const api = yield* DotletApi;
    const terminal = yield* Terminal;
    const list = [...uploads.values()];
    const total = list.length;

    yield* terminal.startSpinner(`Uploading files... (0/${total})`);

    let index = 0;
    for (const upload of list) {
      index += 1;
      yield* terminal.updateSpinner(`Uploading files... (${index}/${total})`);
      yield* api.uploadMissingFile(upload.uploadUrl, upload.content, upload.size);
    }

    yield* terminal.succeedSpinner(`Uploaded ${total} file${total === 1 ? "" : "s"}`);
  });
}
