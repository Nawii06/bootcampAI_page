import { z } from "zod";

export const ProgramOperationsQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

export const ProgramLearningQuerySchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const AttendanceEventInputSchema = z
  .object({
    sessionId: z.string().uuid(),
    sequence: z.number().int().positive(),
    title: z.string().trim().min(1).max(300),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    path: ["endsAt"],
    message: "endsAt must be later than startsAt.",
  });

export const BulkAttendanceSchema = z.object({
  eventId: z.string().uuid(),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        minutesAttended: z.number().int().nonnegative().default(0),
        note: z.string().trim().max(1000).optional(),
      }),
    )
    .min(1)
    .max(1000),
});

export const ConfirmProgramCompletionSchema = z.object({
  sessionId: z.string().uuid(),
  studentId: z.string().uuid(),
});

export const AssignmentInputSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional(),
  dueAt: z.string().datetime().optional(),
  maxScore: z.number().positive().max(1000).optional(),
});

export const AssignmentSubmissionInputSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  fileId: z.string().uuid().optional(),
  content: z.string().trim().max(50_000).optional(),
}).refine((value) => value.fileId || value.content, {
  message: "파일 또는 제출 내용을 입력해야 합니다.",
});

export const GradeSubmissionInputSchema = z.object({
  submissionId: z.string().uuid(),
  score: z.number().nonnegative(),
  feedback: z.string().trim().max(4000).optional(),
});

export const SurveyInputSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  schema: z.record(z.string(), z.unknown()),
  isAnonymous: z.boolean().default(false),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
});

export const SurveyResponseInputSchema = z.object({
  surveyId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  answers: z.record(z.string(), z.unknown()),
});

const OperationalItemResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  studentId: z.string().uuid().optional(),
  completed: z.boolean().optional(),
  status: z.string().optional(),
}).passthrough();

export const ProgramOperationsResponseSchema = z.object({
  attendanceEvents: z.array(OperationalItemResponseSchema),
  assignments: z.array(OperationalItemResponseSchema),
  surveys: z.array(OperationalItemResponseSchema),
  completions: z.array(OperationalItemResponseSchema),
  participants: z.array(z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    status: z.string(),
  }).passthrough()),
  submissions: z.array(z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid(),
    assignmentId: z.string().uuid().optional(),
    score: z.union([z.string(), z.number()]).nullable().optional(),
  }).passthrough()),
  surveyResponses: z.array(z.object({
    id: z.string().uuid(),
    studentId: z.string().uuid().nullable().optional(),
    surveyId: z.string().uuid().optional(),
  }).passthrough()),
});

export const ProgramLearningResponseSchema = z.object({
  assignments: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    score: z.union([z.string(), z.number()]).nullable().optional(),
  }).passthrough()),
  submissions: z.array(z.object({
    id: z.string().uuid(),
    assignmentId: z.string().uuid(),
    score: z.union([z.string(), z.number()]).nullable().optional(),
  }).passthrough()),
  surveys: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
  }).passthrough()),
  surveyResponses: z.array(z.object({
    id: z.string().uuid(),
    surveyId: z.string().uuid(),
  }).passthrough()),
});

export type ProgramOperationsResponse = z.infer<
  typeof ProgramOperationsResponseSchema
>;
export type ProgramLearningResponse = z.infer<
  typeof ProgramLearningResponseSchema
>;
