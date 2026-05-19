import { describe, expect, it } from "vitest";

import { buildUsernameCandidates } from "./github-username";
import { normalizeUsername } from "@/lib/core/username";

describe("normalizeGithubLogin", () => {
  it("lowercases and keeps valid github logins", () => {
    expect(normalizeUsername("ShamilKotta")).toBe("shamilkotta");
  });

  it("preserves full-length github logins", () => {
    expect(normalizeUsername("verylonggithubusernamethirtynine")).toBe(
      "verylonggithubusernamethirtynine",
    );
  });

  it("strips invalid characters without truncating", () => {
    expect(normalizeUsername("user.name@org")).toBe("usernameorg");
  });

  it("allows single-character logins", () => {
    expect(normalizeUsername("a")).toBe("a");
  });
});

describe("buildUsernameCandidates", () => {
  it("starts with the normalized github login", () => {
    const candidates = buildUsernameCandidates("Alice", "alice@example.com");
    expect(candidates[0]).toBe("alice");
  });

  it("includes login plus email local part when they differ", () => {
    const candidates = buildUsernameCandidates("alice", "bob@gmail.com");
    expect(candidates).toContain("alice");
    expect(candidates).toContain("alice-bob");
  });

  it("skips duplicate email-local suffix when same as login", () => {
    const candidates = buildUsernameCandidates("alice", "alice@example.com");
    expect(candidates.filter((c) => c === "alice")).toHaveLength(1);
    expect(candidates.some((c) => c.startsWith("alice-"))).toBe(true);
  });

  it("adds two random suffix candidates", () => {
    const candidates = buildUsernameCandidates("taken", "taken@example.com");
    const randomCandidates = candidates.filter((c) => /^taken-[0-9a-f]{8}$/.test(c));
    expect(randomCandidates).toHaveLength(2);
    expect(randomCandidates[0]).not.toBe(randomCandidates[1]);
  });
});
