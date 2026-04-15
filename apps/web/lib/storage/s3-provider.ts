import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ObjectStorageProvider } from "./types";

export class S3Provider implements ObjectStorageProvider {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  async upload(key: string, body: Buffer): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    const chunks: Buffer[] = [];
    const stream = response.Body?.transformToWebStream();
    if (!stream) {
      throw new Error("Object body stream unavailable");
    }
    const reader = stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks);
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async presignGetUrl(
    key: string,
    options?: {
      expiresInSeconds?: number;
      responseContentDisposition?: string;
    },
  ): Promise<string> {
    const expiresIn = options?.expiresInSeconds ?? 900;
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(options?.responseContentDisposition
        ? { ResponseContentDisposition: options.responseContentDisposition }
        : {}),
    });
    return getSignedUrl(this.client as never, command as never, { expiresIn });
  }

  async presignPutUrl(
    key: string,
    options: {
      contentLength: number;
      checksumSha256Base64: string;
      expiresInSeconds?: number;
    },
  ): Promise<string> {
    const expiresIn = options.expiresInSeconds ?? 900;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentLength: options.contentLength,
      ChecksumSHA256: options.checksumSha256Base64,
    });
    // getSignedUrl types can disagree with S3Client/PutObjectCommand when duplicate @smithy/types versions exist.
    return getSignedUrl(this.client as never, command as never, { expiresIn });
  }
}
