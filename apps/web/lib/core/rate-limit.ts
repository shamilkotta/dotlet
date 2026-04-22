import { sql } from "drizzle-orm";
import { db } from "../db/client";

export function decideRateLimit(
  existing: { count: number; lastRequest: number } | null,
  max: number,
  windowMs: number,
  nowMs = Date.now(),
) {
  if (!existing || nowMs - existing.lastRequest > windowMs) {
    return {
      allowed: true,
      count: 1,
      lastRequest: nowMs,
    };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      count: existing.count,
      lastRequest: existing.lastRequest,
    };
  }

  return {
    allowed: true,
    count: existing.count + 1,
    lastRequest: nowMs,
  };
}

export async function checkRateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const nowMs = Date.now();

  return db.transaction(async (tx) => {
    const inserted = await tx.execute<{ key: string }>(
      sql`
        INSERT INTO "rate_limit" ("id", "key", "count", "last_request")
        VALUES (gen_random_uuid(), ${key}, 1, ${nowMs})
        ON CONFLICT ("key") DO NOTHING
        RETURNING "key"
      `,
    );

    if (inserted.rows.length > 0) {
      return true;
    }

    const result = await tx.execute<{ count: number; last_request: string | number }>(
      sql`SELECT "count", "last_request" FROM "rate_limit" WHERE "key" = ${key} FOR UPDATE`,
    );

    const existingRow = result.rows[0];
    const lastRequest = existingRow ? Number(existingRow.last_request) : nowMs;
    const decision = decideRateLimit(
      existingRow
        ? {
            count: Number(existingRow.count),
            lastRequest,
          }
        : null,
      max,
      windowMs,
      nowMs,
    );

    await tx.execute(
      sql`
        INSERT INTO "rate_limit" ("id", "key", "count", "last_request")
        VALUES (gen_random_uuid(), ${key}, ${decision.count}, ${decision.lastRequest})
        ON CONFLICT ("key") DO UPDATE
        SET
          "count" = EXCLUDED."count",
          "last_request" = EXCLUDED."last_request"
      `,
    );

    return decision.allowed;
  });
}
