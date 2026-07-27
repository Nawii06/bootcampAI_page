CREATE TYPE "public"."comparison_operator" AS ENUM('GTE', 'LTE', 'EQ', 'IN');--> statement-breakpoint
CREATE TYPE "public"."import_row_status" AS ENUM('PENDING', 'VALID', 'INVALID', 'INSERT', 'UPDATE', 'UNCHANGED', 'COMMITTED');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('UPLOADED', 'STAGED', 'VALIDATED', 'PREVIEWED', 'COMMITTED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."requirement_type" AS ENUM('TOTAL_CREDITS', 'REQUIRED_COURSE', 'TRACK_CREDITS', 'EXTRACURRICULAR_HOURS', 'PROJECT', 'FIELD_PRACTICE', 'INTERNSHIP');--> statement-breakpoint
CREATE TYPE "public"."role_code" AS ENUM('PUBLIC', 'STUDENT', 'COMPANY_APPLICANT', 'COMPANY_MANAGER', 'EDUCATION_STAFF', 'BENEFIT_STAFF', 'COMPANY_STAFF', 'BUDGET_STAFF', 'PERFORMANCE_STAFF', 'CONTENT_EDITOR', 'REVIEWER', 'SYSTEM_ADMIN', 'AUDITOR');--> statement-breakpoint
CREATE TYPE "public"."semester_code" AS ENUM('FIRST', 'SUMMER', 'SECOND', 'WINTER');--> statement-breakpoint
CREATE TABLE "course_masters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_code" text NOT NULL,
	"name" text NOT NULL,
	"english_name" text,
	"description" text,
	"default_credits" numeric(4, 1) NOT NULL,
	"department_code" text,
	"source_system" text,
	"external_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "course_offerings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_master_id" uuid NOT NULL,
	"business_year_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"section_code" text DEFAULT '01' NOT NULL,
	"credits" numeric(4, 1) NOT NULL,
	"capacity" integer,
	"instructor_name" text,
	"track_code_id" uuid,
	"program_level_code_id" uuid,
	"source_system" text,
	"external_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "curricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"track_code_id" uuid,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "curriculum_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"requirement_type" "requirement_type" NOT NULL,
	"operator" "comparison_operator" NOT NULL,
	"required_value" numeric(12, 2),
	"unit" text,
	"course_master_id" uuid,
	"track_code_id" uuid,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "business_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "code_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "code_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"semester" "semester_code" NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"code" "role_code" PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"student_number" text NOT NULL,
	"name" text NOT NULL,
	"department_code" text NOT NULL,
	"grade" text,
	"source_system" text,
	"external_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role_code" "role_code" NOT NULL,
	"scope_type" text DEFAULT 'GLOBAL' NOT NULL,
	"scope_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"granted_by" uuid,
	CONSTRAINT "user_role_pk" PRIMARY KEY("user_id","role_code","scope_type")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login_id" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"source_system" text,
	"external_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"term_id" uuid,
	"entity_type" text NOT NULL,
	"source_system" text NOT NULL,
	"source_type" text NOT NULL,
	"file_name" text,
	"file_hash" text,
	"status" "import_status" DEFAULT 'UPLOADED' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"insert_rows" integer DEFAULT 0 NOT NULL,
	"update_rows" integer DEFAULT 0 NOT NULL,
	"unchanged_rows" integer DEFAULT 0 NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb,
	"error_summary" jsonb DEFAULT '{}'::jsonb,
	"created_by" uuid NOT NULL,
	"committed_by" uuid,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_staging_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_job_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"source_system" text NOT NULL,
	"external_id" text,
	"raw_data" jsonb NOT NULL,
	"normalized_data" jsonb DEFAULT '{}'::jsonb,
	"status" "import_row_status" DEFAULT 'PENDING' NOT NULL,
	"validation_errors" jsonb DEFAULT '[]'::jsonb,
	"preview_diff" jsonb DEFAULT '{}'::jsonb,
	"target_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_course_master_id_course_masters_id_fk" FOREIGN KEY ("course_master_id") REFERENCES "public"."course_masters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_track_code_id_code_values_id_fk" FOREIGN KEY ("track_code_id") REFERENCES "public"."code_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_program_level_code_id_code_values_id_fk" FOREIGN KEY ("program_level_code_id") REFERENCES "public"."code_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curricula" ADD CONSTRAINT "curricula_track_code_id_code_values_id_fk" FOREIGN KEY ("track_code_id") REFERENCES "public"."code_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_requirements" ADD CONSTRAINT "curriculum_requirements_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_requirements" ADD CONSTRAINT "curriculum_requirements_course_master_id_course_masters_id_fk" FOREIGN KEY ("course_master_id") REFERENCES "public"."course_masters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_requirements" ADD CONSTRAINT "curriculum_requirements_track_code_id_code_values_id_fk" FOREIGN KEY ("track_code_id") REFERENCES "public"."code_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "code_values" ADD CONSTRAINT "code_values_group_id_code_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."code_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_code_roles_code_fk" FOREIGN KEY ("role_code") REFERENCES "public"."roles"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_committed_by_users_id_fk" FOREIGN KEY ("committed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_import_job_id_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_master_code_uq" ON "course_masters" USING btree ("course_code");--> statement-breakpoint
CREATE UNIQUE INDEX "course_master_external_key_uq" ON "course_masters" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_offering_natural_uq" ON "course_offerings" USING btree ("course_master_id","term_id","section_code");--> statement-breakpoint
CREATE UNIQUE INDEX "course_offering_external_key_uq" ON "course_offerings" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE INDEX "course_offering_year_term_idx" ON "course_offerings" USING btree ("business_year_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_code_version_uq" ON "curricula" USING btree ("code","version");--> statement-breakpoint
CREATE INDEX "curriculum_year_idx" ON "curricula" USING btree ("business_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_requirement_code_uq" ON "curriculum_requirements" USING btree ("curriculum_id","code");--> statement-breakpoint
CREATE INDEX "curriculum_requirement_curriculum_idx" ON "curriculum_requirements" USING btree ("curriculum_id");--> statement-breakpoint
CREATE UNIQUE INDEX "business_year_year_uq" ON "business_years" USING btree ("year");--> statement-breakpoint
CREATE UNIQUE INDEX "code_group_code_uq" ON "code_groups" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "code_value_group_code_uq" ON "code_values" USING btree ("group_id","code");--> statement-breakpoint
CREATE INDEX "code_value_group_idx" ON "code_values" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "term_year_semester_uq" ON "terms" USING btree ("business_year_id","semester");--> statement-breakpoint
CREATE UNIQUE INDEX "student_number_uq" ON "students" USING btree ("student_number");--> statement-breakpoint
CREATE UNIQUE INDEX "student_user_uq" ON "students" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_external_key_uq" ON "students" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE INDEX "user_role_user_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_login_id_uq" ON "users" USING btree ("login_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_external_key_uq" ON "users" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_job_source_hash_uq" ON "import_jobs" USING btree ("source_system","entity_type","file_hash");--> statement-breakpoint
CREATE INDEX "import_job_status_idx" ON "import_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_job_year_term_idx" ON "import_jobs" USING btree ("business_year_id","term_id");--> statement-breakpoint
CREATE UNIQUE INDEX "import_staging_job_row_uq" ON "import_staging_rows" USING btree ("import_job_id","row_number");--> statement-breakpoint
CREATE INDEX "import_staging_job_status_idx" ON "import_staging_rows" USING btree ("import_job_id","status");