import { main } from "./main.js";

export { CONFIG_PATH, DEFAULT_CONFIG, decodeCliConfig } from "./config.js";
export {
  buildPullApiPath,
  parsePullTarget,
  resolvePullOutputPath,
  resolvePullTarget,
  writePulledFiles,
} from "./domain/pull.js";
export { buildUploadOncePerHash, uploadMissingFiles } from "./domain/push.js";
export { type FileHashEntry, hashFiles as hashes, keyPath, normalizePath } from "./domain/path.js";
export { main };

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === new URL(`file://${entrypoint}`).href) {
  main();
}
