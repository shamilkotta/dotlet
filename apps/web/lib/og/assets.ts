import { readFile } from "node:fs/promises";
import { join } from "node:path";

let logoDataUriPromise: Promise<string> | null = null;

export function getLogoDataUri(): Promise<string> {
  if (!logoDataUriPromise) {
    logoDataUriPromise = readFile(join(process.cwd(), "public/logo-white.svg")).then(
      (buffer) => `data:image/svg+xml;base64,${buffer.toString("base64")}`,
    );
  }
  return logoDataUriPromise;
}
