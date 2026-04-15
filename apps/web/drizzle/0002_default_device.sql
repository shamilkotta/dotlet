ALTER TABLE "devices" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "devices" AS d
SET "is_default" = true
FROM (
  SELECT DISTINCT ON ("user_id") "id", "user_id"
  FROM "devices"
  ORDER BY "user_id", ("name" = 'personal') DESC, "created_at" ASC
) AS selected
WHERE d."id" = selected."id";--> statement-breakpoint
