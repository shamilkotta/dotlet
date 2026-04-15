"use server";

import { and, count, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { canAccessPulledIslet } from "@/app/api/islets/pull/access";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { devices, isletStars, islets } from "@/lib/db/schema";

const isletIdSchema = z.string().uuid();

export type IsletStarActionResult =
  | { ok: true; starred: boolean; starCount: number }
  | { ok: false; error: string };

async function loadIsletAccessContext(isletId: string) {
  const [row] = await db
    .select({
      isletId: islets.id,
      isletVisibility: islets.visibility,
      deviceVisibility: devices.visibility,
      deviceOwnerId: devices.userId,
    })
    .from(islets)
    .innerJoin(devices, eq(islets.deviceId, devices.id))
    .where(eq(islets.id, isletId))
    .limit(1);
  return row ?? null;
}

async function starCountForIslet(isletId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(isletStars)
    .where(eq(isletStars.isletId, isletId));
  return Number(row?.n ?? 0);
}

export async function starIslet(isletIdRaw: string): Promise<IsletStarActionResult> {
  const parsed = isletIdSchema.safeParse(isletIdRaw);
  if (!parsed.success) {
    return { ok: false, error: "Not found" };
  }
  const isletId = parsed.data;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user.id) {
    return { ok: false, error: "Unauthorized" };
  }

  const ctx = await loadIsletAccessContext(isletId);
  if (!ctx) {
    return { ok: false, error: "Not found" };
  }

  const canAccess = canAccessPulledIslet({
    isOwner: session.user.id === ctx.deviceOwnerId,
    deviceVisibility: ctx.deviceVisibility,
    isletVisibility: ctx.isletVisibility,
  });
  if (!canAccess) {
    return { ok: false, error: "Not found" };
  }

  await db
    .insert(isletStars)
    .values({ userId: session.user.id, isletId })
    .onConflictDoNothing({ target: [isletStars.userId, isletStars.isletId] });

  const starCount = await starCountForIslet(isletId);
  return { ok: true, starred: true, starCount };
}

export async function unstarIslet(isletIdRaw: string): Promise<IsletStarActionResult> {
  const parsed = isletIdSchema.safeParse(isletIdRaw);
  if (!parsed.success) {
    return { ok: false, error: "Not found" };
  }
  const isletId = parsed.data;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user.id) {
    return { ok: false, error: "Unauthorized" };
  }

  const ctx = await loadIsletAccessContext(isletId);
  if (!ctx) {
    return { ok: false, error: "Not found" };
  }

  const canAccess = canAccessPulledIslet({
    isOwner: session.user.id === ctx.deviceOwnerId,
    deviceVisibility: ctx.deviceVisibility,
    isletVisibility: ctx.isletVisibility,
  });
  if (!canAccess) {
    return { ok: false, error: "Not found" };
  }

  await db
    .delete(isletStars)
    .where(and(eq(isletStars.userId, session.user.id), eq(isletStars.isletId, isletId)));

  const starCount = await starCountForIslet(isletId);
  return { ok: true, starred: false, starCount };
}
