CREATE TABLE "islet_stars" (
	"user_id" text NOT NULL,
	"islet_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "islet_stars_user_islet_unique" UNIQUE("user_id","islet_id")
);
--> statement-breakpoint
ALTER TABLE "islet_stars" ADD CONSTRAINT "islet_stars_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "islet_stars" ADD CONSTRAINT "islet_stars_islet_id_islets_id_fk" FOREIGN KEY ("islet_id") REFERENCES "public"."islets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "islet_stars_islet_id_idx" ON "islet_stars" USING btree ("islet_id");