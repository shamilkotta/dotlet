import * as Effect from "effect/Effect";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, decodeCliConfig } from "../config.js";

describe("decodeCliConfig", () => {
  it("fills defaults for missing values", async () => {
    await expect(Effect.runPromise(decodeCliConfig({}))).resolves.toEqual(DEFAULT_CONFIG);
  });

  it("rejects invalid config shapes", async () => {
    await expect(
      Effect.runPromise(
        decodeCliConfig({
          apiBaseUrl: "not-a-url",
        }),
      ),
    ).rejects.toThrowError("Invalid CLI config");
  });
});
