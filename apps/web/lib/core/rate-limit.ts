import { sql } from "drizzle-orm";
import { db } from "../db/client";

export function decideRateLimit(
  existing: { count: number; resetAt: Date } | null,
  max: number,
  windowMs: number,
  now = new Date(),
) {
  const nextResetAt = new Date(now.getTime() + windowMs);

  if (!existing || existing.resetAt <= now) {
    return {
      allowed: true,
      count: 1,
      resetAt: nextResetAt,
    };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      count: existing.count,
      resetAt: existing.resetAt,
    };
  }

  return {
    allowed: true,
    count: existing.count + 1,
    resetAt: existing.resetAt,
  };
}

export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = new Date();
  const initialResetAt = new Date(now.getTime() + windowMs);

  return db.transaction(async (tx) => {
    const inserted = await tx.execute<{ key: string }>(
      sql`
        INSERT INTO "rate_limits" ("key", "count", "reset_at", "updated_at")
        VALUES (${key}, 1, ${initialResetAt}, ${now})
        ON CONFLICT ("key") DO NOTHING
        RETURNING "key"
      `,
    );

    if (inserted.rows.length > 0) {
      return true;
    }

    const result = await tx.execute<{ count: number; reset_at: Date | string }>(
      sql`SELECT "count", "reset_at" FROM "rate_limits" WHERE "key" = ${key} FOR UPDATE`,
    );

    const existingRow = result.rows[0];
    const decision = decideRateLimit(
      existingRow
        ? {
            count: Number(existingRow.count),
            resetAt:
              existingRow.reset_at instanceof Date
                ? existingRow.reset_at
                : new Date(existingRow.reset_at),
          }
        : null,
      max,
      windowMs,
      now,
    );

    await tx.execute(
      sql`
        INSERT INTO "rate_limits" ("key", "count", "reset_at", "updated_at")
        VALUES (${key}, ${decision.count}, ${decision.resetAt}, ${now})
        ON CONFLICT ("key") DO UPDATE
        SET
          "count" = EXCLUDED."count",
          "reset_at" = EXCLUDED."reset_at",
          "updated_at" = EXCLUDED."updated_at"
      `,
    );

    return decision.allowed;
  });
}
