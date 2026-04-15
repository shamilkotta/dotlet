function normalizeSeparators(input: string): string {
  return input.replaceAll("\\", "/");
}

export function pathSegments(input: string): string[] {
  return normalizeSeparators(input)
    .split("/")
    .filter((segment) => segment.length > 0);
}

export function stripLeadingSlashes(path: string) {
  return path.replace(/^\/+/, "");
}

export function splitDirAndFile(isletPath: string): {
  directory: string | null;
  fileName: string;
} {
  const normalized = stripLeadingSlashes(isletPath);
  const lastSlashIndex = normalized.lastIndexOf("/");
  if (lastSlashIndex === -1) {
    return { directory: null, fileName: normalized };
  }
  const directory = normalized.slice(0, lastSlashIndex);
  return {
    directory: directory || null,
    fileName: normalized.slice(lastSlashIndex + 1),
  };
}
