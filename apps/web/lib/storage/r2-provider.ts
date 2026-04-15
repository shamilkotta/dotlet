import { S3Client } from "@aws-sdk/client-s3";
import { S3Provider } from "./s3-provider";

export class R2Provider extends S3Provider {
  constructor(config: {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    super(client, config.bucket);
  }
}
