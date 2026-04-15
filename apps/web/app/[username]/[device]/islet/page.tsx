import { cache, Suspense } from "react";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { FolderOpen, Lock } from "lucide-react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { devices, isletRevisions, islets, user } from "@/lib/db/schema";
import { getIsletStarState } from "@/lib/core/islet-stars";
import { getLanguageFromPath, getLanguageLabel, MAX_INLINE_FILE_SIZE_BYTES } from "@/lib/file";
import { getStorageProvider } from "@/lib/storage/provider";
import {
  IsletCodeViewer,
  IsletCodeViewerSkeleton,
  IsletInfo,
  IsletInfoSkeleton,
} from "@/components/device/islet-code-viewer";
import { IsletFileToolbar, IsletFileToolbarSkeleton } from "@/components/device/islet-file-toolbar";
import { LandingFooter } from "@/components/landing-footer";
import { AuthHeader } from "@/components/auth-header";
import { buildIsletHistoryHref, buildIsletViewHref } from "@/lib/core/islet-link";
import { splitDirAndFile } from "@/lib/core/path";
import { shortRevisionId } from "@/lib/core/crypto";
import { CopyIsletNameButton } from "@/components/copy-islet-name-button";
import { IsletStarButton, IsletStarButtonPlaceholder } from "@/components/device/islet-star-button";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>;
}): Promise<Metadata> {
  const { n: name } = await searchParams;
  const { fileName: displayName } = splitDirAndFile(name ?? "");
  return {
    title: `${displayName} | dotlet`,
    description: "View islet content and revision history.",
  };
}

const getContent = cache(async (storageKey: string, path: string) => {
  const storage = getStorageProvider();
  const buffer = await storage.get(storageKey);
  const sizeBytes = buffer.byteLength;
  const language = getLanguageFromPath(path);

  const languageLabel = getLanguageLabel(language);
  if (sizeBytes > MAX_INLINE_FILE_SIZE_BYTES) {
    return {
      content: "",
      language,
      languageLabel,
      lines: 0,
      sizeBytes,
      isTooLarge: true,
    };
  }

  const content = buffer.toString("utf8");
  const lines = content === "" ? 1 : content.split("\n").length;

  return { content, language, languageLabel, lines, sizeBytes, isTooLarge: false };
});

export default async function IsletPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string; device: string }>;
  searchParams: Promise<{ n?: string; v?: string }>;
}) {
  const { username, device } = await params;
  const { n: name, v: version } = await searchParams;

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
      currentRevisionId: islets.currentRevisionId,
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
  if (!isletRow.currentRevisionId) {
    notFound();
  }

  const revisionIdWanted = version?.trim() || isletRow.currentRevisionId;

  const [revision] = await db
    .select({
      id: isletRevisions.id,
      storageKey: isletRevisions.storageKey,
    })
    .from(isletRevisions)
    .where(and(eq(isletRevisions.id, revisionIdWanted), eq(isletRevisions.isletId, isletRow.id)))
    .limit(1);

  if (!revision) {
    notFound();
  }

  const starStatePromise = getIsletStarState(isletRow.id, session?.user.id);
  const isLoggedIn = Boolean(session?.user.id);

  const islet = { ...isletRow, storageKey: revision.storageKey };
  const versionTrimmed = version?.trim();
  const viewingPastRevision =
    Boolean(versionTrimmed) && versionTrimmed !== isletRow.currentRevisionId;

  const content = getContent(islet.storageKey, islet.path);
  const { fileName: displayName } = splitDirAndFile(islet.path);
  const fileViewHref = buildIsletViewHref({
    username: target.username ?? "",
    deviceName: target.deviceName,
    isletPath: islet.path,
  });
  const historyHref = buildIsletHistoryHref({
    username: target.username ?? "",
    deviceName: target.deviceName,
    isletPath: islet.path,
  });

  const downloadParams = new URLSearchParams({
    device: `${target.username}/${target.deviceName}`,
    n: islet.path,
  });
  if (versionTrimmed) {
    downloadParams.set("v", versionTrimmed);
  }
  const rawDownloadHref = `/api/islets/download?${downloadParams.toString()}`;

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

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
            <Link
              href={`/${target.username}/${target.deviceName}`}
              className="text-[#57606a] transition-colors hover:text-[#1f2328] dark:text-[#919191] dark:hover:text-white"
            >
              {target.deviceName}
            </Link>
            <span className="text-[#e1e4e8] dark:text-[#2a2a2a]">/</span>
            <span className="font-bold">{displayName || islet.path}</span>
          </div>
        </div>
        <AuthHeader session={session} />
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
        <div className="mb-4 flex flex-col justify-between gap-4  md:flex-row md:items-center">
          <div className="min-w-0">
            <h1 className="mb-1 flex items-center gap-2 text-xl font-semibold  text-[#1f2328] dark:text-[#ededed]">
              <span className="truncate">{displayName || islet.path}</span>
              {islet.visibility !== "public" && <Lock className="size-4" />}
              <span className="rounded bg-[#f6f8fa] px-1.5 py-0.5 font-mono text-xs text-[#57606a] dark:bg-[#2a2a2a]/30 dark:text-[#919191]">
                {shortRevisionId(revisionIdWanted)}
              </span>
            </h1>
            <div className="group/islet flex items-center gap-1">
              <p className="flex items-center gap-1 font-mono text-xs text-[#57606a] opacity-70 dark:text-[#919191]">
                <FolderOpen className="size-3.5 shrink-0" aria-hidden />
                <span className="truncate">{islet.path}</span>
              </p>
              <div className="opacity-0 transition-opacity group-hover/islet:opacity-100 group-focus-within/islet:opacity-100">
                <CopyIsletNameButton
                  value={`${APP_URL}/${target.username}/${target.deviceName}/islet?n=${islet.path}`}
                  ariaLabel={`Copy islet ${islet.path}`}
                />
              </div>
            </div>
          </div>
          <div className="flex  items-center gap-2 md:gap-3 md:justify-end">
            <Suspense fallback={<IsletStarButtonPlaceholder />}>
              <IsletStarButton
                isletId={isletRow.id}
                starStatePromise={starStatePromise}
                isLoggedIn={isLoggedIn}
              />
            </Suspense>
            <Suspense fallback={<IsletFileToolbarSkeleton />}>
              <IsletFileToolbar
                contentPromise={content}
                rawDownloadHref={rawDownloadHref}
                historyHref={historyHref}
              />
            </Suspense>
          </div>
        </div>

        {viewingPastRevision ? (
          <div className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <span className="mr-2">Viewing an older revision.</span>
            <Link
              className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-white"
              href={fileViewHref}
            >
              View current file
            </Link>
          </div>
        ) : null}

        <Suspense fallback={<IsletInfoSkeleton />}>
          <IsletInfo contentPromise={content} />
        </Suspense>

        <section className="overflow-hidden rounded-lg border border-[#e1e4e8] bg-white shadow-sm dark:border-[#2a2a2a] dark:bg-[#0f0f0f]">
          <Suspense fallback={<IsletCodeViewerSkeleton />}>
            <IsletCodeViewer contentPromise={content} rawDownloadHref={rawDownloadHref} />
          </Suspense>
        </section>
      </main>

      <LandingFooter className="mx-auto max-w-[1600px] px-4 md:px-8" />
    </>
  );
}
