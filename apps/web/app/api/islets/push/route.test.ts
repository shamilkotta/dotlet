import { describe, expect, it, vi } from "vitest";
import type { ObjectStorageProvider } from "@/lib/storage/types";
import { resolveMissingFileUploads, sha256HexToBase64 } from "./integrity";

function createStorage(overrides?: Partial<ObjectStorageProvider>): ObjectStorageProvider {
  return {
    upload: vi.fn(async () => {}),
    get: vi.fn(async () => Buffer.alloc(0)),
    exists: vi.fn(async () => false),
    presignGetUrl: vi.fn(async () => "https://example.com/download"),
    presignPutUrl: vi.fn(async () => "https://example.com/upload"),
    ...overrides,
  };
}

describe("sha256HexToBase64", () => {
  it("converts a sha256 hex digest to base64", () => {
    const hex = "00".repeat(32);
    expect(sha256HexToBase64(hex)).toBe("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  });
});

describe("resolveMissingFileUploads", () => {
  it("passes checksum and content length to presignPutUrl", async () => {
    const contentHash = "ab".repeat(32);
    const storage = createStorage();

    const missingFiles = await resolveMissingFileUploads(
      [{ path: "a.txt", contentHash, size: 12 }],
      storage,
    );

    expect(missingFiles).toEqual([
      {
        path: "a.txt",
        contentHash,
        uploadUrl: "https://example.com/upload",
      },
    ]);
    expect(storage.presignPutUrl).toHaveBeenCalledWith(contentHash, {
      contentLength: 12,
      checksumSha256Base64: sha256HexToBase64(contentHash),
    });
  });

  it("skips presigning when the existing object matches hash and size", async () => {
    const body = Buffer.from("valid");
    const contentHash = "ec654fac9599f62e79e2706abef23dfb7c07c08185aa86db4d8695f0b718d1b3";
    const storage = createStorage({
      exists: vi.fn(async () => true),
      get: vi.fn(async () => body),
    });

    const missingFiles = await resolveMissingFileUploads(
      [{ path: "a.txt", contentHash, size: body.length }],
      storage,
    );

    expect(missingFiles).toEqual([]);
    expect(storage.presignPutUrl).not.toHaveBeenCalled();
  });

  it("presigns a replacement when an existing object is corrupt", async () => {
    const contentHash = "ab".repeat(32);
    const storage = createStorage({
      exists: vi.fn(async () => true),
      get: vi.fn(async () => Buffer.from("wrong")),
    });

    const missingFiles = await resolveMissingFileUploads(
      [{ path: "a.txt", contentHash, size: 5 }],
      storage,
    );

    expect(missingFiles).toHaveLength(1);
    expect(storage.presignPutUrl).toHaveBeenCalledOnce();
  });
});
