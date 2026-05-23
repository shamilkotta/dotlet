import { and, eq, inArray, sql } from "drizzle-orm";
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

const MAX_CONTENT_BYTES = 1024 * 1024; // TODO: update max size
const MAX_FILES_PER_PUSH = 512;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;
const HASH_HEX_LENGTH = 64;

class ClientInputError extends Error {}
class PushConflictError extends Error {}

type ChangedFile = {
  path: string;
  contentHash: string;
  size: number;
};

type CreatedRevision = {
  path: string;
  revisionId: string;
  isletId: string;
  previousRevisionId: string | null;
  contentHash: string;
};

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
      .select({
        id: islets.id,
        deviceId: islets.deviceId,
        path: islets.path,
        visibility: islets.visibility,
        currentRevisionId: islets.currentRevisionId,
        createdAt: islets.createdAt,
        updatedAt: islets.updatedAt,
        currentContentHash: isletRevisions.contentHash,
      })
      .from(islets)
      .leftJoin(isletRevisions, eq(islets.currentRevisionId, isletRevisions.id))
      .where(and(eq(islets.deviceId, device.id), inArray(islets.path, paths)));

    const isletByPath = new Map(existingIslets.map((row) => [row.path, row]));

    const unchanged: { path: string }[] = [];
    const changed: ChangedFile[] = [];

    for (const [path, meta] of fileByPath) {
      const currentHash = isletByPath.get(path)?.currentContentHash ?? null;
      if (currentHash === meta.contentHash) {
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
      const missingIslets = changed.filter((file) => !isletByPath.has(file.path));
      if (missingIslets.length > 0) {
        await tx
          .insert(islets)
          .values(
            missingIslets.map((file) => ({
              deviceId: device.id,
              path: file.path,
              visibility: payload.visibility ?? "private",
            })),
          )
          .onConflictDoNothing();
      }

      const touchedIslets = await tx
        .select()
        .from(islets)
        .where(
          and(
            eq(islets.deviceId, device.id),
            inArray(
              islets.path,
              changed.map((file) => file.path),
            ),
          ),
        );

      const touchedIsletByPath = new Map(touchedIslets.map((row) => [row.path, row]));

      const revisionRows: CreatedRevision[] = [];
      const now = Date.now();
      for (const file of changed) {
        const isletRow = touchedIsletByPath.get(file.path);

        if (!isletRow) {
          throw new PushConflictError(`Could not resolve islet for path: ${file.path}`);
        }

        const revisionId = generateRevisionId({
          isletId: isletRow.id,
          parentRevisionId: isletRow.currentRevisionId ?? null,
          contentHash: file.contentHash,
          timestamp: now,
        });

        revisionRows.push({
          path: file.path,
          revisionId,
          isletId: isletRow.id,
          previousRevisionId: isletRow.currentRevisionId ?? null,
          contentHash: file.contentHash,
        });
      }

      if (payload.visibility !== undefined) {
        const isletsNeedingVisibilityUpdate = touchedIslets.filter(
          (row) => row.visibility !== payload.visibility,
        );
        if (isletsNeedingVisibilityUpdate.length > 0) {
          await tx
            .update(islets)
            .set({ visibility: payload.visibility })
            .where(
              inArray(
                islets.id,
                isletsNeedingVisibilityUpdate.map((row) => row.id),
              ),
            );
        }
      }

      await tx.insert(isletRevisions).values(
        revisionRows.map((row) => ({
          id: row.revisionId,
          isletId: row.isletId,
          parentRevisionId: row.previousRevisionId,
          contentHash: row.contentHash,
          storageKey: row.contentHash,
          message: payload.message ?? null,
        })),
      );

      const updateValues = sql.join(
        revisionRows.map(
          (row) =>
            sql`(${row.isletId}::uuid, ${row.previousRevisionId}::varchar, ${row.revisionId}::varchar)`,
        ),
        sql`, `,
      );
      const updateResult = await tx.execute<{ id: string }>(sql`
        UPDATE "islets" AS i
        SET
          "current_revision_id" = updates.revision_id,
          "updated_at" = NOW()
        FROM (VALUES ${updateValues}) AS updates(id, previous_revision_id, revision_id)
        WHERE i."id" = updates.id
          AND i."current_revision_id" IS NOT DISTINCT FROM updates.previous_revision_id
        RETURNING i."id"
      `);

      if (updateResult.rows.length !== revisionRows.length) {
        throw new PushConflictError("Push conflict detected");
      }

      created.push(...revisionRows.map((row) => ({ path: row.path, revisionId: row.revisionId })));
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
