CREATE TYPE "public"."application_status" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWING', 'SUPPLEMENT_REQUESTED', 'SELECTED', 'WAITLISTED', 'REJECTED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');--> statement-breakpoint
CREATE TYPE "public"."lifecycle_status" AS ENUM('DRAFT', 'OPEN', 'CLOSED', 'REVIEWING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'REQUESTED', 'PAID', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "benefit_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"approved_amount" numeric(15, 2) NOT NULL,
	"decision" text NOT NULL,
	"note" text,
	"snapshot" jsonb NOT NULL,
	"approved_by" uuid NOT NULL,
	"approved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"eligibility_snapshot" jsonb NOT NULL,
	"calculated_amount" numeric(15, 2) NOT NULL,
	"status" "lifecycle_status" DEFAULT 'REVIEWING' NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_eligibility_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"expression" jsonb NOT NULL,
	"sort_order" numeric(5, 0) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"erp_reference" text,
	"requested_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benefit_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"benefit_type" text NOT NULL,
	"amount_formula" jsonb NOT NULL,
	"status" "lifecycle_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"program_id" uuid,
	"budget_code" text NOT NULL,
	"category" text NOT NULL,
	"allocated_amount" numeric(15, 2) NOT NULL,
	"planned_amount" numeric(15, 2) NOT NULL,
	"internal_approval_number" text,
	"erp_reference" text,
	"rcms_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_change_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"previous_amount" numeric(15, 2),
	"new_amount" numeric(15, 2) NOT NULL,
	"reason" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"changed_by" uuid NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_executions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"purpose" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"evidence_file_id" uuid,
	"internal_approval_number" text,
	"erp_reference" text,
	"rcms_reference" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approved_application_id" uuid,
	"name" text NOT NULL,
	"registration_number" text,
	"company_type" text NOT NULL,
	"description" text,
	"website" text,
	"source_system" text,
	"external_id" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"applicant_user_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"registration_number" text,
	"application_data" jsonb NOT NULL,
	"status" "lifecycle_status" DEFAULT 'DRAFT' NOT NULL,
	"supplement_request" text,
	"submitted_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"business_year_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"department" text,
	"position" text,
	"email" text,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "company_experts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"specialty" text NOT NULL,
	"profile" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"business_year_id" uuid NOT NULL,
	"program_session_id" uuid,
	"participation_type" text NOT NULL,
	"title" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"employment_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "completion_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"curriculum_id" uuid NOT NULL,
	"program_session_id" uuid,
	"calculation_version" text NOT NULL,
	"completed" boolean NOT NULL,
	"progress_rate" numeric(5, 2) NOT NULL,
	"satisfied" jsonb NOT NULL,
	"missing" jsonb NOT NULL,
	"eligible_programs" jsonb DEFAULT '[]'::jsonb,
	"input_snapshot" jsonb NOT NULL,
	"rule_snapshot" jsonb NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_offering_id" uuid NOT NULL,
	"grade" text,
	"credits_earned" numeric(4, 1) NOT NULL,
	"passed" boolean NOT NULL,
	"source_system" text,
	"external_id" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiential_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"organization_name" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"hours" numeric(8, 1),
	"status" text NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb,
	"source_system" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "content_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid,
	"content_type" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "publication_status" DEFAULT 'DRAFT' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"author_id" uuid NOT NULL,
	"reviewed_by" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "stored_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" text NOT NULL,
	"extension" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"contains_personal_info" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "stored_files_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
CREATE TABLE "assignment_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"file_id" uuid,
	"content" text,
	"score" numeric(7, 2),
	"feedback" text,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone,
	"graded_by" uuid
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_at" timestamp with time zone,
	"max_score" numeric(7, 2)
);
--> statement-breakpoint
CREATE TABLE "attendance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "attendance_status" NOT NULL,
	"minutes_attended" integer DEFAULT 0 NOT NULL,
	"note" text,
	"recorded_by" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'DRAFT' NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"eligibility_snapshot" jsonb NOT NULL,
	"review_note" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "program_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"completed" boolean NOT NULL,
	"calculated_snapshot" jsonb NOT NULL,
	"confirmed_by" uuid NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"name" text NOT NULL,
	"capacity" integer NOT NULL,
	"application_starts_at" timestamp with time zone NOT NULL,
	"application_ends_at" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"venue" text,
	"status" "lifecycle_status" DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_year_id" uuid NOT NULL,
	"term_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"track_code_id" uuid,
	"level_code_id" uuid,
	"program_type" text NOT NULL,
	"eligibility_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completion_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "lifecycle_status" DEFAULT 'DRAFT' NOT NULL,
	"source_system" text,
	"external_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"student_id" uuid,
	"answers" jsonb NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"title" text NOT NULL,
	"schema" jsonb NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "performance_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"result_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"unit" text NOT NULL,
	"calculation_formula" jsonb NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "performance_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"business_year_id" uuid NOT NULL,
	"actual_value" numeric(15, 2) NOT NULL,
	"calculation_snapshot" jsonb NOT NULL,
	"status" "publication_status" DEFAULT 'DRAFT' NOT NULL,
	"public_approved_by" uuid,
	"public_approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"business_year_id" uuid NOT NULL,
	"target_value" numeric(15, 2) NOT NULL,
	"version" text NOT NULL,
	"rationale" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "benefit_approvals" ADD CONSTRAINT "benefit_approvals_candidate_id_benefit_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."benefit_candidates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_approvals" ADD CONSTRAINT "benefit_approvals_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_candidates" ADD CONSTRAINT "benefit_candidates_policy_id_benefit_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."benefit_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_candidates" ADD CONSTRAINT "benefit_candidates_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_eligibility_rules" ADD CONSTRAINT "benefit_eligibility_rules_policy_id_benefit_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."benefit_policies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_payments" ADD CONSTRAINT "benefit_payments_approval_id_benefit_approvals_id_fk" FOREIGN KEY ("approval_id") REFERENCES "public"."benefit_approvals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "benefit_policies" ADD CONSTRAINT "benefit_policies_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_change_history" ADD CONSTRAINT "budget_change_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_executions" ADD CONSTRAINT "budget_executions_allocation_id_budget_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."budget_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_executions" ADD CONSTRAINT "budget_executions_evidence_file_id_stored_files_id_fk" FOREIGN KEY ("evidence_file_id") REFERENCES "public"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_executions" ADD CONSTRAINT "budget_executions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_approved_application_id_company_applications_id_fk" FOREIGN KEY ("approved_application_id") REFERENCES "public"."company_applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_applications" ADD CONSTRAINT "company_applications_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_applications" ADD CONSTRAINT "company_applications_applicant_user_id_users_id_fk" FOREIGN KEY ("applicant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_applications" ADD CONSTRAINT "company_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_commitments" ADD CONSTRAINT "company_commitments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_commitments" ADD CONSTRAINT "company_commitments_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_commitments" ADD CONSTRAINT "company_commitments_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_contacts" ADD CONSTRAINT "company_contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_experts" ADD CONSTRAINT "company_experts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_participations" ADD CONSTRAINT "company_participations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_participations" ADD CONSTRAINT "company_participations_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_participations" ADD CONSTRAINT "company_participations_program_session_id_program_sessions_id_fk" FOREIGN KEY ("program_session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_assessments" ADD CONSTRAINT "completion_assessments_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_assessments" ADD CONSTRAINT "completion_assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_assessments" ADD CONSTRAINT "completion_assessments_curriculum_id_curricula_id_fk" FOREIGN KEY ("curriculum_id") REFERENCES "public"."curricula"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "completion_assessments" ADD CONSTRAINT "completion_assessments_program_session_id_program_sessions_id_fk" FOREIGN KEY ("program_session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_completions" ADD CONSTRAINT "course_completions_course_offering_id_course_offerings_id_fk" FOREIGN KEY ("course_offering_id") REFERENCES "public"."course_offerings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiential_records" ADD CONSTRAINT "experiential_records_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiential_records" ADD CONSTRAINT "experiential_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_attachments" ADD CONSTRAINT "content_attachments_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_attachments" ADD CONSTRAINT "content_attachments_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_events" ADD CONSTRAINT "attendance_events_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_event_id_attendance_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."attendance_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_applications" ADD CONSTRAINT "program_applications_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_applications" ADD CONSTRAINT "program_applications_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_applications" ADD CONSTRAINT "program_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_completions" ADD CONSTRAINT "program_completions_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_completions" ADD CONSTRAINT "program_completions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_completions" ADD CONSTRAINT "program_completions_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_sessions" ADD CONSTRAINT "program_sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_track_code_id_code_values_id_fk" FOREIGN KEY ("track_code_id") REFERENCES "public"."code_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_level_code_id_code_values_id_fk" FOREIGN KEY ("level_code_id") REFERENCES "public"."code_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_session_id_program_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."program_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_evidence" ADD CONSTRAINT "performance_evidence_result_id_performance_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."performance_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_evidence" ADD CONSTRAINT "performance_evidence_file_id_stored_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."stored_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_results" ADD CONSTRAINT "performance_results_indicator_id_performance_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."performance_indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_results" ADD CONSTRAINT "performance_results_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_results" ADD CONSTRAINT "performance_results_public_approved_by_users_id_fk" FOREIGN KEY ("public_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_targets" ADD CONSTRAINT "performance_targets_indicator_id_performance_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."performance_indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_targets" ADD CONSTRAINT "performance_targets_business_year_id_business_years_id_fk" FOREIGN KEY ("business_year_id") REFERENCES "public"."business_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_targets" ADD CONSTRAINT "performance_targets_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "benefit_approval_candidate_idx" ON "benefit_approvals" USING btree ("candidate_id");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_candidate_student_policy_uq" ON "benefit_candidates" USING btree ("policy_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_rule_policy_code_uq" ON "benefit_eligibility_rules" USING btree ("policy_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_payment_approval_uq" ON "benefit_payments" USING btree ("approval_id");--> statement-breakpoint
CREATE UNIQUE INDEX "benefit_policy_year_code_uq" ON "benefit_policies" USING btree ("business_year_id","code");--> statement-breakpoint
CREATE INDEX "budget_allocation_program_idx" ON "budget_allocations" USING btree ("business_year_id","program_id");--> statement-breakpoint
CREATE INDEX "budget_change_entity_idx" ON "budget_change_history" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "budget_execution_allocation_idx" ON "budget_executions" USING btree ("allocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_registration_number_uq" ON "companies" USING btree ("registration_number");--> statement-breakpoint
CREATE UNIQUE INDEX "company_external_key_uq" ON "companies" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE INDEX "company_application_year_status_idx" ON "company_applications" USING btree ("business_year_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "company_commitment_year_uq" ON "company_commitments" USING btree ("company_id","business_year_id");--> statement-breakpoint
CREATE INDEX "company_contact_company_idx" ON "company_contacts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_expert_company_idx" ON "company_experts" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_participation_company_year_idx" ON "company_participations" USING btree ("company_id","business_year_id");--> statement-breakpoint
CREATE INDEX "completion_assessment_student_time_idx" ON "completion_assessments" USING btree ("student_id","calculated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "course_completion_student_offering_uq" ON "course_completions" USING btree ("student_id","course_offering_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_completion_external_key_uq" ON "course_completions" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "experiential_record_external_key_uq" ON "experiential_records" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE INDEX "experiential_record_student_idx" ON "experiential_records" USING btree ("student_id","business_year_id");--> statement-breakpoint
CREATE INDEX "content_attachment_content_idx" ON "content_attachments" USING btree ("content_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_type_slug_uq" ON "content_items" USING btree ("content_type","slug");--> statement-breakpoint
CREATE INDEX "content_publication_idx" ON "content_items" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "stored_file_hash_idx" ON "stored_files" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "stored_file_uploader_idx" ON "stored_files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "assignment_submission_student_uq" ON "assignment_submissions" USING btree ("assignment_id","student_id");--> statement-breakpoint
CREATE INDEX "assignment_session_idx" ON "assignments" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_event_sequence_uq" ON "attendance_events" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_record_student_event_uq" ON "attendance_records" USING btree ("event_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_application_student_session_uq" ON "program_applications" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE INDEX "program_application_status_idx" ON "program_applications" USING btree ("session_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "program_completion_student_session_uq" ON "program_completions" USING btree ("session_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "program_session_sequence_uq" ON "program_sessions" USING btree ("program_id","sequence");--> statement-breakpoint
CREATE INDEX "program_session_period_idx" ON "program_sessions" USING btree ("application_starts_at","application_ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "program_year_code_uq" ON "programs" USING btree ("business_year_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "program_external_key_uq" ON "programs" USING btree ("source_system","external_id");--> statement-breakpoint
CREATE INDEX "survey_response_survey_idx" ON "survey_responses" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "performance_evidence_result_idx" ON "performance_evidence" USING btree ("result_id");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_indicator_code_uq" ON "performance_indicators" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_result_year_indicator_uq" ON "performance_results" USING btree ("indicator_id","business_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "performance_target_version_uq" ON "performance_targets" USING btree ("indicator_id","business_year_id","version");