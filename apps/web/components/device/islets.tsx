import { and, desc, eq } from "drizzle-orm";
import { ChevronRight, Lock } from "lucide-react";
import { db } from "@/lib/db/client";
import Link from "next/link";

import { islets, isletRevisions } from "@/lib/db/schema";
import { formatRelativeTimeVerbose } from "@/lib/format-relative-time";
import { CopyIsletNameButton } from "@/components/copy-islet-name-button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";
import { buildIsletViewHref } from "@/lib/core/islet-link";
import { splitDirAndFile, stripLeadingSlashes } from "@/lib/core/path";

type IsletRecord = {
  path: string;
  message: string | null;
  updatedAt: Date;
  revisionId: string | null;
  visibility: "public" | "private";
};

type IsletTreeItem =
  | {
      kind: "group";
      directory: string;
      updatedAt: Date;
      records: IsletRecord[];
    }
  | { kind: "single"; updatedAt: Date; record: IsletRecord };

function getMaxUpdatedAt(records: IsletRecord[]): Date {
  return records.reduce(
    (acc, r) => (r.updatedAt.getTime() > acc.getTime() ? r.updatedAt : acc),
    records[0]!.updatedAt,
  );
}

function deviceVisibilityWhere(canViewPrivate: boolean) {
  return canViewPrivate ? [] : [eq(islets.visibility, "public")];
}

function sortByUpdatedAtDescThenPath(a: IsletRecord, b: IsletRecord) {
  const diff = b.updatedAt.getTime() - a.updatedAt.getTime();
  if (diff !== 0) return diff;
  return a.path.localeCompare(b.path);
}

function groupByDirectory(records: IsletRecord[]): IsletTreeItem[] {
  const singles: IsletTreeItem[] = [];
  const groups = new Map<string, IsletRecord[]>();

  for (const record of records) {
    const { directory } = splitDirAndFile(record.path);

    // Root files have no parent directory; render them as flat rows.
    if (!directory) {
      singles.push({ kind: "single", updatedAt: record.updatedAt, record });
      continue;
    }

    const list = groups.get(directory) ?? [];
    list.push(record);
    groups.set(directory, list);
  }

  const items: IsletTreeItem[] = [...singles];

  for (const [directory, dirRecords] of groups) {
    if (dirRecords.length >= 2) {
      items.push({
        kind: "group",
        directory,
        updatedAt: getMaxUpdatedAt(dirRecords),
        records: dirRecords,
      });
    } else if (dirRecords.length === 1) {
      items.push({
        kind: "single",
        updatedAt: dirRecords[0]!.updatedAt,
        record: dirRecords[0]!,
      });
    }
  }

  return items.sort((a, b) => {
    const diff = b.updatedAt.getTime() - a.updatedAt.getTime();
    if (diff !== 0) return diff;
    const aKey = a.kind === "single" ? a.record.path : a.directory;
    const bKey = b.kind === "single" ? b.record.path : b.directory;
    return aKey.localeCompare(bKey);
  });
}

export async function IsletsList({
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

  const records = (await db
    .select({
      path: islets.path,
      message: isletRevisions.message,
      updatedAt: islets.updatedAt,
      revisionId: islets.currentRevisionId,
      visibility: islets.visibility,
    })
    .from(islets)
    .leftJoin(isletRevisions, eq(islets.currentRevisionId, isletRevisions.id))
    .where(baseIsletFilter)
    .orderBy(desc(islets.updatedAt))) as IsletRecord[];

  const treeItems = groupByDirectory(records);
  // const fileCount = Number(fileCountRow?.c ?? 0);
  const firstGroupIndex = treeItems.findIndex((t) => t.kind === "group");

  const makeIsletHref = (isletPath: string) =>
    buildIsletViewHref({
      username: target.username ?? "",
      deviceName: target.deviceName,
      isletPath,
    });
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
  const getIsletName = (isletPath: string) =>
    `${APP_URL}/${target.username}/${target.deviceName}/islet?n=${encodeURIComponent(isletPath)}`;

  return (
    <>
      <div className="space-y-0">
        {treeItems.map((item, index) => {
          if (item.kind === "group") {
            const groupRecords = item.records.slice().sort(sortByUpdatedAtDescThenPath);

            return (
              <details
                className={`group ${
                  index > 0 && treeItems[index - 1]!.kind === "group" ? "mt-4" : ""
                }`}
                open={index === firstGroupIndex}
                key={`dir:${item.directory}`}
              >
                <summary className="flex cursor-pointer items-center gap-3 hover:text-neutral-500 transition-colors">
                  <ChevronRight className="folder-icon size-4 transition-transform duration-200 text-[#57606a] dark:text-[#919191]" />
                  <span className="text-xs font-bold tracking-widest uppercase opacity-40">
                    {item.directory}/
                  </span>
                </summary>

                <div className="islets-tree-content after:content-[''] after:absolute after:bottom-0 after:left-4 after:right-0 after:h-px after:bg-foreground/5">
                  <div className="divide-y divide-foreground/5">
                    {groupRecords.map((record) => {
                      const { fileName } = splitDirAndFile(record.path);
                      const isletName = getIsletName(record.path);
                      return (
                        <div
                          key={record.path}
                          className="group/islet grid grid-cols-1 md:grid-cols-12 gap-2 py-3"
                        >
                          <div className="md:col-span-5 self-center">
                            <div className="flex items-center gap-2 min-w-0">
                              <Link
                                href={makeIsletHref(record.path)}
                                className="text-sm font-medium text-[#1f2328] dark:text-[#e2e2e2] hover:text-[#57606a] dark:hover:text-white transition-colors truncate block min-w-0"
                              >
                                {fileName}
                              </Link>
                              {record.visibility !== "public" && <Lock className="size-3" />}
                              <div className="opacity-0 transition-opacity group-hover/islet:opacity-100 group-focus-within/islet:opacity-100">
                                <CopyIsletNameButton
                                  value={isletName}
                                  ariaLabel={`Copy islet ${record.path}`}
                                />
                              </div>
                            </div>
                          </div>
                          <div className="md:col-span-5 self-center text-xs text-[#57606a] dark:text-[#919191] italic line-clamp-1">
                            {record.message?.trim() ? `"${record.message.trim()}"` : ""}
                          </div>
                          <div className="md:col-span-2 self-center text-right text-[10px] text-[#57606a] dark:text-[#919191] font-mono">
                            {formatRelativeTimeVerbose(record.updatedAt)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>
            );
          }

          const record = item.record;
          const isletName = getIsletName(record.path);
          return (
            <div
              key={record.path}
              className="group/islet grid grid-cols-1 md:grid-cols-12 gap-2 py-3 border-b border-foreground/5"
            >
              <div className="md:col-span-5 self-center">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href={makeIsletHref(record.path)}
                    className="text-sm font-medium text-[#1f2328] dark:text-[#e2e2e2] hover:text-[#57606a] dark:hover:text-white transition-colors truncate block min-w-0"
                  >
                    {stripLeadingSlashes(record.path)}
                  </Link>
                  {record.visibility !== "public" && <Lock className="size-3" />}
                  <div className="opacity-0 transition-opacity group-hover/islet:opacity-100 group-focus-within/islet:opacity-100">
                    <CopyIsletNameButton
                      value={isletName}
                      ariaLabel={`Copy islet ${record.path}`}
                    />
                  </div>
                </div>
              </div>
              <div className="md:col-span-5 self-center text-xs text-[#57606a] dark:text-[#919191] italic line-clamp-1">
                {record.message?.trim() ? `"${record.message.trim()}"` : ""}
              </div>
              <div className="md:col-span-2 self-center text-right text-[10px] text-[#57606a] dark:text-[#919191] font-mono">
                {formatRelativeTimeVerbose(record.updatedAt)}
              </div>
            </div>
          );
        })}
      </div>

      {/* <div className="mt-12 pb-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#57606a] dark:text-[#919191]">
          Showing {records.length} items of {fileCount} in this device
        </p>
      </div> */}
    </>
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
