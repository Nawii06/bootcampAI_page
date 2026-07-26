CREATE TABLE "performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer_summary" text NOT NULL,
	"limitations" text,
	"improvement_plan" text NOT NULL,
	"linked_indicator_ids" uuid[] DEFAULT '{}' NOT NULL,
	"linked_evidence_ids" uuid[] DEFAULT '{}' NOT NULL,
	"status" "publication_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_reviews" ADD CONSTRAINT "performance_reviews_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "performance_review_year_idx" ON "performance_reviews" USING btree ("business_year_id","created_at");