import { count, max, eq, and } from "drizzle-orm";

import { Skeleton } from "@workspace/ui/components/skeleton";
import { db } from "@/lib/db/client";
import { islets, isletRevisions } from "@/lib/db/schema";
import { formatSinceSyncAbbrev } from "@/lib/format-relative-time";

function deviceVisibilityWhere(canViewPrivate: boolean) {
  return canViewPrivate ? [] : [eq(islets.visibility, "public")];
}
export async function DeviceInfo({
  target,
  canViewPrivate,
}: {
  target: {
    userId: string;
    username: string | null;
    userImage: string | null;
    deviceId: string;
    deviceName: string;
  };
  canViewPrivate: boolean;
}) {
  const baseIsletFilter = and(
    eq(islets.deviceId, target.deviceId),
    ...deviceVisibilityWhere(canViewPrivate),
  );

  const [[commitCountRow], [fileCountRow]] = await Promise.all([
    db
      .select({ c: count(isletRevisions.id) })
      .from(isletRevisions)
      .innerJoin(islets, eq(isletRevisions.isletId, islets.id))
      .where(baseIsletFilter),
    db
      .select({ c: count(islets.id) })
      .from(islets)
      .where(baseIsletFilter),
  ]);

  const fileCount = Number(fileCountRow?.c ?? 0);
  const commitCount = Number(commitCountRow?.c ?? 0);

  return (
    <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-[#57606a] dark:text-[#919191]">
      <div className="flex flex-col">
        <span className="font-bold text-[#1f2328] dark:text-[#e2e2e2]">{commitCount}</span>
        <span>Commits</span>
      </div>
      <div className="h-6 w-px bg-[#e1e4e8] dark:bg-[#2a2a2a]" />
      <div className="flex flex-col">
        <span className="font-bold text-[#1f2328] dark:text-[#e2e2e2]">{fileCount}</span>
        <span>Islets</span>
      </div>
      {/* <div className="h-6 w-px bg-[#e1e4e8] dark:bg-[#2a2a2a]" />
      <div className="flex flex-col">
        <span className="font-bold text-[#1f2328] dark:text-[#e2e2e2] lowercase">
          {formatSinceSyncAbbrev(lastActivity)}
        </span>
        <span>Since Sync</span>
      </div> */}
    </div>
  );
}

export function DeviceInfoSkeleton() {
  return (
    <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-widest text-[#57606a] dark:text-[#919191]">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-7 rounded-sm" />
        <Skeleton className="h-3 w-14 rounded-sm" />
      </div>
      <div className="h-6 w-px bg-[#e1e4e8] dark:bg-[#2a2a2a]" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-7 rounded-sm" />
        <Skeleton className="h-3 w-9 rounded-sm" />
      </div>
      {/* <div className="h-6 w-px bg-[#e1e4e8] dark:bg-[#2a2a2a]" />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <Skeleton className="h-3 w-18 rounded-sm" />
      </div> */}
    </div>
  );
}

export async function DeviceLastActivity({
  target,
  canViewPrivate,
}: {
  target: {
    deviceId: string;
  };
  canViewPrivate: boolean;
}) {
  const baseIsletFilter = and(
    eq(islets.deviceId, target.deviceId),
    ...deviceVisibilityWhere(canViewPrivate),
  );

  const [lastActivityRow] = await db
    .select({ last: max(islets.updatedAt) })
    .from(islets)
    .where(baseIsletFilter);

  const lastActivity = lastActivityRow?.last ?? null;

  return (
    <p className="mt-0.5 text-xs leading-snug text-[#57606a] dark:text-[#919191]">
      {lastActivity ? `Last synced ${formatSinceSyncAbbrev(lastActivity)} ago` : "Never synced"}
    </p>
  );
}

export function DeviceLastActivitySkeleton() {
  return <Skeleton className="mt-0.5 h-3 w-24 rounded-sm" />;
}
