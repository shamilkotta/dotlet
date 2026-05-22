import { formatSinceSyncAbbrev } from "@/lib/format-relative-time";

export function formatOgTimeAgo(date: Date | null | undefined): string {
  if (!date) {
    return "—";
  }

  const abbrev = formatSinceSyncAbbrev(date);
  if (abbrev === "—") {
    return abbrev;
  }

  return `${abbrev} ago`;
}
