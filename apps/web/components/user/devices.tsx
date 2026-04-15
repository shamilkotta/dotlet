import Link from "next/link";
import { File, Lock } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { and, count, desc, eq, InferSelectModel, max } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { devices, islets, user } from "@/lib/db/schema";

function terminalUpdatedLabel(d: Date): string {
  const now = Date.now();
  const then = d.getTime();
  const diffMs = now - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 45) {
    return "NOW";
  }
  const min = Math.floor(sec / 60);
  if (min < 60) {
    return `${min}M_AGO`;
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return `${hr}H_AGO`;
  }

  const startOfDay = (t: number) => {
    const x = new Date(t);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  const daySpan = Math.floor((startOfDay(now) - startOfDay(then)) / 86_400_000);
  if (daySpan === 1) {
    return "YESTERDAY";
  }
  if (daySpan < 7) {
    return `${daySpan}D_AGO`;
  }
  const wk = Math.floor(daySpan / 7);
  if (wk < 8) {
    return `${wk}W_AGO`;
  }
  return d
    .toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase()
    .replace(/,/g, "")
    .replace(/\s+/g, "_");
}

export async function DevicesList({
  isOwner,
  profile,
}: {
  isOwner: boolean;
  profile: Partial<InferSelectModel<typeof user>>;
}) {
  const devicesRows = await db
    .select({
      id: devices.id,
      name: devices.name,
      visibility: devices.visibility,
      createdAt: devices.createdAt,
      isletCount: count(islets.id),
      lastUpdated: max(islets.updatedAt),
    })
    .from(devices)
    .leftJoin(
      islets,
      isOwner
        ? eq(devices.id, islets.deviceId)
        : and(eq(devices.id, islets.deviceId), eq(islets.visibility, "public")),
    )
    .where(
      isOwner
        ? eq(devices.userId, profile.id!)
        : and(eq(devices.userId, profile.id!), eq(devices.visibility, "public")),
    )
    .groupBy(devices.id)
    .orderBy(desc(devices.createdAt));

  return (
    <div className="mb-12">
      <div className="space-y-4">
        {devicesRows.length === 0 ? (
          <div className="border border-dashed border-[#e1e4e8] px-6 py-12 text-center text-sm text-[#57606a] dark:border-[#2a2a2a] dark:text-[#737373]">
            <p>No devices in this registry.</p>
            {isOwner ? (
              <p className="mt-3 text-xs">
                Register a device with the CLI, then refresh this page.
              </p>
            ) : null}
          </div>
        ) : (
          devicesRows.map((device, index) => {
            const href = `/${profile.username}/${device.name}`;
            const idx = `${String(index + 1).padStart(2, "0")}.`;
            return (
              <div
                key={device.id}
                className="group border-l-2 border-transparent pl-4 transition-all hover:border-[#1f2328] dark:hover:border-white"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[#57606a] dark:text-[#737373]">{idx}</span>
                  <Link
                    className="text-lg font-bold text-[#1f2328] underline-offset-4 hover:underline dark:text-white"
                    href={href}
                  >
                    {device.name}
                  </Link>
                  {device.visibility !== "public" && <Lock className="size-3.5" />}
                  <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-[#57606a] dark:text-[#737373]">
                    <span className="flex items-center gap-1">
                      <File aria-hidden className="size-3.5" strokeWidth={1.5} />
                      {device.isletCount}
                    </span>
                    <span></span>
                  </div>
                </div>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#57606a] dark:text-[#737373]">
                  Last updated:{" "}
                  {device.lastUpdated ? terminalUpdatedLabel(device.lastUpdated) : "_NEVER_"}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function DeviceListSkeleton() {
  return (
    <div aria-busy="true" className="mb-12" role="status">
      <span className="sr-only">Loading devices</span>
      <div className="space-y-5">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-l-2 border-transparent pl-4">
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-4 w-7 rounded-sm" />
              <Skeleton className="h-4 w-32 max-w-[min(100%,16rem)] rounded-sm" />
              <div className="ml-auto flex flex-wrap items-center gap-4">
                <Skeleton className="h-3 w-8 rounded-sm" />
                {/* <Skeleton className="h-3 w-36 rounded-sm" /> */}
              </div>
            </div>
            <Skeleton className="mt-2 h-4 w-full max-w-xl rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
