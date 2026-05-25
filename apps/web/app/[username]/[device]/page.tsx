import { Suspense } from "react";
import Image from "next/image";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { AuthHeader } from "@/components/auth-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { devices, user } from "@/lib/db/schema";
import { createDeviceMetadata } from "@/lib/page-metadata";
import { IsletsList, IsletsListSkeleton, type IsletRecord } from "@/components/device/islets";
import {
  DeviceInfo,
  DeviceInfoSkeleton,
  DeviceLastActivity,
  DeviceLastActivitySkeleton,
} from "@/components/device/info";
import Link from "next/link";
import { Lock } from "lucide-react";
import { isletRevisions, islets } from "@/lib/db/schema";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; device: string }>;
}) {
  const { device, username } = await params;
  return createDeviceMetadata(username, device);
}

async function loadDevicePageData(username: string, device: string, viewerId: string | undefined) {
  const [target] = await db
    .select({
      userId: user.id,
      username: user.username,
      name: user.name,
      userImage: user.image,
      deviceId: devices.id,
      deviceName: devices.name,
      visibility: devices.visibility,
    })
    .from(user)
    .innerJoin(devices, eq(devices.userId, user.id))
    .where(and(eq(user.username, username), eq(devices.name, device)))
    .limit(1);

  if (!target) {
    return null;
  }

  const canViewPrivate = viewerId === target.userId;
  if (!canViewPrivate && target.visibility !== "public") {
    return null;
  }

  const visibleIsletFilter = canViewPrivate
    ? eq(islets.deviceId, target.deviceId)
    : and(eq(islets.deviceId, target.deviceId), eq(islets.visibility, "public"));

  const records = (await db
    .select({
      path: islets.path,
      message: isletRevisions.message,
      updatedAt: islets.updatedAt,
      revisionId: islets.currentRevisionId,
      visibility: islets.visibility,
      fileCount: sql<number>`(
        SELECT count(*)::int
        FROM "islets" AS visible_islets
        WHERE visible_islets."device_id" = ${target.deviceId}
          AND (${canViewPrivate} OR visible_islets."visibility" = 'public')
      )`,
      commitCount: sql<number>`(
        SELECT count(*)::int
        FROM "islet_revisions" AS revisions
        INNER JOIN "islets" AS revision_islets
          ON revisions."islet_id" = revision_islets."id"
        WHERE revision_islets."device_id" = ${target.deviceId}
          AND (${canViewPrivate} OR revision_islets."visibility" = 'public')
      )`,
      lastActivity: sql<Date | null>`(
        SELECT max(activity_islets."updated_at")
        FROM "islets" AS activity_islets
        WHERE activity_islets."device_id" = ${target.deviceId}
          AND (${canViewPrivate} OR activity_islets."visibility" = 'public')
      )`,
    })
    .from(islets)
    .leftJoin(isletRevisions, eq(islets.currentRevisionId, isletRevisions.id))
    .where(visibleIsletFilter)
    .orderBy(desc(islets.updatedAt))) as Array<
    IsletRecord & {
      fileCount: number;
      commitCount: number;
      lastActivity: Date | null;
    }
  >;

  return {
    target,
    canViewPrivate,
    records,
    fileCount: Number(records[0]?.fileCount ?? 0),
    commitCount: Number(records[0]?.commitCount ?? 0),
    lastActivity: records[0]?.lastActivity ?? null,
  };
}

export default async function DevicePage({
  params,
}: {
  params: Promise<{ username: string; device: string }>;
}) {
  const { username, device } = await params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const data = await loadDevicePageData(username, device, session?.user.id);
  if (!data) {
    notFound();
  }
  const { commitCount, fileCount, lastActivity, records, target } = data;

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-[#e1e4e8] px-4 dark:border-[#2a2a2a] bg-white dark:bg-[#0a0a0a] md:px-8 w-full max-w-[1600px] mx-auto">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-sm tracking-tight">
            <Link
              href={`/${target.username}`}
              className=" text-[#57606a] transition-colors hover:text-[#1f2328] dark:text-[#919191] dark:hover:text-white"
            >
              {target.username}
            </Link>
            <span className="text-[#e1e4e8] dark:text-[#2a2a2a]">/</span>
            <span className="font-bold">{target.deviceName}</span>
          </div>
        </div>
        <AuthHeader session={session} />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
        <div className="mb-8 flex flex-col justify-between gap-4 pb-6 border-b border-foreground/20 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            {target.userImage ? (
              <Image
                alt=""
                className="size-8 rounded-full border border-foreground/5"
                src={target.userImage}
                width={32}
                height={32}
                unoptimized
              />
            ) : (
              <div className="flex size-8 items-center justify-center rounded-full border border-[#e1e4e8] bg-[#f6f8fa] text-xs font-medium text-[#57606a] dark:border-[#2a2a2a] dark:bg-[#2a2a2a]/30 dark:text-[#919191]">
                {(target.name ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold">{target.deviceName}</span>
                {target.visibility !== "public" && <Lock className="size-4" />}
              </div>
              <Suspense fallback={<DeviceLastActivitySkeleton />}>
                <DeviceLastActivity lastActivity={lastActivity} />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={<DeviceInfoSkeleton />}>
            <DeviceInfo commitCount={commitCount} fileCount={fileCount} />
          </Suspense>
        </div>
        <Suspense fallback={<IsletsListSkeleton />}>
          <IsletsList records={records} target={target} />
        </Suspense>
      </main>
    </>
  );
}
