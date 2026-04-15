import * as Effect from "effect/Effect";
import { describe, expect, it, vi } from "vitest";
import { buildUploadOncePerHash, uploadMissingFiles } from "../index.js";
import type { FileHashEntry } from "../path.js";
import { DotletApi } from "../services/dotlet-api.js";
import { Terminal } from "../services/terminal.js";

function createTerminal() {
  return {
    log: vi.fn(() => Effect.void),
    error: vi.fn(() => Effect.void),
    warn: vi.fn(() => Effect.void),
    success: vi.fn(() => Effect.void),
    info: vi.fn(() => Effect.void),
    muted: vi.fn(() => Effect.void),
    startSpinner: vi.fn(() => Effect.void),
    updateSpinner: vi.fn(() => Effect.void),
    succeedSpinner: vi.fn(() => Effect.void),
    failSpinner: vi.fn(() => Effect.void),
    warnSpinner: vi.fn(() => Effect.void),
    stopSpinner: Effect.void,
    box: vi.fn(() => Effect.void),
  };
}

describe("buildUploadOncePerHash", () => {
  it("dedupes uploads by content hash", () => {
    const sharedEntry: FileHashEntry = {
      content: Buffer.from("same"),
      hash: "hash",
      size: 4,
    };
    const filesMap = new Map<string, FileHashEntry>([
      ["one.txt", sharedEntry],
      ["two.txt", sharedEntry],
    ]);

    const uploads = buildUploadOncePerHash(
      [
        { path: "one.txt", contentHash: "hash", uploadUrl: "https://example.com/1" },
        { path: "two.txt", contentHash: "hash", uploadUrl: "https://example.com/2" },
      ],
      filesMap,
    );

    expect(uploads.size).toBe(1);
    expect(uploads.get("hash")).toMatchObject({
      uploadUrl: "https://example.com/1",
      size: 4,
    });
  });
});

describe("uploadMissingFiles", () => {
  it("sends the content-length header", async () => {
    const uploadMissingFile = vi.fn(() => Effect.void);
    const terminal = createTerminal();

    await Effect.runPromise(
      uploadMissingFiles(
        new Map([
          [
            "hash",
            {
              uploadUrl: "https://example.com/upload",
              content: Buffer.from("hello"),
              size: 5,
            },
          ],
        ]),
      ).pipe(
        Effect.provideService(DotletApi, {
          uploadMissingFile,
        } as never),
        Effect.provideService(Terminal, terminal),
      ),
    );

    expect(uploadMissingFile).toHaveBeenCalledWith(
      "https://example.com/upload",
      Buffer.from("hello"),
      5,
    );
  });

  it("surfaces the storage error response body", async () => {
    const error = new Error("Upload failed (400): bad checksum");
    const terminal = createTerminal();

    await expect(
      Effect.runPromise(
        uploadMissingFiles(
          new Map([
            [
              "hash",
              {
                uploadUrl: "https://example.com/upload",
                content: Buffer.from("hello"),
                size: 5,
              },
            ],
          ]),
        ).pipe(
          Effect.provideService(DotletApi, {
            uploadMissingFile: vi.fn(() => Effect.fail(error)),
          } as never),
          Effect.provideService(Terminal, terminal),
        ),
      ),
    ).rejects.toThrowError("Upload failed (400): bad checksum");
  });
});
