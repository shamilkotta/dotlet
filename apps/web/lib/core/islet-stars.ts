import { and, count, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { devices, islets, isletStars } from "@/lib/db/schema";

export async function getIsletStarState(isletId: string, userId: string | undefined) {
  const [countRow] = await db
    .select({ n: count() })
    .from(isletStars)
    .where(eq(isletStars.isletId, isletId));
  const starCount = Number(countRow?.n ?? 0);

  let initialStarred = false;
  if (userId) {
    const [row] = await db
      .select({ userId: isletStars.userId })
      .from(isletStars)
      .where(and(eq(isletStars.isletId, isletId), eq(isletStars.userId, userId)))
      .limit(1);
    initialStarred = Boolean(row);
  }

  return { starCount, initialStarred };
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
