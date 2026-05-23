import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import { devices, isletRevisions, islets, user } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage/provider";
import { parsePullDeviceTarget } from "./access";

type PulledIslet = {
  id: string;
  path: string;
  visibility: "public" | "private";
  currentRevisionId: string | null;
  storageKey: string;
};

function revisionJoin(version: string | null) {
  return version
    ? and(eq(isletRevisions.isletId, islets.id), eq(isletRevisions.id, version))
    : and(eq(isletRevisions.isletId, islets.id), eq(isletRevisions.id, islets.currentRevisionId));
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const target = parsePullDeviceTarget(searchParams.get("d") ?? searchParams.get("device"));
    const islet = (searchParams.get("n") ?? searchParams.get("islet"))?.trim() ?? "";
    const version = searchParams.get("v")?.trim() || null;
    if (!islet?.trim()) {
      return badRequest("Islet is required");
    }

    const exactIslets = await db
      .select({
        id: islets.id,
        path: islets.path,
        visibility: islets.visibility,
        currentRevisionId: islets.currentRevisionId,
        storageKey: isletRevisions.storageKey,
      })
      .from(devices)
      .innerJoin(user, eq(devices.userId, user.id))
      .innerJoin(islets, eq(islets.deviceId, devices.id))
      .innerJoin(isletRevisions, revisionJoin(version))
      .where(
        and(
          sql`lower(${user.username}) = ${target.username.toLowerCase()}`,
          sql`lower(${devices.name}) = ${target.device.toLowerCase()}`,
          eq(islets.path, islet),
          sql`(${devices.userId} = ${session.user.id} OR (${devices.visibility} = 'public' AND ${islets.visibility} = 'public'))`,
        ),
      )
      .limit(1);

    let matchedIslets: PulledIslet[] = exactIslets;

    if (matchedIslets.length === 0) {
      const folderPrefix = islet.replace(/\/+$/, "") + "/";
      matchedIslets = await db
        .select({
          id: islets.id,
          path: islets.path,
          visibility: islets.visibility,
          currentRevisionId: islets.currentRevisionId,
          storageKey: isletRevisions.storageKey,
        })
        .from(devices)
        .innerJoin(user, eq(devices.userId, user.id))
        .innerJoin(islets, eq(islets.deviceId, devices.id))
        .innerJoin(isletRevisions, revisionJoin(version))
        .where(
          and(
            sql`lower(${user.username}) = ${target.username.toLowerCase()}`,
            sql`lower(${devices.name}) = ${target.device.toLowerCase()}`,
            sql`left(${islets.path}, ${folderPrefix.length}) = ${folderPrefix}`,
            sql`(${devices.userId} = ${session.user.id} OR (${devices.visibility} = 'public' AND ${islets.visibility} = 'public'))`,
          ),
        );
    }

    if (matchedIslets.length === 0) {
      return badRequest("Islet not found", 404);
    }

    const files: Array<{ path: string; downloadUrl: string }> = [];
    const storage = getStorageProvider();

    for (const isletRow of matchedIslets) {
      files.push({
        path: isletRow.path,
        downloadUrl: await storage.presignGetUrl(isletRow.storageKey),
      });
    }

    if (files.length === 0) {
      return badRequest("Islet not found", 404);
    }

    return ok({
      files,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return badRequest(message);
  }
}
