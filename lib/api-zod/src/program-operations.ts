import { z } from "zod";

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
