import { Skeleton } from "@workspace/ui/components/skeleton";
import { formatSinceSyncAbbrev } from "@/lib/format-relative-time";

export async function DeviceInfo({
  commitCount,
  fileCount,
}: {
  commitCount: number;
  fileCount: number;
}) {
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

export async function DeviceLastActivity({ lastActivity }: { lastActivity: Date | string | null }) {
  return (
    <p className="mt-0.5 text-xs leading-snug text-[#57606a] dark:text-[#919191]">
      {lastActivity ? `Last synced ${formatSinceSyncAbbrev(lastActivity)} ago` : "Never synced"}
    </p>
  );
}

export function DeviceLastActivitySkeleton() {
  return <Skeleton className="mt-0.5 h-3 w-24 rounded-sm" />;
}
