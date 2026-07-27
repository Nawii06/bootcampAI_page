import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { students } from "@workspace/db/schema";
import {
  ProgramApplicationInputSchema,
  ProgramListQuerySchema,
  ProgramWithSessionsInputSchema,
  BulkAttendanceSchema,
  ConfirmProgramCompletionSchema,
  AssignmentInputSchema,
  AssignmentSubmissionInputSchema,
  GradeSubmissionInputSchema,
  SurveyInputSchema,
  SurveyResponseInputSchema,
  ProgramApplicationsQuerySchema,
  ProgramApplicationDecisionSchema,
  ProgramOperationsQuerySchema,
  AttendanceEventInputSchema,
  ProgramLearningQuerySchema,
  ProgramIdParamsSchema,
  ProgramUpdateSchema,
  ProgramSessionUpdateSchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  applyToProgram,
  createProgram,
  decideProgramApplication,
  getPrograms,
  updateProgram,
  updateProgramSession,
} from "./service";
import { listApplications } from "./repository";
import {
  confirmProgramCompletion,
  createAttendanceEvent,
  getProgramOperations,
  recordBulkAttendance,
} from "./operations-service";
import {
  createAssignment,
  createSurvey,
  gradeSubmission,
  submitAssignment,
  submitSurveyResponse,
  getProgramLearning,
} from "./learning-service";
import { ApiError } from "../../lib/api-error";

const router: IRouter = Router();

async function requireOwnStudent(userId: string, requestedStudentId?: string) {
  const student = await db.query.students.findFirst({
    where: eq(students.userId, userId),
  });
  if (!student || (requestedStudentId && student.id !== requestedStudentId)) {
    throw new ApiError(403, "FORBIDDEN", "본인의 학습활동만 처리할 수 있습니다.");
  }
  return student;
}

router.get(
  "/v1/program-operations",
  requireAuth,
  requireRoles("EDUCATION_STAFF", "REVIEWER"),
  async (req, res, next) => {
    try {
      const { sessionId } = ProgramOperationsQuerySchema.parse(req.query);
      res.json(await getProgramOperations(sessionId));
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/v1/program-learning",
  requireAuth,
  async (req, res, next) => {
    try {
      const query = ProgramLearningQuerySchema.parse(req.query);
      if (
        req.auth!.roles.includes("STUDENT") &&
        !req.auth!.roles.includes("SYSTEM_ADMIN")
      ) {
        await requireOwnStudent(req.auth!.id, query.studentId);
      } else if (
        !req.auth!.roles.includes("SYSTEM_ADMIN") &&
        !req.auth!.roles.some((role) =>
          ["EDUCATION_STAFF", "REVIEWER"].includes(role),
        )
      ) {
        throw new ApiError(403, "FORBIDDEN", "학습활동 조회 권한이 없습니다.");
      }
      res.json(await getProgramLearning(query.sessionId, query.studentId));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/attendance-events",
  requireAuth,
  requireRoles("EDUCATION_STAFF"),
  async (req, res, next) => {
    try {
      const input = AttendanceEventInputSchema.parse(req.body);
      res.status(201).json(
        await createAttendanceEvent(input, req.auth!.id, String(req.id)),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.get("/v1/programs", async (req, res, next) => {
  try {
    const query = ProgramListQuerySchema.parse(req.query);
    res.json({
      data: await getPrograms(query.businessYearId, query.status),
    });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/v1/program-applications",
  requireAuth,
  async (req, res, next) => {
    try {
      const query = ProgramApplicationsQuerySchema.parse(req.query);
      if (
        req.auth!.roles.includes("STUDENT") &&
        !req.auth!.roles.includes("SYSTEM_ADMIN")
      ) {
        const student = await db.query.students.findFirst({
          where: eq(students.userId, req.auth!.id),
        });
        if (!student || query.studentId !== student.id) {
          throw new ApiError(403, "FORBIDDEN", "본인의 신청내역만 조회할 수 있습니다.");
        }
      } else if (
        !req.auth!.roles.includes("SYSTEM_ADMIN") &&
        !req.auth!.roles.some((role) =>
          ["EDUCATION_STAFF", "REVIEWER"].includes(role),
        )
      ) {
        throw new ApiError(403, "FORBIDDEN", "신청내역 조회 권한이 없습니다.");
      }
      res.json({ data: await listApplications(query) });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/programs",
  requireAuth,
  requireRoles("EDUCATION_STAFF"),
  async (req, res, next) => {
    try {
      const input = ProgramWithSessionsInputSchema.parse(req.body);
      res
        .status(201)
        .json(await createProgram(input, req.auth!.id, String(req.id)));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/program-applications",
  requireAuth,
  requireRoles("STUDENT"),
  async (req, res, next) => {
    try {
      const input = ProgramApplicationInputSchema.parse(req.body);
      res
        .status(201)
        .json(await applyToProgram(input, req.auth!.id, String(req.id)));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/program-applications/decision",
  requireAuth,
  requireRoles("EDUCATION_STAFF", "REVIEWER"),
  async (req, res, next) => {
    try {
      const input = ProgramApplicationDecisionSchema.parse(req.body);
      res.json(
        await decideProgramApplication(
          input,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/v1/attendance-records/bulk",
  requireAuth,
  requireRoles("EDUCATION_STAFF"),
  async (req, res, next) => {
    try {
      const input = BulkAttendanceSchema.parse(req.body);
      res.json(
        await recordBulkAttendance(input, req.auth!.id, String(req.id)),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/program-completions/confirm",
  requireAuth,
  requireRoles("EDUCATION_STAFF", "REVIEWER"),
  async (req, res, next) => {
    try {
      const input = ConfirmProgramCompletionSchema.parse(req.body);
      res.json(
        await confirmProgramCompletion(
          input,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.post("/v1/assignments", requireAuth, requireRoles("EDUCATION_STAFF"), async (req, res, next) => {
  try {
    const input = AssignmentInputSchema.parse(req.body);
    res.status(201).json(await createAssignment(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.put("/v1/assignment-submissions", requireAuth, requireRoles("STUDENT"), async (req, res, next) => {
  try {
    const input = AssignmentSubmissionInputSchema.parse(req.body);
    await requireOwnStudent(req.auth!.id, input.studentId);
    res.json(await submitAssignment(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.patch("/v1/programs/:id", requireAuth, requireRoles("EDUCATION_STAFF"), async (req, res, next) => {
  try {
    const { id } = ProgramIdParamsSchema.parse(req.params);
    res.json(await updateProgram(id, ProgramUpdateSchema.parse(req.body), req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.patch("/v1/program-sessions/:id", requireAuth, requireRoles("EDUCATION_STAFF"), async (req, res, next) => {
  try {
    const { id } = ProgramIdParamsSchema.parse(req.params);
    res.json(await updateProgramSession(id, ProgramSessionUpdateSchema.parse(req.body), req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/assignment-submissions/grade", requireAuth, requireRoles("EDUCATION_STAFF"), async (req, res, next) => {
  try {
    const input = GradeSubmissionInputSchema.parse(req.body);
    res.json(await gradeSubmission(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/surveys", requireAuth, requireRoles("EDUCATION_STAFF"), async (req, res, next) => {
  try {
    const input = SurveyInputSchema.parse(req.body);
    res.status(201).json(await createSurvey(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/survey-responses", requireAuth, requireRoles("STUDENT"), async (req, res, next) => {
  try {
    const input = SurveyResponseInputSchema.parse(req.body);
    const student = await requireOwnStudent(req.auth!.id, input.studentId);
    res.status(201).json(await submitSurveyResponse(
      { ...input, studentId: input.studentId ?? student.id },
      req.auth!.id,
      String(req.id),
    ));
  } catch (error) { next(error); }
});

export default router;
