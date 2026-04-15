import { describe, expect, it } from "vitest";
import { normalizePath } from "../path.js";

describe("normalizePath", () => {
  it("normalizes a home path", () => {
    expect(normalizePath("~/.zshrc")).toBe("/Users/shamilkotta/.zshrc");
  });

  it("normalizes traversal segments to an absolute path", () => {
    expect(normalizePath("~/../../etc/passwd")).toBe("/etc/passwd");
  });
});
