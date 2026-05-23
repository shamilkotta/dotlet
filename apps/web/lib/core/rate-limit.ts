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

  const result = await db.execute<{ allowed: boolean }>(sql`
    INSERT INTO "rate_limit" ("id", "key", "count", "last_request")
    VALUES (gen_random_uuid(), ${key}, 1, ${nowMs})
    ON CONFLICT ("key") DO UPDATE
    SET
      "count" = CASE
        WHEN ${nowMs} - "rate_limit"."last_request" > ${windowMs} THEN 1
        WHEN "rate_limit"."count" >= ${max} THEN "rate_limit"."count"
        ELSE "rate_limit"."count" + 1
      END,
      "last_request" = CASE
        WHEN ${nowMs} - "rate_limit"."last_request" > ${windowMs} THEN ${nowMs}
        WHEN "rate_limit"."count" >= ${max} THEN "rate_limit"."last_request"
        ELSE ${nowMs}
      END
    RETURNING "last_request" = ${nowMs} AS "allowed"
  `);

  return Boolean(result.rows[0]?.allowed);
}
