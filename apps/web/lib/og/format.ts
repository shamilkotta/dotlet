import { formatSinceSyncAbbrev } from "@/lib/format-relative-time";

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatOgTimeAgo(date: Date | string | null | undefined): string {
  const normalized = toDate(date);
  if (!normalized) {
    return "—";
  }

  const abbrev = formatSinceSyncAbbrev(normalized);
  if (abbrev === "—") {
    return abbrev;
  }

  return `${abbrev} ago`;
}
