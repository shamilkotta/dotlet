import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_REGEX,
  isValidUsername,
} from "@/lib/core/username";
import { devices, user, visibilityEnum } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const DeviceNameSchema = z
  .string()
  .min(USERNAME_MIN_LENGTH)
  .max(USERNAME_MAX_LENGTH)
  .regex(USERNAME_REGEX)
  .refine((value) => isValidUsername(value), { message: "Invalid device name" });

const VisibilitySchema = z.enum(visibilityEnum.enumValues);

const CreateBody = z.object({
  name: DeviceNameSchema,
  visibility: VisibilitySchema.optional(),
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
    const requestedUsername = searchParams.get("username")?.trim() ?? "";

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
