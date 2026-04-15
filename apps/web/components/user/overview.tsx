import { getStarsUserHas, getUserStarredIslets } from "@/lib/core/islet-stars";
import { db } from "@/lib/db/client";
import { devices, islets } from "@/lib/db/schema";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { and, count, eq } from "drizzle-orm";

const getUserDevices = async (userId: string, isOwner: boolean) => {
  return db
    .select({
      deviceId: devices.id,
      deviceName: devices.name,
      deviceVisibility: devices.visibility,
      isletCount: count(islets.id),
    })
    .from(devices)
    .where(
      isOwner
        ? eq(devices.userId, userId)
        : and(eq(devices.userId, userId), eq(devices.visibility, "public")),
    )
    .leftJoin(
      islets,
      isOwner
        ? eq(devices.id, islets.deviceId)
        : and(eq(devices.id, islets.deviceId), eq(islets.visibility, "public")),
    )
    .groupBy(devices.id);
};

export async function UserOverview({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const promises: Promise<any>[] = [
    getStarsUserHas(userId),
    getUserDevices(userId, isOwner).then((devices) => ({
      deviceCount: devices.length,
      isletCount: devices.reduce((acc, device) => acc + (device.isletCount ?? 0), 0),
    })),
  ];

  if (isOwner) {
    promises.push(getUserStarredIslets(userId));
  }

  const [starsUserHas, userDevicesData, userStarredIslets] = await Promise.all(promises);

  return (
    <div className="flex flex-wrap gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-[#57606a] dark:text-[#737373]">DEVICES:</span>
        <span className="font-bold text-[#1f2328] dark:text-white">
          {userDevicesData.deviceCount}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#57606a] dark:text-[#737373]">ISLETS:</span>
        <span className="font-bold text-[#1f2328] dark:text-white">
          {userDevicesData.isletCount}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#57606a] dark:text-[#737373]">STARS:</span>
        <span className="font-bold text-[#1f2328] dark:text-white">{starsUserHas.length}</span>
      </div>
      {isOwner && (
        <div className="flex items-center gap-2">
          <span className="text-[#57606a] dark:text-[#737373]">STARRED:</span>
          <span className="font-bold text-[#1f2328] dark:text-white">
            {userStarredIslets.length}
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
