export interface ObjectStorageProvider {
  upload(key: string, body: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  presignGetUrl(
    key: string,
    options?: { expiresInSeconds?: number; responseContentDisposition?: string },
  ): Promise<string>;
  presignPutUrl(
    key: string,
    options: {
      contentLength: number;
      checksumSha256Base64: string;
      expiresInSeconds?: number;
    },
  ): Promise<string>;
}
