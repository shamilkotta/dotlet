import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSignedUrlMock } = vi.hoisted(() => ({
  getSignedUrlMock: vi.fn(async () => "https://example.com/upload"),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: getSignedUrlMock,
}));

import { S3Provider } from "./s3-provider";

describe("S3Provider.presignPutUrl", () => {
  beforeEach(() => {
    getSignedUrlMock.mockClear();
  });

  it("builds a PutObjectCommand with signed checksum and content length", async () => {
    const client = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
    const provider = new S3Provider(client, "bucket");

    const result = await provider.presignPutUrl("key", {
      contentLength: 123,
      checksumSha256Base64: "checksum",
    });

    expect(result).toBe("https://example.com/upload");
    expect(getSignedUrlMock).toHaveBeenCalledOnce();
    const firstCall = getSignedUrlMock.mock.calls[0] as unknown[] | undefined;
    expect(firstCall).toBeDefined();
    const command = firstCall?.[1];
    const options = firstCall?.[2];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as unknown as PutObjectCommand).input).toMatchObject({
      Bucket: "bucket",
      Key: "key",
      ContentLength: 123,
      ChecksumSHA256: "checksum",
    });
    expect(options).toEqual({ expiresIn: 900 });
  });
});

describe("S3Provider.presignGetUrl", () => {
  beforeEach(() => {
    getSignedUrlMock.mockClear();
  });

  it("builds a GetObjectCommand for download URLs", async () => {
    const client = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
    const provider = new S3Provider(client, "bucket");

    const result = await provider.presignGetUrl("key");

    expect(result).toBe("https://example.com/upload");
    expect(getSignedUrlMock).toHaveBeenCalledOnce();
    const firstCall = getSignedUrlMock.mock.calls[0] as unknown[] | undefined;
    expect(firstCall).toBeDefined();
    const command = firstCall?.[1];
    const options = firstCall?.[2];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect((command as unknown as GetObjectCommand).input).toMatchObject({
      Bucket: "bucket",
      Key: "key",
    });
    expect(options).toEqual({ expiresIn: 900 });
  });

  it("includes ResponseContentDisposition when provided", async () => {
    const client = new S3Client({
      region: "us-east-1",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
    const provider = new S3Provider(client, "bucket");

    await provider.presignGetUrl("key", {
      responseContentDisposition: 'attachment; filename="a.txt"',
    });

    expect(getSignedUrlMock).toHaveBeenCalledOnce();
    const firstCall = getSignedUrlMock.mock.calls[0] as unknown[] | undefined;
    const command = firstCall?.[1] as GetObjectCommand;
    expect(command.input).toMatchObject({
      Bucket: "bucket",
      Key: "key",
      ResponseContentDisposition: 'attachment; filename="a.txt"',
    });
  });
});
