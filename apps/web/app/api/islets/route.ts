import { and, asc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { parseOptionalDeviceTarget } from "@/lib/core/device-target";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import { devices, islets, user, visibilityEnum } from "@/lib/db/schema";

const IsletPathSchema = z.string().trim().min(1).max(2048);
const PatchIsletBody = z
  .object({
    name: IsletPathSchema.optional(),
    visibility: z.enum(visibilityEnum.enumValues).optional(),
  })
  .refine((body) => body.name !== undefined || body.visibility !== undefined, {
    message: "Provide valid update fields",
  });

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const requestedDeviceName = searchParams.get("d");
    const target = parseOptionalDeviceTarget(requestedDeviceName);

    if (!target.device) {
      return badRequest("Device is required");
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

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const requestedDeviceName = searchParams.get("d");
    const pathRaw = searchParams.get("n")?.trim() ?? "";
    if (!pathRaw) {
      return badRequest("Islet is required");
    }

    const body = PatchIsletBody.parse(await request.json());

    let target: ReturnType<typeof parseOptionalDeviceTarget>;
    try {
      target = parseOptionalDeviceTarget(requestedDeviceName);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid device";
      return badRequest(message);
    }

    if (!target.device) {
      return badRequest("Device is required");
    }

    const [row] = await db
      .select({
        isletId: islets.id,
        path: islets.path,
        visibility: islets.visibility,
        deviceId: devices.id,
      })
      .from(islets)
      .innerJoin(devices, eq(islets.deviceId, devices.id))
      .where(
        and(
          eq(devices.userId, session.user.id),
          sql`lower(${devices.name}) = ${target.device.toLowerCase()}`,
          eq(islets.path, pathRaw),
        ),
      )
      .limit(1);

    if (!row) {
      return badRequest("Islet not found", 404);
    }

    const nextPath = body.name?.trim() ?? row.path;
    const nextVisibility = body.visibility ?? row.visibility;

    const pathChanged = nextPath !== row.path;
    const visibilityChanged = nextVisibility !== row.visibility;

    if (!pathChanged && !visibilityChanged) {
      return ok({
        islet: { path: row.path, visibility: row.visibility },
        changed: false,
      });
    }

    if (pathChanged) {
      const [pathTaken] = await db
        .select({ id: islets.id })
        .from(islets)
        .where(and(eq(islets.deviceId, row.deviceId), eq(islets.path, nextPath)))
        .limit(1);
      if (pathTaken) {
        return badRequest("An islet with that path already exists on this device", 409);
      }
    }

    const [updated] = await db
      .update(islets)
      .set({
        ...(pathChanged ? { path: nextPath } : {}),
        ...(visibilityChanged ? { visibility: nextVisibility } : {}),
      })
      .where(eq(islets.id, row.isletId))
      .returning({
        path: islets.path,
        visibility: islets.visibility,
      });

    if (!updated) {
      return badRequest("Unable to update islet", 500);
    }

    return ok({ islet: updated, changed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return badRequest(message);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const requestedDeviceName = searchParams.get("d");
    const isletName = searchParams.get("n")?.trim() ?? "";
    if (!isletName) {
      return badRequest("Islet is required");
    }

    let target: ReturnType<typeof parseOptionalDeviceTarget>;
    try {
      target = parseOptionalDeviceTarget(requestedDeviceName);
    } catch (parseError) {
      const message = parseError instanceof Error ? parseError.message : "Invalid device";
      return badRequest(message);
    }

    if (!target.device) {
      return badRequest("Device is required");
    }

    const [device] = await db
      .select({
        id: devices.id,
        name: devices.name,
      })
      .from(devices)
      .where(
        and(
          eq(devices.userId, session.user.id),
          sql`lower(${devices.name}) = ${target.device.toLowerCase()}`,
        ),
      )
      .limit(1);

    if (!device) {
      return badRequest("Islet not found", 404);
    }

    const removed = await db
      .delete(islets)
      .where(and(eq(islets.deviceId, device.id), eq(islets.path, isletName)))
      .returning({ id: islets.id });

    if (removed.length === 0) {
      return badRequest("Islet not found", 404);
    }

    return ok({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return badRequest(message);
  }
}
