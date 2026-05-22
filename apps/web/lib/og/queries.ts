import { and, count, eq, max, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { devices, isletRevisions, isletStars, islets, user } from "@/lib/db/schema";
import { getLanguageFromPath, getLanguageLabel } from "@/lib/file";

export async function getProfileOgData(username: string) {
  const [profile] = await db
    .select({
      id: user.id,
      username: user.username,
      name: user.name,
      image: user.image,
    })
    .from(user)
    .where(sql`lower(${user.username}) = ${username.toLowerCase()}`)
    .limit(1);

  if (!profile?.username) {
    return null;
  }

  const publicFilter = and(eq(devices.userId, profile.id), eq(devices.visibility, "public"));

  const deviceRows = await db
    .select({
      isletCount: count(islets.id),
    })
    .from(devices)
    .where(publicFilter)
    .leftJoin(islets, and(eq(devices.id, islets.deviceId), eq(islets.visibility, "public")))
    .groupBy(devices.id);

  const [starCountRow] = await db
    .select({ c: count(isletStars.id) })
    .from(isletStars)
    .innerJoin(islets, eq(isletStars.isletId, islets.id))
    .innerJoin(devices, eq(islets.deviceId, devices.id))
    .where(
      and(
        eq(devices.userId, profile.id),
        eq(devices.visibility, "public"),
        eq(islets.visibility, "public"),
      ),
    );

  const deviceCount = deviceRows.length;
  const isletCount = deviceRows.reduce((sum, row) => sum + Number(row.isletCount ?? 0), 0);

  return {
    ...profile,
    deviceCount,
    isletCount,
    starCount: Number(starCountRow?.c ?? 0),
  };
}

export async function getDeviceOgData(username: string, deviceName: string) {
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
    .where(and(eq(user.username, username), eq(devices.name, deviceName)))
    .limit(1);

  if (!target) {
    return null;
  }

  const isPublic = target.visibility === "public";
  const isletFilter = isPublic
    ? and(eq(islets.deviceId, target.deviceId), eq(islets.visibility, "public"))
    : eq(islets.deviceId, target.deviceId);

  const [[isletCountRow], [revisionCountRow], [lastSyncedRow]] = await Promise.all([
    db
      .select({ c: count(islets.id) })
      .from(islets)
      .where(isletFilter),
    db
      .select({ c: count(isletRevisions.id) })
      .from(isletRevisions)
      .innerJoin(islets, eq(isletRevisions.isletId, islets.id))
      .where(isletFilter),
    db
      .select({ lastSyncedAt: max(islets.updatedAt) })
      .from(islets)
      .where(isletFilter),
  ]);

  return {
    ...target,
    isPublic,
    isletCount: Number(isletCountRow?.c ?? 0),
    revisionCount: Number(revisionCountRow?.c ?? 0),
    lastSyncedAt: lastSyncedRow?.lastSyncedAt ?? null,
  };
}

export async function getIsletOgData(
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
    })
    .from(user)
    .innerJoin(devices, eq(devices.userId, user.id))
    .where(and(eq(user.username, username), eq(devices.name, deviceName)))
    .limit(1);

  if (!target) {
    return null;
  }

  const [isletRow] = await db
    .select({
      id: islets.id,
      path: islets.path,
      visibility: islets.visibility,
      currentRevisionId: islets.currentRevisionId,
      updatedAt: islets.updatedAt,
    })
    .from(islets)
    .where(and(eq(islets.deviceId, target.deviceId), eq(islets.path, isletPath)))
    .limit(1);

  if (!isletRow?.currentRevisionId) {
    return null;
  }

  const isPublic = target.deviceVisibility === "public" && isletRow.visibility === "public";
  const revisionId = version?.trim() || isletRow.currentRevisionId;

  const [[revision], [starCountRow]] = await Promise.all([
    db
      .select({
        id: isletRevisions.id,
      })
      .from(isletRevisions)
      .where(and(eq(isletRevisions.id, revisionId), eq(isletRevisions.isletId, isletRow.id)))
      .limit(1),
    db
      .select({ c: count(isletStars.id) })
      .from(isletStars)
      .where(eq(isletStars.isletId, isletRow.id)),
  ]);

  if (!revision) {
    return null;
  }

  const language = getLanguageFromPath(isletRow.path);
  const languageLabel = getLanguageLabel(language);

  return {
    username: target.username ?? username,
    deviceName: target.deviceName,
    path: isletRow.path,
    revisionId: revision.id,
    languageLabel,
    isPublic,
    starCount: Number(starCountRow?.c ?? 0),
    updatedAt: isletRow.updatedAt,
  };
}
