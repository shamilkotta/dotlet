import { and, eq, ne, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import {
  DEVICE_NAME_MAX_LENGTH,
  DEVICE_NAME_MIN_LENGTH,
  DEVICE_NAME_REGEX,
  isValidDeviceName,
} from "@/lib/core/username";
import { devices, user, visibilityEnum } from "@/lib/db/schema";

const DeviceNameSchema = z
  .string()
  .min(DEVICE_NAME_MIN_LENGTH)
  .max(DEVICE_NAME_MAX_LENGTH)
  .regex(DEVICE_NAME_REGEX)
  .refine((value) => isValidDeviceName(value), { message: "Invalid device name" });

const VisibilitySchema = z.enum(visibilityEnum.enumValues);

const CreateBody = z.object({
  name: DeviceNameSchema,
  visibility: VisibilitySchema.optional(),
});

const PatchBody = z
  .object({
    name: DeviceNameSchema.optional(),
    visibility: VisibilitySchema.optional(),
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
    const requestedUsername = searchParams.get("u")?.trim() ?? "";

    let ownerUserId = session.user.id;
    let ownerUsername: string | null = null;
    if (requestedUsername) {
      const [targetUser] = await db
        .select({
          id: user.id,
          username: user.username,
        })
        .from(user)
        .where(sql`lower(${user.username}) = ${requestedUsername.toLowerCase()}`)
        .limit(1);
      if (!targetUser) {
        return badRequest("User not found", 404);
      }
      ownerUserId = targetUser.id;
      ownerUsername = targetUser.username;
    }

    const isOwner = ownerUserId === session.user.id;

    const rows = await db
      .select({
        id: devices.id,
        name: devices.name,
        visibility: devices.visibility,
        createdAt: devices.createdAt,
      })
      .from(devices)
      .where(
        and(
          eq(devices.userId, ownerUserId),
          isOwner ? undefined : eq(devices.visibility, "public"),
        ),
      );
    return ok({
      owner: ownerUsername,
      devices: rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to list devices";
    return badRequest(message);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }
    const payload = CreateBody.parse(await request.json());
    const normalizedName = payload.name.toLowerCase();
    const [existing] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(
        and(eq(devices.userId, session.user.id), sql`lower(${devices.name}) = ${normalizedName}`),
      )
      .limit(1);
    if (existing) {
      return badRequest("Device already exists", 409);
    }

    const [created] = await db
      .insert(devices)
      .values({
        userId: session.user.id,
        name: payload.name,
        visibility: payload.visibility ?? "private",
      })
      .returning({
        id: devices.id,
        name: devices.name,
        visibility: devices.visibility,
      });
    return ok({ device: created }, 201);
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
    const deviceName = searchParams.get("d")?.trim() ?? "";
    const parsedName = DeviceNameSchema.safeParse(deviceName);
    if (!parsedName.success) {
      return badRequest("Invalid device");
    }

    const body = PatchBody.parse(await request.json());
    const normalizedCurrent = deviceName.toLowerCase();
    const [existing] = await db
      .select({
        id: devices.id,
        name: devices.name,
        visibility: devices.visibility,
      })
      .from(devices)
      .where(
        and(
          eq(devices.userId, session.user.id),
          sql`lower(${devices.name}) = ${normalizedCurrent}`,
        ),
      )
      .limit(1);

    if (!existing) {
      return badRequest("Device not found", 404);
    }

    const nextName = body.name?.trim() ?? existing.name;
    const nextVisibility = body.visibility ?? existing.visibility;

    const nameChanged = nextName !== existing.name;
    const visibilityChanged = nextVisibility !== existing.visibility;

    if (!nameChanged && !visibilityChanged) {
      return ok({
        device: { name: existing.name, visibility: existing.visibility },
        changed: false,
      });
    }

    if (nameChanged) {
      const normalizedNext = nextName.toLowerCase();
      const [nameTaken] = await db
        .select({ id: devices.id })
        .from(devices)
        .where(
          and(
            eq(devices.userId, session.user.id),
            sql`lower(${devices.name}) = ${normalizedNext}`,
            ne(devices.id, existing.id),
          ),
        )
        .limit(1);
      if (nameTaken) {
        return badRequest("A device with same name already exists", 409);
      }
    }

    const [updated] = await db
      .update(devices)
      .set({
        ...(nameChanged ? { name: nextName } : {}),
        ...(visibilityChanged ? { visibility: nextVisibility } : {}),
      })
      .where(eq(devices.id, existing.id))
      .returning({
        name: devices.name,
        visibility: devices.visibility,
      });

    if (!updated) {
      return badRequest("Unable to update device", 500);
    }

    return ok({ device: updated, changed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update device";
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
    const nameRaw = searchParams.get("d")?.trim() ?? "";
    const parsedName = DeviceNameSchema.safeParse(nameRaw);
    if (!parsedName.success) {
      return badRequest("Invalid device");
    }

    const normalizedName = nameRaw.toLowerCase();
    const [existing] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(
        and(eq(devices.userId, session.user.id), sql`lower(${devices.name}) = ${normalizedName}`),
      )
      .limit(1);

    if (!existing) {
      return badRequest("Device not found", 404);
    }

    await db.delete(devices).where(eq(devices.id, existing.id));
    return ok({ ok: true as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete device";
    return badRequest(message);
  }
}
