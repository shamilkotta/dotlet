import { shortRevisionId } from "@/lib/core/crypto";
import { listRevisionsForIslet } from "@/lib/core/domain";
import { formatRelativeTimeVerbose } from "@/lib/format-relative-time";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Link from "next/link";
import { CopyIsletNameButton } from "../copy-islet-name-button";
import { cn } from "@workspace/ui/lib/utils";
import { buildIsletViewHref } from "@/lib/core/islet-link";

export async function IsletHistory({
  isletRow,
  target,
}: {
  isletRow: { id: string; path: string; visibility: "private" | "public" };
  target: {
    username?: string | null;
    deviceName?: string | null;
  };
}) {
  const revisions = await listRevisionsForIslet(isletRow.id);
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

  return (
    <div className="relative">
      {revisions.length === 0 ? (
        <p className="text-sm text-[#57606a] dark:text-[#919191]">No history yet.</p>
      ) : (
        <>
          <div
            className="absolute bottom-0 left-[7px] top-2 w-px bg-[#d0d7de] dark:bg-[#3d3d3d]"
            aria-hidden
          />
          <ul className="relative space-y-0">
            {revisions.map((revision, index) => {
              const isLatest = index === 0;
              const message = revision.message?.trim();
              const viewRevisionHref = buildIsletViewHref({
                username: target.username ?? "",
                deviceName: target.deviceName ?? "",
                isletPath: isletRow.path,
                revisionId: revision.id,
              });
              const when = formatRelativeTimeVerbose(revision.createdAt).toUpperCase();
              const isletName = `${APP_URL}/${target.username}/${target.deviceName}/islet?n=${encodeURIComponent(isletRow.path)}&v=${revision.id}`;

              return (
                <li key={revision.id} className="relative pb-12 last:pb-0">
                  <div className="flex gap-5">
                    <div className="relative flex w-4 shrink-0 flex-col items-center pt-1.5">
                      <span
                        className={cn(
                          "relative z-10 size-2 shrink-0 rounded-[1px]",
                          isLatest
                            ? "bg-[#1f2328] dark:bg-white"
                            : "border border-[#8c959f] bg-transparent dark:border-[#6e7681]",
                        )}
                        aria-hidden
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <div className="min-w-0 space-y-2">
                          {message ? (
                            <p className="text-[15px] font-semibold leading-snug text-[#1f2328] dark:text-[#ededed]">
                              {message}
                            </p>
                          ) : (
                            <p className="text-[15px] font-semibold leading-snug text-[#57606a] dark:text-[#919191] italic">
                              No message for this version.
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded border border-[#d0d7de] bg-[#f6f8fa] px-2 py-0.5 font-mono text-xs text-[#1f2328] dark:border-[#3d3d3d] dark:bg-[#21262d] dark:text-[#ededed]">
                              {shortRevisionId(revision.id)}
                            </span>
                            <span className="text-xs font-medium tracking-wide text-[#57606a] dark:text-[#6e7681]">
                              {when}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 sm:pt-0.5">
                          <Button variant="outline" size="sm" className="h-8" asChild>
                            <Link href={viewRevisionHref}>View File</Link>
                          </Button>
                          <CopyIsletNameButton value={isletName} ariaLabel="Copy revision id" />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

const HISTORY_ITEMS = 3;

const skeletonTitleWidths = [
  "w-[min(100%,32rem)]",
  "w-[min(100%,24rem)]",
  "w-[min(100%,36rem)]",
] as const;

export function IsletHistorySkeleton() {
  return (
    <div className="relative" aria-busy="true" aria-label="Loading revision history">
      <div
        className="absolute bottom-0 left-[7px] top-2 w-px bg-[#d0d7de] dark:bg-[#3d3d3d]"
        aria-hidden
      />
      <ul className="relative space-y-0">
        {Array.from({ length: HISTORY_ITEMS }, (_, index) => (
          <li key={index} className="relative pb-12 last:pb-0">
            <div className="flex gap-5">
              <div className="relative flex w-4 shrink-0 flex-col items-center pt-1.5">
                <Skeleton className="size-2 shrink-0 rounded-[1px]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <div className="min-w-0 w-full space-y-2">
                    <Skeleton
                      className={cn(
                        "h-5 max-w-full rounded-sm",
                        skeletonTitleWidths[index] ?? skeletonTitleWidths[0],
                      )}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-5 w-18 rounded-sm" />
                      <Skeleton className="h-5 w-28 rounded-sm" />
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 sm:pt-0.5">
                    <Skeleton className="h-6 w-22 rounded-md" />
                    <Skeleton className="h-6 w-6 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
