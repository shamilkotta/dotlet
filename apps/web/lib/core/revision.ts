import { sha256 } from "./crypto";

export function generateRevisionId(input: {
  isletId: string;
  parentRevisionId: string | null;
  contentHash: string;
  timestamp: number;
}) {
  return sha256(
    `${input.isletId}:${input.parentRevisionId ?? ""}:${input.contentHash}:${input.timestamp}`,
  );
}
