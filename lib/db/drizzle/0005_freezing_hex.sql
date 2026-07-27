CREATE TABLE "file_retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"retention_days" integer NOT NULL,
	"personal_info_retention_days" integer NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "file_retention_policies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
INSERT INTO "file_retention_policies" (
	"code",
	"name",
	"retention_days",
	"personal_info_retention_days",
	"is_default",
	"is_active"
) VALUES (
	'DEFAULT_EVIDENCE',
	'기본 증빙파일 보존정책',
	1825,
	1095,
	true,
	true
) ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "stored_files" ADD COLUMN "retention_policy_id" uuid;--> statement-breakpoint
ALTER TABLE "stored_files" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stored_files" ADD COLUMN "legal_hold_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stored_files" ADD COLUMN "purge_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stored_files" ADD COLUMN "purged_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "file_retention_policy_active_idx" ON "file_retention_policies" USING btree ("is_active","is_default");--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_retention_policy_id_file_retention_policies_id_fk" FOREIGN KEY ("retention_policy_id") REFERENCES "public"."file_retention_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stored_file_retention_idx" ON "stored_files" USING btree ("expires_at","deleted_at");
