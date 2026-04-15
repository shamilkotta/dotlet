import { Suspense } from "react";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { FolderOpen } from "lucide-react";

import { LandingFooter } from "@/components/landing-footer";
import { buildIsletViewHref } from "@/lib/core/islet-link";
import { splitDirAndFile } from "@/lib/core/path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { devices, islets, user } from "@/lib/db/schema";
import { getIsletStarState } from "@/lib/core/islet-stars";
import { IsletHistory, IsletHistorySkeleton } from "@/components/islet/history";
import { AuthHeader } from "@/components/auth-header";
import { IsletStarButton, IsletStarButtonPlaceholder } from "@/components/device/islet-star-button";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; device: string }>;
  searchParams: Promise<{ n?: string }>;
}): Promise<Metadata> {
  void params;
  const { n } = await searchParams;
  const { fileName: displayName } = splitDirAndFile(n ?? "");
  const label = displayName ? `${displayName} history` : "Islet history";
  return {
    title: `${label} | dotlet`,
    description: "View islet revision history.",
  };
}

export default async function IsletHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; device: string }>;
  searchParams: Promise<{ n?: string }>;
}) {
  const { username, device } = await params;
  const { n: name } = await searchParams;

  if (!name?.trim()) {
    redirect(`/${username}/${device}`);
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const [target] = await db
    .select({
      userId: user.id,
      username: user.username,
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

  const [isletRow] = await db
    .select({
      id: islets.id,
      path: islets.path,
      visibility: islets.visibility,
    })
    .from(islets)
    .where(and(eq(islets.deviceId, target.deviceId), eq(islets.path, name.trim())))
    .limit(1);

  if (!isletRow) {
    notFound();
  }
  if (isletRow.visibility === "private" && !canViewPrivate) {
    notFound();
  }

  const starStatePromise = getIsletStarState(isletRow.id, session?.user.id);
  const isLoggedIn = Boolean(session?.user.id);

  const { fileName: displayName } = splitDirAndFile(isletRow.path);
  const fileViewHref = buildIsletViewHref({
    username: target.username ?? "",
    deviceName: target.deviceName,
    isletPath: isletRow.path,
  });

  return (
    <>
      <header className="sticky top-0 z-50 mx-auto flex h-14 w-full max-w-[1600px] items-center border-b border-[#e1e4e8] px-4 dark:border-[#2a2a2a] md:px-8">
        <div className="flex flex-1 items-center gap-4">
          <div className="flex min-w-0 items-center gap-2 font-mono text-sm tracking-tight">
            <Link
              href={`/${target.username}`}
              className="text-[#57606a] transition-colors hover:text-[#1f2328] dark:text-[#919191] dark:hover:text-white"
            >
              {target.username}
            </Link>
            <span className="text-[#e1e4e8] dark:text-[#2a2a2a]">/</span>
            <Link
              href={`/${target.username}/${target.deviceName}`}
              className="text-[#57606a] transition-colors hover:text-[#1f2328] dark:text-[#919191] dark:hover:text-white"
            >
              {target.deviceName}
            </Link>
            <span className="text-[#e1e4e8] dark:text-[#2a2a2a]">/</span>
            <Link
              href={fileViewHref}
              className="min-w-0 truncate text-[#57606a] transition-colors hover:text-[#1f2328] dark:text-[#919191] dark:hover:text-white"
            >
              {displayName || isletRow.path}
            </Link>
            <span className="text-[#e1e4e8] dark:text-[#2a2a2a]">/</span>
            <span className="font-bold text-[#1f2328] dark:text-[#ededed]">history</span>
          </div>
        </div>
        <AuthHeader session={session} />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold  text-[#1f2328] dark:text-[#ededed]">
              <span className="truncate">{displayName || isletRow.path}</span>
            </h1>
            <div className="group/islet flex items-center gap-1">
              <p className="flex items-center gap-1 font-mono text-xs text-[#57606a] opacity-70 dark:text-[#919191]">
                <FolderOpen className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{isletRow.path}</span>
              </p>
            </div>
          </div>
          <Suspense fallback={<IsletStarButtonPlaceholder />}>
            <IsletStarButton
              isletId={isletRow.id}
              starStatePromise={starStatePromise}
              isLoggedIn={isLoggedIn}
            />
          </Suspense>
        </div>
        <Suspense fallback={<IsletHistorySkeleton />}>
          <IsletHistory isletRow={isletRow} target={target} />
        </Suspense>
      </main>

      <LandingFooter className="mx-auto max-w-[1600px] px-4 md:px-8" />
    </>
  );
}
