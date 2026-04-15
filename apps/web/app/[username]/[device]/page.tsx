import { Suspense } from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { LandingFooter } from "@/components/landing-footer";
import { AuthHeader } from "@/components/auth-header";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { devices, user } from "@/lib/db/schema";
import { IsletsList, IsletsListSkeleton } from "@/components/device/islets";
import {
  DeviceInfo,
  DeviceInfoSkeleton,
  DeviceLastActivity,
  DeviceLastActivitySkeleton,
} from "@/components/device/info";
import Link from "next/link";
import { Lock } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; device: string }>;
}): Promise<Metadata> {
  const { device, username } = await params;
  return {
    title: `${username}/${device} | dotlet`,
    description: "Browse islets for this device.",
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
    notFound();
  }

  const canViewPrivate = session?.user.id === target.userId;
  if (!canViewPrivate && target.visibility !== "public") {
    notFound();
  }

  return (
    <>
      <header className="sticky top-0 z-50 flex h-14 items-center border-b border-[#e1e4e8] px-4 dark:border-[#2a2a2a]  md:px-8 w-full max-w-[1600px] mx-auto">
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
                <DeviceLastActivity target={target} canViewPrivate={canViewPrivate} />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={<DeviceInfoSkeleton />}>
            <DeviceInfo target={target} canViewPrivate={canViewPrivate} />
          </Suspense>
        </div>
        <Suspense fallback={<IsletsListSkeleton />}>
          <IsletsList target={target} canViewPrivate={canViewPrivate} />
        </Suspense>
      </main>

      <LandingFooter className="mx-auto max-w-[1600px] px-4 md:px-8" />
    </>
  );
}
