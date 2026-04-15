import { describe, expect, it } from "vitest";
import { generateRevisionId } from "./revision";

describe("generateRevisionId", () => {
  it("is deterministic for same input", () => {
    const input = {
      isletId: "islet-a",
      parentRevisionId: "rev-parent",
      contentHash: "abc123",
      timestamp: 123456,
    };
    expect(generateRevisionId(input)).toBe(generateRevisionId(input));
  });

  it("changes when parent revision changes", () => {
    const base = {
      isletId: "islet-a",
      contentHash: "abc123",
      timestamp: 123456,
    };
    const first = generateRevisionId({ ...base, parentRevisionId: "one" });
    const second = generateRevisionId({ ...base, parentRevisionId: "two" });
    expect(first).not.toBe(second);
  });
});
