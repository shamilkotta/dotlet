import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseRequiredDeviceTarget } from "@/lib/core/device-target";
import { badRequest } from "@/lib/core/http";
import { splitDirAndFile } from "@/lib/core/path";
import { db } from "@/lib/db/client";
import { devices, isletRevisions, islets, user } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage/provider";

export const dynamic = "force-dynamic";

function attachmentContentDisposition(fileName: string): string {
  const trimmed = fileName.trim() || "file";
  const asciiFallback =
    trimmed
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/"/g, "\\")
      .slice(0, 180) || "file";
  const encoded = encodeURIComponent(trimmed);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const { searchParams } = new URL(request.url);
    const deviceRaw = searchParams.get("device")?.trim() ?? "";
    const isletPath = searchParams.get("n")?.trim() ?? "";
    const version = searchParams.get("v")?.trim() || null;

    if (!deviceRaw || !isletPath) {
      return badRequest("device and n query parameters are required");
    }

    let deviceTarget: { username: string; device: string };
    try {
      deviceTarget = parseRequiredDeviceTarget(deviceRaw);
    } catch {
      return badRequest("Device must be in format username/device");
    }

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
      .where(and(eq(user.username, deviceTarget.username), eq(devices.name, deviceTarget.device)))
      .limit(1);

    if (!target) {
      return badRequest("Not found", 404);
    }

    const canViewPrivate = session?.user.id === target.userId;
    if (!canViewPrivate && target.visibility !== "public") {
      return badRequest("Not found", 404);
    }

    const [isletRow] = await db
      .select({
        id: islets.id,
        path: islets.path,
        visibility: islets.visibility,
        currentRevisionId: islets.currentRevisionId,
      })
      .from(islets)
      .where(and(eq(islets.deviceId, target.deviceId), eq(islets.path, isletPath)))
      .limit(1);

    if (!isletRow) {
      return badRequest("Not found", 404);
    }
    if (isletRow.visibility === "private" && !canViewPrivate) {
      return badRequest("Not found", 404);
    }
    if (!isletRow.currentRevisionId) {
      return badRequest("Not found", 404);
    }

    const revisionIdWanted = version ?? isletRow.currentRevisionId;

    const [revision] = await db
      .select({
        id: isletRevisions.id,
        storageKey: isletRevisions.storageKey,
      })
      .from(isletRevisions)
      .where(and(eq(isletRevisions.id, revisionIdWanted), eq(isletRevisions.isletId, isletRow.id)))
      .limit(1);

    if (!revision) {
      return badRequest("Not found", 404);
    }

    const { fileName: displayName } = splitDirAndFile(isletRow.path);
    const downloadName = displayName || isletRow.path.split("/").pop() || "file";

    const storage = getStorageProvider();
    const url = await storage.presignGetUrl(revision.storageKey, {
      responseContentDisposition: attachmentContentDisposition(downloadName),
    });

    return NextResponse.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return badRequest(message);
  }
}
