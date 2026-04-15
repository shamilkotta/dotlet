import { describe, expect, it } from "vitest";
import { decideRateLimit } from "./rate-limit";

describe("decideRateLimit", () => {
  it("allows a fresh key", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(decideRateLimit(null, 2, 10_000, now)).toMatchObject({
      allowed: true,
      count: 1,
    });
  });

  it("allows until max then blocks", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(
      decideRateLimit({ count: 1, resetAt: new Date("2026-01-01T00:00:10.000Z") }, 2, 10_000, now),
    ).toMatchObject({
      allowed: true,
      count: 2,
    });
    expect(
      decideRateLimit({ count: 2, resetAt: new Date("2026-01-01T00:00:10.000Z") }, 2, 10_000, now),
    ).toMatchObject({
      allowed: false,
      count: 2,
    });
  });

  it("resets after the window expires", () => {
    const now = new Date("2026-01-01T00:00:10.000Z");
    expect(
      decideRateLimit({ count: 9, resetAt: new Date("2026-01-01T00:00:09.000Z") }, 2, 10_000, now),
    ).toMatchObject({
      allowed: true,
      count: 1,
    });
  });
});
