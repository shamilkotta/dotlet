import { IsletsTree } from "@/components/device/islets-tree";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

export type IsletRecord = {
  path: string;
  message: string | null;
  updatedAt: Date;
  revisionId: string | null;
  visibility: "public" | "private";
};

export function IsletsList({
  target,
  records,
}: {
  target: {
    userId: string;
    username: string | null;
    userImage: string | null;
    deviceId: string;
    deviceName: string;
  };
  records: IsletRecord[];
}) {
  return (
    <IsletsTree records={records} username={target.username ?? ""} deviceName={target.deviceName} />
  );
}

function IsletRowSkeleton({ grouped }: { grouped?: boolean }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-2 py-3 md:grid-cols-12",
        !grouped && "border-b border-foreground/5",
      )}
    >
      <div className="self-center md:col-span-5">
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-4 w-[min(100%,12rem)] max-w-full" />
        </div>
      </div>
      <div className="self-center md:col-span-5">
        <Skeleton className="h-3 w-[min(100%,18rem)] max-w-full opacity-90" />
      </div>
      <div className="flex justify-end self-center md:col-span-2">
        <Skeleton className="h-3 w-14" />
      </div>
    </div>
  );
}

function IsletGroupSkeleton({ nestedRows }: { nestedRows: number }) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="flex items-center gap-3 py-1">
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="islets-tree-content after:content-[''] after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-foreground/5">
        <div className="divide-y divide-foreground/5">
          {Array.from({ length: nestedRows }, (_, i) => (
            <IsletRowSkeleton grouped key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function IsletsListSkeleton({
  className,
  groupNestedRows = 3,
  trailingRows = 4,
}: {
  className?: string;
  /** Skeleton rows shown inside the faux folder group. */
  groupNestedRows?: number;
  /** Additional flat rows after the group. */
  trailingRows?: number;
} = {}) {
  return (
    <div aria-busy="true" className={cn("space-y-0", className)} role="status">
      <span className="sr-only">Loading islets</span>
      <IsletGroupSkeleton nestedRows={groupNestedRows} />
      {Array.from({ length: trailingRows }, (_, i) => (
        <IsletRowSkeleton key={i} />
      ))}
    </div>
  );
}
