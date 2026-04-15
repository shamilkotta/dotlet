import { describe, expect, it } from "vitest";
import { formatHttpErrorMessage } from "../format-http-error.js";

describe("formatHttpErrorMessage", () => {
  it("parses double-encoded JSON validation errors into a short hint", () => {
    const body = JSON.stringify({
      error: JSON.stringify([
        {
          origin: "string",
          code: "invalid_format",
          message: "Invalid string: must match pattern /^[a-zA-Z0-9_-]+$/",
          path: ["name"],
        },
        {
          code: "custom",
          path: ["name"],
          message: "Invalid device name",
        },
      ]),
    });
    expect(formatHttpErrorMessage(400, body)).toBe(
      "Use only letters, numbers, underscores, and hyphens.",
    );
  });

  it("returns a plain error string from JSON", () => {
    expect(formatHttpErrorMessage(404, JSON.stringify({ error: "Device not found" }))).toBe(
      "Device not found",
    );
  });

  it("uses friendly defaults when the body is empty", () => {
    expect(formatHttpErrorMessage(401, "")).toBe("Unauthorized. Run `dotlet login` to sign in.");
    expect(formatHttpErrorMessage(500, "   ")).toBe("Server error. Try again later.");
  });

  it("passes through non-JSON bodies as a single line", () => {
    expect(formatHttpErrorMessage(400, "something went wrong")).toBe("something went wrong");
  });

  it("uses a custom empty label for uploads", () => {
    expect(formatHttpErrorMessage(400, "", "Upload failed")).toBe("Upload failed (HTTP 400).");
  });
});
