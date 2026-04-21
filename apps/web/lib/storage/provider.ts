import { S3Client } from "@aws-sdk/client-s3";
import { R2Provider } from "./r2-provider";
import { S3Provider } from "./s3-provider";
import type { ObjectStorageProvider } from "./types";

let cachedProvider: ObjectStorageProvider | null = null;

export function getStorageProvider(): ObjectStorageProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const provider = process.env.STORAGE_PROVIDER ?? "s3";
  if (provider === "r2") {
    const accountId = process.env.CF_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error("Missing R2 configuration");
    }
    cachedProvider = new R2Provider({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
    });
    return cachedProvider;
  }

  const bucket = process.env.S3_BUCKET;
  const region = process.env.S3_REGION;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing S3 configuration");
  }
  cachedProvider = new S3Provider(
    new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    }),
    bucket,
  );
  return cachedProvider;
}
