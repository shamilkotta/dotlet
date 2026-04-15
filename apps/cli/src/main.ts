import * as Command from "@effect/cli/Command";
import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as Layer from "effect/Layer";
import { rootCommand } from "./cli.js";
import * as Effect from "effect/Effect";
import { PathServiceLive } from "./domain/path.js";
import { BrowserLive } from "./services/browser.js";
import { ConfigStoreLive } from "./services/config-store.js";
import { DotletApiLive } from "./services/dotlet-api.js";
import { FileServiceLive } from "./services/file-service.js";
import { Terminal, TerminalLive } from "./services/terminal.js";
import { formatCliError } from "./programs.js";

const appLayer = Layer.mergeAll(
  NodeContext.layer,
  ConfigStoreLive,
  BrowserLive,
  DotletApiLive.pipe(Layer.provide(ConfigStoreLive)),
  FileServiceLive,
  PathServiceLive,
  TerminalLive,
);

export function main(argv = process.argv): void {
  const program = Command.run(rootCommand, {
    name: "dotlet",
    version: "0.1.0",
    executable: "dotlet",
  })(argv).pipe(
    Effect.tap(() =>
      Effect.gen(function* () {
        const terminal = yield* Terminal;
        yield* terminal.log();
      }),
    ),
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const terminal = yield* Terminal;
        yield* terminal.error(formatCliError(error));
        yield* terminal.log();
        process.exitCode = 1;
      }),
    ),
    Effect.provide(appLayer),
  );

  NodeRuntime.runMain(program);
}
