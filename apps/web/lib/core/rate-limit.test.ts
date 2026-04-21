import { describe, expect, it } from "vitest";
import { decideRateLimit } from "./rate-limit";

describe("decideRateLimit", () => {
  it("allows a fresh key", () => {
    const nowMs = new Date("2026-01-01T00:00:00.000Z").getTime();
    expect(decideRateLimit(null, 2, 10_000, nowMs)).toMatchObject({
      allowed: true,
      count: 1,
      lastRequest: nowMs,
    });
  });

  it("allows until max then blocks", () => {
    const nowMs = new Date("2026-01-01T00:00:00.000Z").getTime();
    expect(decideRateLimit({ count: 1, lastRequest: nowMs }, 2, 10_000, nowMs)).toMatchObject({
      allowed: true,
      count: 2,
      lastRequest: nowMs,
    });
    expect(decideRateLimit({ count: 2, lastRequest: nowMs }, 2, 10_000, nowMs)).toMatchObject({
      allowed: false,
      count: 2,
      lastRequest: nowMs,
    });
  });

  it("resets after the window expires", () => {
    const nowMs = new Date("2026-01-01T00:00:10.000Z").getTime();
    const lastMs = new Date("2025-12-31T23:59:59.000Z").getTime();
    expect(decideRateLimit({ count: 9, lastRequest: lastMs }, 2, 10_000, nowMs)).toMatchObject({
      allowed: true,
      count: 1,
      lastRequest: nowMs,
    });
  });
});
