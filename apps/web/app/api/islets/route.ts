import { and, asc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseOptionalDeviceTarget } from "@/lib/core/device-target";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import { devices, islets, user } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const requestedDeviceName = searchParams.get("device");
    const target = parseOptionalDeviceTarget(requestedDeviceName);

    if (!target.device) {
      return badRequest("device query parameter is required");
    }

    const [device] =
      target.username === null
        ? await db
            .select({
              id: devices.id,
              name: devices.name,
              userId: devices.userId,
              visibility: devices.visibility,
            })
            .from(devices)
            .where(
              and(
                eq(devices.userId, session.user.id),
                sql`lower(${devices.name}) = ${target.device.toLowerCase()}`,
              ),
            )
            .limit(1)
        : await db
            .select({
              id: devices.id,
              name: devices.name,
              userId: devices.userId,
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

    const isOwner = session.user.id === device.userId;
    if (!isOwner && device.visibility !== "public") {
      return badRequest("Device not found", 404);
    }

    const rows = await db
      .select({
        path: islets.path,
        visibility: islets.visibility,
        updatedAt: islets.updatedAt,
      })
      .from(islets)
      .where(
        and(eq(islets.deviceId, device.id), isOwner ? undefined : eq(islets.visibility, "public")),
      )
      .orderBy(asc(islets.path));

    return ok({
      device: target.username === null ? device.name : `${target.username}/${device.name}`,
      islets: rows.map((row) => ({
        path: row.path,
        visibility: row.visibility,
        updatedAt: row.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return badRequest(message);
  }
}
