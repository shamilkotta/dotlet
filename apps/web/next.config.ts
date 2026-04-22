import { readFileSync } from "node:fs";
import { join } from "node:path";

const cliVersion = JSON.parse(readFileSync(join(process.cwd(), "../cli/package.json"), "utf8"))
  .version as string;

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  env: {
    NEXT_PUBLIC_DOTLET_CLI_VERSION: cliVersion,
  },
};

export default nextConfig;
