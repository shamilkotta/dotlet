import { db } from "@/lib/db/client";
import { devices, isletStars, islets } from "@/lib/db/schema";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { sql } from "drizzle-orm";

export async function UserOverview({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [counts] = await db
    .select({
      deviceCount: sql<number>`count(DISTINCT ${devices.id})::int`,
      isletCount: sql<number>`count(${islets.id})::int`,
      starsUserHas: sql<number>`(
        SELECT count(*)::int
        FROM ${isletStars}
        INNER JOIN ${islets} AS starred_islets
          ON ${isletStars.isletId} = starred_islets."id"
        INNER JOIN ${devices} AS starred_devices
          ON starred_islets."device_id" = starred_devices."id"
        WHERE starred_devices."user_id" = ${userId}
      )`,
      userStarredIslets: sql<number>`(
        SELECT count(*)::int
        FROM ${isletStars}
        WHERE ${isletStars.userId} = ${userId}
      )`,
    })
    .from(devices)
    .leftJoin(
      islets,
      sql`${devices.id} = ${islets.deviceId} AND (${isOwner} OR ${islets.visibility} = 'public')`,
    )
    .where(sql`${devices.userId} = ${userId} AND (${isOwner} OR ${devices.visibility} = 'public')`);

  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-[#57606a] dark:text-[#737373]">DEVICES:</span>
        <span className="font-bold text-[#1f2328] dark:text-white">
          {Number(counts?.deviceCount ?? 0)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#57606a] dark:text-[#737373]">ISLETS:</span>
        <span className="font-bold text-[#1f2328] dark:text-white">
          {Number(counts?.isletCount ?? 0)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#57606a] dark:text-[#737373]">STARS:</span>
        <span className="font-bold text-[#1f2328] dark:text-white">
          {Number(counts?.starsUserHas ?? 0)}
        </span>
      </div>
      {isOwner && (
        <div className="flex items-center gap-2">
          <span className="text-[#57606a] dark:text-[#737373]">STARRED:</span>
          <span className="font-bold text-[#1f2328] dark:text-white">
            {Number(counts?.userStarredIslets ?? 0)}
          </span>
        </div>
      )}
    </div>
  );
}

export function UserOverviewSkeleton() {
  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <Skeleton className="h-4 w-7 rounded-sm" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-14 rounded-sm" />
        <Skeleton className="h-4 w-7 rounded-sm" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12 rounded-sm" />
        <Skeleton className="h-4 w-7 rounded-sm" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-18 rounded-sm" />
        <Skeleton className="h-4 w-7 rounded-sm" />
      </div>
    </div>
  );
}
