import { formatSinceSyncAbbrev } from "@/lib/format-relative-time";

export function formatOgTimeAgo(date: Date | string | null | undefined): string {
  const abbrev = formatSinceSyncAbbrev(date);
  if (abbrev === "—") {
    return abbrev;
  }

  return `${abbrev} ago`;
}
