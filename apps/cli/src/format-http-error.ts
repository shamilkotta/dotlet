const USERNAME_LIKE_HINT = "Use only letters, numbers, underscores, and hyphens.";

function uniquePreserveOrder(messages: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    if (!seen.has(m)) {
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

function humanizeValidationLine(message: string): string {
  const m = message.trim();
  if (m.includes("must match pattern") && (m.includes("a-zA-Z0-9") || m.includes("A-Za-z0-9"))) {
    return USERNAME_LIKE_HINT;
  }
  return m;
}

function dedupeValidationMessages(messages: string[]): string[] {
  const humanized = messages.map(humanizeValidationLine);
  const hasCharHint = humanized.some((line) => line === USERNAME_LIKE_HINT);
  const filtered = hasCharHint
    ? humanized.filter((line) => line !== "Invalid device name")
    : humanized;
  return uniquePreserveOrder(filtered);
}

function collectMessagesFromUnknown(value: unknown, into: string[]): void {
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) {
      return;
    }
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
      try {
        collectMessagesFromUnknown(JSON.parse(s) as unknown, into);
        return;
      } catch {
        into.push(s);
        return;
      }
    }
    into.push(s);
    return;
  }

  if (!Array.isArray(value)) {
    return;
  }

  for (const item of value) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) {
        into.push(s);
      }
      continue;
    }
    if (item && typeof item === "object" && "message" in item) {
      const m = (item as { message?: unknown }).message;
      if (typeof m === "string" && m.trim()) {
        into.push(m.trim());
      }
    }
  }
}

function extractErrorMessagesFromJsonBody(body: string): string[] | undefined {
  const trimmed = body.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || !("error" in parsed)) {
      return undefined;
    }
    const raw = (parsed as { error: unknown }).error;
    const messages: string[] = [];
    collectMessagesFromUnknown(raw, messages);
    return messages.length > 0 ? dedupeValidationMessages(messages) : undefined;
  } catch {
    return undefined;
  }
}

function defaultMessageForStatus(status: number, whenEmpty: string): string {
  switch (status) {
    case 401:
      return "Unauthorized. Run `dotlet login` to sign in.";
    case 403:
      return "Forbidden.";
    case 404:
      return "Not found.";
    case 409:
      return "Conflict.";
    case 429:
      return "Too many requests. Try again later.";
    case 500:
    case 502:
    case 503:
      return "Server error. Try again later.";
    default:
      return `${whenEmpty} (HTTP ${status}).`;
  }
}

/**
 * Turn an HTTP error body into a short, user-facing message for the CLI.
 */
export function formatHttpErrorMessage(
  status: number,
  body: string,
  whenEmpty = "Request failed",
): string {
  const trimmed = body.trim();
  const fromJson = trimmed ? extractErrorMessagesFromJsonBody(trimmed) : undefined;
  if (fromJson && fromJson.length > 0) {
    return fromJson.join("\n");
  }
  if (trimmed) {
    const singleLine = trimmed.replace(/\s+/g, " ");
    return singleLine.length > 400 ? `${singleLine.slice(0, 400)}...` : singleLine;
  }
  return defaultMessageForStatus(status, whenEmpty);
}
