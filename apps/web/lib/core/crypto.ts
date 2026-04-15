import crypto from "node:crypto";

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function shortRevisionId(id: string): string {
  if (id.length <= 7) return id;
  return id.slice(0, 7);
}
