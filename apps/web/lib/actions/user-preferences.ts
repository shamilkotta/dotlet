"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";

export async function setIsletsFlatView(flatRaw: boolean): Promise<void> {
  const flat = z.boolean().parse(flatRaw);
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user.id) return;

  await db
    .insert(userPreferences)
    .values({ userId: session.user.id, isletsFlatView: flat })
    .onConflictDoUpdate({
      target: userPreferences.userId,
      set: { isletsFlatView: flat },
    });
}
