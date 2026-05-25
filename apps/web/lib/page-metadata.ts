import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { getDeviceOgData, getIsletOgData, getProfileOgData } from "@/lib/og/queries";
import { buildIsletOgImagePath, buildIsletPagePath, createPageMetadata } from "@/lib/metadata";
import { splitDirAndFile } from "@/lib/core/path";

export const getViewerUserId = cache(async function getViewerUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user.id ?? null;
});

export async function createProfileMetadata(username: string) {
  const profile = await getProfileOgData(username);

  if (!profile) {
    return createPageMetadata({
      title: "Profile not found",
      description: "This dotlet profile could not be found.",
      path: `/${username}`,
      noIndex: true,
    });
  }

  const displayName = profile.name ?? profile.username;
  const description =
    profile.deviceCount > 0 || profile.isletCount > 0
      ? `${displayName} has ${profile.deviceCount} public device${profile.deviceCount === 1 ? "" : "s"} and ${profile.isletCount} public islet${profile.isletCount === 1 ? "" : "s"} on dotlet.`
      : `Devices and profile for @${profile.username} on dotlet.`;

  return createPageMetadata({
    title: profile.username ?? username,
    description,
    path: `/${profile.username ?? username}`,
  });
}

export async function createDeviceMetadata(username: string, deviceName: string) {
  const viewerId = await getViewerUserId();
  const data = await getDeviceOgData(username, deviceName);
  const path = `/${username}/${deviceName}`;

  if (!data) {
    return createPageMetadata({
      title: "Device not found",
      description: "This dotlet device could not be found.",
      path,
      noIndex: true,
    });
  }

  const canViewPrivate = viewerId === data.userId;
  if (!canViewPrivate && !data.isPublic) {
    return createPageMetadata({
      title: "Private device",
      description: "This dotlet device is not publicly visible.",
      path,
      noIndex: true,
    });
  }

  const description = canViewPrivate
    ? `${data.deviceName} on @${data.username} — ${data.isletCount} islet${data.isletCount === 1 ? "" : "s"}, ${data.revisionCount} revision${data.revisionCount === 1 ? "" : "s"}.`
    : `Browse ${data.isletCount} public islet${data.isletCount === 1 ? "" : "s"} on ${data.username}/${data.deviceName}.`;

  return createPageMetadata({
    title: `${username}/${deviceName}`,
    description,
    path,
  });
}

export async function createIsletMetadata(
  username: string,
  deviceName: string,
  isletPath: string,
  revisionId?: string,
) {
  const viewerId = await getViewerUserId();
  const data = await getIsletOgData(username, deviceName, isletPath, revisionId);
  const pagePath = buildIsletPagePath(username, deviceName, isletPath, revisionId);
  const ogImagePath = buildIsletOgImagePath(username, deviceName, isletPath, revisionId);

  if (!data) {
    return createPageMetadata({
      title: "Islet not found",
      description: "This dotlet islet could not be found.",
      path: pagePath,
      ogImagePath,
      noIndex: true,
    });
  }

  if (!data.isPublic) {
    const canViewPrivate = viewerId === data.userId;
    if (!canViewPrivate) {
      return createPageMetadata({
        title: "Private islet",
        description: "This dotlet islet is not publicly visible.",
        path: pagePath,
        ogImagePath,
        noIndex: true,
      });
    }
  }

  const { fileName } = splitDirAndFile(data.path);
  const title = `${username}/${deviceName}/${fileName || data.path}`;

  return createPageMetadata({
    title,
    description: `View ${data.path} on ${username}/${deviceName}. ${data.languageLabel} config with revision ${data.revisionId.slice(0, 7)}.`,
    path: pagePath,
    ogImagePath,
  });
}

export async function createIsletHistoryMetadata(
  username: string,
  deviceName: string,
  isletPath: string,
) {
  const viewerId = await getViewerUserId();
  const data = await getIsletOgData(username, deviceName, isletPath);
  const pagePath = `/${username}/${deviceName}/islet/history?n=${encodeURIComponent(isletPath)}`;
  const ogImagePath = buildIsletOgImagePath(username, deviceName, isletPath);

  if (!data) {
    return createPageMetadata({
      title: "Islet history",
      description: "Revision history for a dotlet islet.",
      path: pagePath,
      ogImagePath,
      noIndex: true,
    });
  }

  if (!data.isPublic) {
    const canViewPrivate = viewerId === data.userId;
    if (!canViewPrivate) {
      return createPageMetadata({
        title: "Private islet history",
        description: "This dotlet islet history is not publicly visible.",
        path: pagePath,
        ogImagePath,
        noIndex: true,
      });
    }
  }

  const { fileName } = splitDirAndFile(data.path);
  const label = fileName ? `${fileName} history` : "Islet history";

  return createPageMetadata({
    title: `${username}/${deviceName}/${label}`,
    description: `Revision history for ${data.path} on ${username}/${deviceName}.`,
    path: pagePath,
    ogImagePath,
  });
}
