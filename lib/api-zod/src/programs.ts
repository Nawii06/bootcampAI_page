import { z } from "zod";

export const ProgramInputSchema = z.object({
  businessYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(50),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  programType: z.string().trim().min(1).max(50),
  eligibilityRules: z
    .object({
      departmentCodes: z.array(z.string()).optional(),
      minimumGrade: z.coerce.number().int().min(1).max(6).optional(),
      maximumGrade: z.coerce.number().int().min(1).max(6).optional(),
    })
    .default({}),
  completionRules: z
    .object({
      minimumAttendanceRate: z.coerce.number().min(0).max(100).optional(),
      minimumAssignmentScore: z.coerce.number().min(0).max(100).optional(),
      surveyRequired: z.boolean().optional(),
    })
    .default({}),
});

export const ProgramSessionInputSchema = z
  .object({
    sequence: z.number().int().positive(),
    name: z.string().trim().min(1).max(200),
    capacity: z.number().int().positive(),
    applicationStartsAt: z.string().datetime(),
    applicationEndsAt: z.string().datetime(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    venue: z.string().trim().max(200).optional(),
  })
  .superRefine((value, context) => {
    if (value.applicationStartsAt >= value.applicationEndsAt) {
      context.addIssue({
        code: "custom",
        path: ["applicationEndsAt"],
        message: "신청 종료일은 시작일 이후여야 합니다.",
      });
    }
    if (value.startsAt >= value.endsAt) {
      context.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "운영 종료일은 시작일 이후여야 합니다.",
      });
    }
  });

export const ProgramWithSessionsInputSchema = ProgramInputSchema.extend({
  sessions: z.array(ProgramSessionInputSchema).min(1),
});

export const ProgramApplicationInputSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
  answers: z.record(z.string(), z.unknown()).default({}),
});

export const ProgramIdParamsSchema = z.object({ id: z.string().uuid() });

export const ProgramListQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  status: z
    .enum([
      "DRAFT",
      "OPEN",
      "CLOSED",
      "REVIEWING",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
      "COMPLETED",
      "ARCHIVED",
    ])
    .optional(),
});

export const ProgramApplicationsQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  status: z
    .enum([
      "DRAFT",
      "SUBMITTED",
      "REVIEWING",
      "SUPPLEMENT_REQUESTED",
      "SELECTED",
      "WAITLISTED",
      "REJECTED",
      "CANCELLED",
    ])
    .optional(),
});

export const ProgramApplicationDecisionSchema = z.object({
  applicationId: z.string().uuid(),
  status: z.enum([
    "REVIEWING",
    "SUPPLEMENT_REQUESTED",
    "SELECTED",
    "WAITLISTED",
    "REJECTED",
    "CANCELLED",
  ]),
  reviewNote: z.string().trim().max(2000).optional(),
});

export type ProgramWithSessionsInput = z.infer<
  typeof ProgramWithSessionsInputSchema
>;
export type ProgramApplicationInput = z.infer<
  typeof ProgramApplicationInputSchema
>;
