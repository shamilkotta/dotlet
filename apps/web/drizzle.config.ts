import type { Config } from "drizzle-kit";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const maybeLoadEnvFile = (process as NodeJS.Process & { loadEnvFile?: (path?: string) => void })
  .loadEnvFile;

if (typeof maybeLoadEnvFile === "function") {
  const cwd = process.cwd();
  const localEnvPath = resolve(cwd, ".env.local");
  const envPath = resolve(cwd, ".env");

  if (existsSync(localEnvPath)) {
    maybeLoadEnvFile(localEnvPath);
  }
  if (existsSync(envPath)) {
    maybeLoadEnvFile(envPath);
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
