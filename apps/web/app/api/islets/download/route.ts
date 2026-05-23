import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { parseRequiredDeviceTarget } from "@/lib/core/device-target";
import { badRequest } from "@/lib/core/http";
import { splitDirAndFile } from "@/lib/core/path";
import { db } from "@/lib/db/client";
import { devices, isletRevisions, islets, user } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage/provider";

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

    const { searchParams } = new URL(request.url);
    const deviceRaw = (searchParams.get("d") ?? searchParams.get("device"))?.trim() ?? "";
    const isletPath = searchParams.get("n")?.trim() ?? "";
    const version = searchParams.get("v")?.trim() || null;

    if (!deviceRaw || !isletPath) {
      return badRequest("Device and islet are required");
    }

    let deviceTarget: { username: string; device: string };
    try {
      deviceTarget = parseRequiredDeviceTarget(deviceRaw);
    } catch {
      return badRequest("Invalid device target");
    }

    const [target] = await db
      .select({
        isletPath: islets.path,
        storageKey: isletRevisions.storageKey,
      })
      .from(user)
      .innerJoin(devices, eq(devices.userId, user.id))
      .innerJoin(islets, eq(islets.deviceId, devices.id))
      .innerJoin(isletRevisions, revisionJoin(version))
      .where(
        and(
          eq(user.username, deviceTarget.username),
          eq(devices.name, deviceTarget.device),
          eq(islets.path, isletPath),
          sql`(${devices.userId} = ${session?.user.id ?? null} OR (${devices.visibility} = 'public' AND ${islets.visibility} = 'public'))`,
        ),
      )
      .limit(1);

    if (!target) {
      return badRequest("Not found", 404);
    }

    const { fileName: displayName } = splitDirAndFile(target.isletPath);
    const downloadName = displayName || target.isletPath.split("/").pop() || "file";

    const storage = getStorageProvider();
    const url = await storage.presignGetUrl(target.storageKey, {
      responseContentDisposition: attachmentContentDisposition(downloadName),
    });

    return NextResponse.redirect(url, 302);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return badRequest(message);
  }
}
