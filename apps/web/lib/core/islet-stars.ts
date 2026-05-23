import { count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { devices, islets, isletStars } from "@/lib/db/schema";

export async function getIsletStarState(isletId: string, userId: string | undefined) {
  const [row] = await db
    .select({
      starCount: count(),
      initialStarred: sql<boolean>`bool_or(${isletStars.userId} = ${userId ?? null})`,
    })
    .from(isletStars)
    .where(eq(isletStars.isletId, isletId));

  return {
    starCount: Number(row?.starCount ?? 0),
    initialStarred: Boolean(row?.initialStarred),
  };
}

export async function getUserStarredIslets(userId: string) {
  const userStarredIslets = await db
    .select({
      isletId: islets.id,
      path: islets.path,
      visibility: islets.visibility,
      createdAt: islets.createdAt,
      updatedAt: islets.updatedAt,
      starredAt: isletStars.createdAt,
    })
    .from(isletStars)
    .innerJoin(islets, eq(isletStars.isletId, islets.id))
    .where(eq(isletStars.userId, userId))
    .orderBy(desc(isletStars.createdAt));
  return userStarredIslets;
}

export async function getStarsUserHas(userId: string) {
  const starsUserHas = await db
    .select({
      isletId: islets.id,
      deviceId: islets.deviceId,
      path: islets.path,
      visibility: islets.visibility,
      createdAt: islets.createdAt,
      updatedAt: islets.updatedAt,
      starredAt: isletStars.createdAt,
      starredByUserId: isletStars.userId,
    })
    .from(isletStars)
    .innerJoin(islets, eq(isletStars.isletId, islets.id))
    .innerJoin(devices, eq(islets.deviceId, devices.id))
    .where(eq(devices.userId, userId))
    .orderBy(desc(isletStars.createdAt));
  return starsUserHas;
}
