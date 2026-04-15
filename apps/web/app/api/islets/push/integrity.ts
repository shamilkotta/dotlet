import type { ObjectStorageProvider } from "@/lib/storage/types";

const HASH_HEX_LENGTH = 64;

type ChangedFile = {
  path: string;
  contentHash: string;
  size: number;
};

type MissingFileUpload = {
  path: string;
  contentHash: string;
  uploadUrl: string;
};

export function sha256HexToBase64(contentHash: string): string {
  if (contentHash.length !== HASH_HEX_LENGTH) {
    throw new Error("Invalid content hash length");
  }
  return Buffer.from(contentHash, "hex").toString("base64");
}

export async function resolveMissingFileUploads(
  changed: ChangedFile[],
  storage: ObjectStorageProvider,
): Promise<MissingFileUpload[]> {
  const missingFiles: MissingFileUpload[] = [];
  const presignCache = new Map<string, string>();

  for (const c of changed) {
    const existsInStorage = await storage.exists(c.contentHash);
    if (existsInStorage) {
      continue;
    }

    if (!presignCache.has(c.contentHash)) {
      presignCache.set(
        c.contentHash,
        await storage.presignPutUrl(c.contentHash, {
          contentLength: c.size,
          checksumSha256Base64: sha256HexToBase64(c.contentHash),
        }),
      );
    }
    missingFiles.push({
      path: c.path,
      contentHash: c.contentHash,
      uploadUrl: presignCache.get(c.contentHash)!,
    });
  }

  return missingFiles;
}
