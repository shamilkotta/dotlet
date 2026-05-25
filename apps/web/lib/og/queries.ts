import { cache } from "react";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { devices, isletRevisions, islets, user } from "@/lib/db/schema";
import { getLanguageFromPath, getLanguageLabel } from "@/lib/file";

export const getProfileOgData = cache(async function getProfileOgData(username: string) {
  const [profile] = await db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
      deviceCount: sql<number>`(
        SELECT count(*)::int
        FROM "devices" AS profile_devices
        WHERE profile_devices."user_id" = "user"."id"
          AND profile_devices."visibility" = 'public'
      )`,
      isletCount: sql<number>`(
        SELECT count(*)::int
        FROM "islets" AS profile_islets
        INNER JOIN "devices" AS profile_islet_devices
          ON profile_islets."device_id" = profile_islet_devices."id"
        WHERE profile_islet_devices."user_id" = "user"."id"
          AND profile_islet_devices."visibility" = 'public'
          AND profile_islets."visibility" = 'public'
      )`,
      starCount: sql<number>`(
        SELECT count(*)::int
        FROM "islet_stars" AS profile_stars
        INNER JOIN "islets" AS starred_islets
          ON profile_stars."islet_id" = starred_islets."id"
        INNER JOIN "devices" AS starred_devices
          ON starred_islets."device_id" = starred_devices."id"
        WHERE starred_devices."user_id" = "user"."id"
          AND starred_devices."visibility" = 'public'
          AND starred_islets."visibility" = 'public'
      )`,
    })
    .from(user)
    .where(sql`lower(${user.username}) = ${username.toLowerCase()}`)
    .limit(1);

  if (!profile?.username) {
    return null;
  }

  return {
    ...profile,
    deviceCount: Number(profile.deviceCount ?? 0),
    isletCount: Number(profile.isletCount ?? 0),
    starCount: Number(profile.starCount ?? 0),
  };
});

export const getDeviceOgData = cache(async function getDeviceOgData(
  username: string,
  deviceName: string,
) {
  const [target] = await db
    .select({
      userId: user.id,
      username: user.username,
      deviceId: devices.id,
      deviceName: devices.name,
      visibility: devices.visibility,
      isletCount: sql<number>`(
        SELECT count(*)::int
        FROM "islets" AS device_islets
        WHERE device_islets."device_id" = "devices"."id"
          AND ("devices"."visibility" = 'public' AND device_islets."visibility" = 'public' OR "devices"."visibility" <> 'public')
      )`,
      revisionCount: sql<number>`(
        SELECT count(*)::int
        FROM "islet_revisions" AS device_revisions
        INNER JOIN "islets" AS revision_islets
          ON device_revisions."islet_id" = revision_islets."id"
        WHERE revision_islets."device_id" = "devices"."id"
          AND ("devices"."visibility" = 'public' AND revision_islets."visibility" = 'public' OR "devices"."visibility" <> 'public')
      )`,
      lastSyncedAt: sql<Date | null>`(
        SELECT max(device_activity."updated_at")
        FROM "islets" AS device_activity
        WHERE device_activity."device_id" = "devices"."id"
          AND ("devices"."visibility" = 'public' AND device_activity."visibility" = 'public' OR "devices"."visibility" <> 'public')
      )`,
    })
    .from(user)
    .innerJoin(devices, eq(devices.userId, user.id))
    .where(and(eq(user.username, username), eq(devices.name, deviceName)))
    .limit(1);

  if (!target) {
    return null;
  }

  const isPublic = target.visibility === "public";

  return {
    ...target,
    isPublic,
    isletCount: Number(target.isletCount ?? 0),
    revisionCount: Number(target.revisionCount ?? 0),
    lastSyncedAt: target.lastSyncedAt ?? null,
  };
});

export const getIsletOgData = cache(async function getIsletOgData(
  username: string,
  deviceName: string,
  isletPath: string,
  version?: string,
) {
  const [target] = await db
    .select({
      userId: user.id,
      username: user.username,
      deviceId: devices.id,
      deviceName: devices.name,
      deviceVisibility: devices.visibility,
      id: islets.id,
      path: islets.path,
      visibility: islets.visibility,
      currentRevisionId: islets.currentRevisionId,
      updatedAt: islets.updatedAt,
      revisionId: isletRevisions.id,
      starCount: sql<number>`(
        SELECT count(*)::int
        FROM "islet_stars" AS og_stars
        WHERE og_stars."islet_id" = "islets"."id"
      )`,
    })
    .from(user)
    .innerJoin(devices, eq(devices.userId, user.id))
    .innerJoin(islets, eq(islets.deviceId, devices.id))
    .innerJoin(
      isletRevisions,
      and(
        eq(isletRevisions.isletId, islets.id),
        version?.trim()
          ? eq(isletRevisions.id, version.trim())
          : eq(isletRevisions.id, islets.currentRevisionId),
      ),
    )
    .where(
      and(eq(user.username, username), eq(devices.name, deviceName), eq(islets.path, isletPath)),
    )
    .limit(1);

  if (!target?.currentRevisionId) {
    return null;
  }

  const isPublic = target.deviceVisibility === "public" && target.visibility === "public";
  const language = getLanguageFromPath(target.path);
  const languageLabel = getLanguageLabel(language);

  return {
    username: target.username ?? username,
    deviceName: target.deviceName,
    userId: target.userId,
    path: target.path,
    revisionId: target.revisionId,
    languageLabel,
    isPublic,
    starCount: Number(target.starCount ?? 0),
    updatedAt: target.updatedAt,
  };
});
