import { and, eq, inArray, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { badRequest, ok, unauthorized } from "@/lib/core/http";
import { logEvent } from "@/lib/core/log";
import { checkRateLimit } from "@/lib/core/rate-limit";
import { generateRevisionId } from "@/lib/core/revision";
import { devices, isletRevisions, islets } from "@/lib/db/schema";
import { resolveMissingFileUploads } from "./integrity";
import { getStorageProvider } from "@/lib/storage/provider";

export const dynamic = "force-dynamic";

const MAX_CONTENT_BYTES = 1024 * 1024; // TODO: update max size
const MAX_FILES_PER_PUSH = 512;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const HASH_HEX_LENGTH = 64;

class ClientInputError extends Error {}
class PushConflictError extends Error {}

const FileEntry = z.object({
  path: z.string(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  size: z.number().int().nonnegative().max(MAX_CONTENT_BYTES),
});

const Body = z.object({
  device: z.string("Device name is required").trim().min(1).max(64),
  message: z.string().max(512).optional(),
  visibility: z.enum(["public", "private"]).optional(),
  files: z.array(FileEntry).min(1).max(MAX_FILES_PER_PUSH),
});

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return unauthorized();
    }
    const limiterKey = `push:${session.user.id}`;
    if (!(await checkRateLimit(limiterKey, 60, 60_000))) {
      return badRequest("Rate limit exceeded", 429);
    }
    const payload = Body.parse(await request.json());

    const fileByPath = new Map<string, { contentHash: string; size: number }>();
    let totalBytes = 0;
    for (const file of payload.files) {
      const filePath = file.path;
      if (file.contentHash.length !== HASH_HEX_LENGTH) {
        throw new ClientInputError("Invalid content hash");
      }
      if (fileByPath.has(filePath)) {
        throw new ClientInputError(`Duplicate file path after normalization: ${filePath}`);
      }

      fileByPath.set(filePath, {
        contentHash: file.contentHash,
        size: file.size,
      });
      totalBytes += file.size;
    }

    // TODO: remove this
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new ClientInputError(`Push payload exceeds ${MAX_TOTAL_BYTES} bytes across all files`);
    }

    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.userId, session.user.id), eq(devices.name, payload.device)))
      .limit(1);
    if (!device) {
      return badRequest("Device not found", 404);
    }

    const paths = [...fileByPath.keys()];
    const existingIslets = await db
      .select()
      .from(islets)
      .where(and(eq(islets.deviceId, device.id), inArray(islets.path, paths)));

    const isletByPath = new Map(existingIslets.map((row) => [row.path, row]));

    const revisionIds = [...isletByPath.values()]
      .map((i) => i.currentRevisionId)
      .filter((id): id is string => Boolean(id));

    const revisionRows =
      revisionIds.length > 0
        ? await db.select().from(isletRevisions).where(inArray(isletRevisions.id, revisionIds))
        : [];

    const revisionById = new Map(revisionRows.map((r) => [r.id, r]));

    function currentHashForPath(p: string): string | null {
      const islet = isletByPath.get(p);
      if (!islet?.currentRevisionId) {
        return null;
      }
      return revisionById.get(islet.currentRevisionId)?.contentHash ?? null;
    }

    const unchanged: { path: string }[] = [];
    const changed: Array<{ path: string; contentHash: string; size: number }> = [];

    for (const [path, meta] of fileByPath) {
      const cur = currentHashForPath(path);
      if (cur === meta.contentHash) {
        unchanged.push({ path });
      } else {
        changed.push({ path, contentHash: meta.contentHash, size: meta.size });
      }
    }

    if (changed.length === 0) {
      return ok({
        status: "ok" as const,
        created: [] as Array<{ path: string; revisionId: string }>,
        unchanged: unchanged.map((u) => u.path),
      });
    }

    const storage = getStorageProvider();
    const missingFiles = await resolveMissingFileUploads(changed, storage);

    if (missingFiles.length > 0) {
      return ok({
        status: "missing_files" as const,
        missingFiles,
        unchanged: unchanged.map((u) => u.path),
      });
    }

    const created: Array<{ path: string; revisionId: string }> = [];

    await db.transaction(async (tx) => {
      for (const c of changed) {
        let [isletRow] = await tx
          .select()
          .from(islets)
          .where(and(eq(islets.deviceId, device.id), eq(islets.path, c.path)))
          .limit(1);

        if (!isletRow) {
          await tx
            .insert(islets)
            .values({
              deviceId: device.id,
              path: c.path,
              visibility: payload.visibility ?? "private",
            })
            .onConflictDoNothing();

          [isletRow] = await tx
            .select()
            .from(islets)
            .where(and(eq(islets.deviceId, device.id), eq(islets.path, c.path)))
            .limit(1);
        }

        if (!isletRow) {
          throw new PushConflictError(`Could not resolve islet for path: ${c.path}`);
        }

        let currentRevisionHash: string | null = null;
        if (isletRow.currentRevisionId) {
          const [currentRevision] = await tx
            .select({ contentHash: isletRevisions.contentHash })
            .from(isletRevisions)
            .where(eq(isletRevisions.id, isletRow.currentRevisionId))
            .limit(1);
          currentRevisionHash = currentRevision?.contentHash ?? null;
        }

        if (currentRevisionHash === c.contentHash) {
          unchanged.push({ path: c.path });
          continue;
        }

        if (payload.visibility !== undefined && payload.visibility !== isletRow.visibility) {
          const [visibilityUpdated] = await tx
            .update(islets)
            .set({ visibility: payload.visibility })
            .where(eq(islets.id, isletRow.id))
            .returning();
          if (visibilityUpdated) {
            isletRow = visibilityUpdated;
          }
        }

        const revisionId = generateRevisionId({
          isletId: isletRow.id,
          parentRevisionId: isletRow.currentRevisionId ?? null,
          contentHash: c.contentHash,
          timestamp: Date.now(),
        });

        await tx.insert(isletRevisions).values({
          id: revisionId,
          isletId: isletRow.id,
          parentRevisionId: isletRow.currentRevisionId ?? null,
          contentHash: c.contentHash,
          storageKey: c.contentHash,
          message: payload.message ?? null,
        });

        const updateResult = await tx
          .update(islets)
          .set({
            currentRevisionId: revisionId,
            updatedAt: new Date(),
          })
          .where(
            isletRow.currentRevisionId
              ? and(
                  eq(islets.id, isletRow.id),
                  eq(islets.currentRevisionId, isletRow.currentRevisionId),
                )
              : and(eq(islets.id, isletRow.id), isNull(islets.currentRevisionId)),
          )
          .returning({ id: islets.id });

        if (updateResult.length === 0) {
          throw new PushConflictError(`Push conflict for path: ${c.path}`);
        }

        isletByPath.set(c.path, {
          ...isletRow,
          currentRevisionId: revisionId,
        });

        created.push({ path: c.path, revisionId });
      }
    });

    logEvent("islet_push", {
      userId: session.user.id,
      device: payload.device,
      paths: created.map((c) => c.path),
      revisionIds: created.map((c) => c.revisionId),
    });

    return ok({
      status: "ok" as const,
      created,
      unchanged: [...new Set(unchanged.map((u) => u.path))],
    });
  } catch (error) {
    if (error instanceof PushConflictError) {
      return badRequest("Push conflict detected. Please retry.", 409);
    }
    if (error instanceof ClientInputError) {
      return badRequest(error.message);
    }
    if (error instanceof z.ZodError) {
      return badRequest("Invalid request payload");
    }
    if (error instanceof Error) {
      const knownClientErrors = new Set(["Path is required", "Path traversal is blocked"]);
      if (knownClientErrors.has(error.message)) {
        return badRequest(error.message);
      }
    }
    console.error(error);
    return badRequest("Internal server error", 500);
  }
}
