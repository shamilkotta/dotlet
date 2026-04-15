import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import { devices, isletRevisions, islets, user } from "@/lib/db/schema";
import { getStorageProvider } from "@/lib/storage/provider";
import { parsePullDeviceTarget } from "./access";

export const dynamic = "force-dynamic";

type PulledIslet = {
  id: string;
  path: string;
  visibility: "public" | "private";
  currentRevisionId: string | null;
};

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const target = parsePullDeviceTarget(searchParams.get("device"));
    const islet = searchParams.get("islet")?.trim() ?? "";
    const version = searchParams.get("v")?.trim() || null;
    if (!islet?.trim()) {
      return badRequest("islet query parameter is required");
    }

    const [device] = await db
      .select({
        id: devices.id,
        userId: devices.userId,
        name: devices.name,
        visibility: devices.visibility,
      })
      .from(devices)
      .innerJoin(user, eq(devices.userId, user.id))
      .where(
        and(
          sql`lower(${user.username}) = ${target.username.toLowerCase()}`,
          sql`lower(${devices.name}) = ${target.device.toLowerCase()}`,
        ),
      )
      .limit(1);

    if (!device) {
      return badRequest("Device not found", 404);
    }

    const isOwner = device.userId === session.user.id;
    if (!isOwner && device.visibility !== "public") {
      return badRequest("Islet not found", 404);
    }

    const exactIslets = await db
      .select({
        id: islets.id,
        path: islets.path,
        visibility: islets.visibility,
        currentRevisionId: islets.currentRevisionId,
      })
      .from(islets)
      .where(
        and(
          eq(islets.deviceId, device.id),
          eq(islets.path, islet),
          isOwner ? undefined : eq(islets.visibility, "public"),
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
        })
        .from(islets)
        .where(
          and(
            eq(islets.deviceId, device.id),
            sql`left(${islets.path}, ${folderPrefix.length}) = ${folderPrefix}`,
            isOwner ? undefined : eq(islets.visibility, "public"),
          ),
        );
    }

    if (matchedIslets.length === 0) {
      return badRequest("Islet not found", 404);
    }

    const revisionIds = matchedIslets
      .map((isletRow) => isletRow.currentRevisionId)
      .filter((revisionId): revisionId is string => Boolean(revisionId));

    if (revisionIds.length === 0) {
      return badRequest("Islet not found", 404);
    }

    const revisions = await db
      .select()
      .from(isletRevisions)
      .where(and(inArray(isletRevisions.id, version ? [version] : revisionIds)));

    const revisionById = new Map(revisions.map((revision) => [revision.id, revision]));

    const files: Array<{ path: string; downloadUrl: string }> = [];
    const storage = getStorageProvider();

    for (const isletRow of matchedIslets) {
      const revisionId = version ?? isletRow.currentRevisionId!;
      const revision = revisionById.get(revisionId);
      if (!revision) {
        return badRequest("Islet not found", 404);
      }

      files.push({
        path: isletRow.path,
        downloadUrl: await storage.presignGetUrl(revision.storageKey),
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
