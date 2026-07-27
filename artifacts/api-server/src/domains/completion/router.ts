import { Router, type IRouter } from "express";
import {
  CompletionAssessmentQuerySchema,
  CompletionCalculationRequestSchema,
  DerivedCompletionCalculationRequestSchema,
  ExperientialRecordInputSchema,
  ExperientialRecordQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  calculateAndStoreAssessment,
  calculateAndStoreDerivedAssessment,
  createExperientialRecord,
  generateShareToken,
  getExperientialRecordByToken,
  listCompletionAssessments,
  listExperientialRecords,
  revokeShareToken,
} from "./service";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { students } from "@workspace/db/schema";
import { ApiError } from "../../lib/api-error";

const router: IRouter = Router();

async function currentStudentId(userId: string) {
  const student = await db.query.students.findFirst({
    where: eq(students.userId, userId),
  });
  return student?.id;
}

router.get(
  "/v1/completion-assessments",
  requireAuth,
  async (req, res, next) => {
    try {
      const query = CompletionAssessmentQuerySchema.parse(req.query);
      if (
        req.auth!.roles.includes("STUDENT") &&
        !req.auth!.roles.includes("SYSTEM_ADMIN")
      ) {
        const student = await db.query.students.findFirst({
          where: eq(students.userId, req.auth!.id),
        });
        if (!student || !query.studentId || student.id !== query.studentId) {
          throw new ApiError(403, "FORBIDDEN", "본인의 이수정보만 조회할 수 있습니다.");
        }
      } else if (
        !req.auth!.roles.includes("SYSTEM_ADMIN") &&
        !req.auth!.roles.some((role) =>
          ["EDUCATION_STAFF", "REVIEWER"].includes(role),
        )
      ) {
        throw new ApiError(403, "FORBIDDEN", "이수정보 조회 권한이 없습니다.");
      }
      res.json({
        data: await listCompletionAssessments(
          query.studentId,
          query.businessYearId,
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/completion-assessments/derive",
  requireAuth,
  requireRoles("EDUCATION_STAFF", "REVIEWER"),
  async (req, res, next) => {
    try {
      const input = DerivedCompletionCalculationRequestSchema.parse(req.body);
      res
        .status(201)
        .json(
          await calculateAndStoreDerivedAssessment(
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

router.post(
  "/v1/completion-assessments",
  requireAuth,
  requireRoles("EDUCATION_STAFF", "REVIEWER"),
  async (req, res, next) => {
    try {
      const input = CompletionCalculationRequestSchema.parse(req.body);
      res
        .status(201)
        .json(
          await calculateAndStoreAssessment(
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

router.get("/v1/experiential-records", requireAuth, async (req, res, next) => {
  try {
    const query = ExperientialRecordQuerySchema.parse(req.query);
    let studentId = query.studentId;
    if (
      req.auth!.roles.includes("STUDENT") &&
      !req.auth!.roles.includes("SYSTEM_ADMIN")
    ) {
      const ownStudentId = await currentStudentId(req.auth!.id);
      if (!ownStudentId || (studentId && studentId !== ownStudentId)) {
        throw new ApiError(403, "FORBIDDEN", "본인의 포트폴리오만 조회할 수 있습니다.");
      }
      studentId = ownStudentId;
    } else if (
      !req.auth!.roles.includes("SYSTEM_ADMIN") &&
      !req.auth!.roles.some((role) =>
        ["EDUCATION_STAFF", "REVIEWER"].includes(role),
      )
    ) {
      throw new ApiError(403, "FORBIDDEN", "포트폴리오 조회 권한이 없습니다.");
    }
    res.json({ data: await listExperientialRecords({ ...query, studentId }) });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/v1/experiential-records",
  requireAuth,
  requireRoles("STUDENT"),
  async (req, res, next) => {
    try {
      const input = ExperientialRecordInputSchema.parse(req.body);
      const studentId = await currentStudentId(req.auth!.id);
      if (!studentId) {
        throw new ApiError(409, "STUDENT_PROFILE_REQUIRED", "연결된 학생 프로필이 없습니다.");
      }
      res.status(201).json(
        await createExperientialRecord(
          input,
          studentId,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

// ─── Share token (authenticated, STUDENT only) ────────────────────────────────

router.post(
  "/v1/experiential-records/:id/share-token",
  requireAuth,
  requireRoles("STUDENT"),
  async (req, res, next) => {
    try {
      const studentId = await currentStudentId(req.auth!.id);
      if (!studentId) {
        throw new ApiError(
          409,
          "STUDENT_PROFILE_REQUIRED",
          "연결된 학생 프로필이 없습니다.",
        );
      }
      res.json(
        await generateShareToken(
          String(req.params.id),
          studentId,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.delete(
  "/v1/experiential-records/:id/share-token",
  requireAuth,
  requireRoles("STUDENT"),
  async (req, res, next) => {
    try {
      const studentId = await currentStudentId(req.auth!.id);
      if (!studentId) {
        throw new ApiError(
          409,
          "STUDENT_PROFILE_REQUIRED",
          "연결된 학생 프로필이 없습니다.",
        );
      }
      res.json(
        await revokeShareToken(
          String(req.params.id),
          studentId,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

// ─── Public portfolio view (no auth) ─────────────────────────────────────────

router.get("/v1/public/portfolio/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token || token.length > 150) {
      throw new ApiError(400, "INVALID_TOKEN", "유효하지 않은 토큰입니다.");
    }
    const [record] = await getExperientialRecordByToken(token);
    if (!record) {
      throw new ApiError(
        404,
        "PORTFOLIO_NOT_FOUND",
        "포트폴리오를 찾을 수 없거나 비공개 상태입니다.",
      );
    }
    const ev = record.evidence as Record<string, unknown>;
    res.json({
      title: record.title,
      summary: typeof ev.summary === "string" ? ev.summary : "",
      techStack: Array.isArray(ev.techStack) ? ev.techStack : [],
      outputLinks: Array.isArray(ev.outputLinks) ? ev.outputLinks : [],
      createdAt:
        record.createdAt instanceof Date
          ? record.createdAt.toISOString()
          : String(record.createdAt),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
