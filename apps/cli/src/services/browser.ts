import open from "open";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CliBrowserError } from "../errors.js";

export interface Browser {
  readonly openUrl: (url: string) => Effect.Effect<void, CliBrowserError>;
}

export const Browser = Context.GenericTag<Browser>("@dotlet/Browser");

export const BrowserLive = Layer.succeed(Browser, {
  openUrl: (url) =>
    Effect.tryPromise({
      try: async () => {
        await open(url);
      },
      catch: (cause) =>
        new CliBrowserError({
          message: "Could not open browser automatically. Open the URL manually.",
          cause,
        }),
    }),
});
