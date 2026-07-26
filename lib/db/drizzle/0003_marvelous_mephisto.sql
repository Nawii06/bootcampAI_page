ALTER TYPE "public"."lifecycle_status" ADD VALUE 'SUBMITTED' BEFORE 'OPEN';--> statement-breakpoint
ALTER TYPE "public"."lifecycle_status" ADD VALUE 'SUPPLEMENT_REQUESTED' BEFORE 'APPROVED';