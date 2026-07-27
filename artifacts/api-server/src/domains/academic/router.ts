import { Router, type IRouter } from "express";
import multer from "multer";
import {
  CourseListQuerySchema,
  CourseListResponseSchema,
  CourseMasterInputSchema,
  CourseMasterSchema,
  CourseMasterUpdateSchema,
  AcademicEntityIdParamsSchema,
  CourseOfferingInputSchema,
  CourseOfferingQuerySchema,
  CourseOfferingSchema,
  CourseOfferingUpdateSchema,
  CurriculumInputSchema,
  CurriculumQuerySchema,
  CurriculumRequirementInputSchema,
  CurriculumRequirementSchema,
  CurriculumRequirementUpdateSchema,
  CurriculumSchema,
  CurriculumUpdateSchema,
  ImportJobSummarySchema,
  ImportJobIdParamsSchema,
  StageCourseImportSchema,
  CourseImportUploadMetadataSchema,
  ExternalCourseImportSchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  commitCourseImport,
  archiveCourse,
  archiveCourseOffering,
  archiveCurriculum,
  archiveCurriculumRequirement,
  createCurriculum,
  createCurriculumRequirement,
  createCourseOffering,
  createCourse,
  getCourseOfferings,
  getCurricula,
  getCurriculumRequirements,
  getCourses,
  previewCourseImport,
  stageCourseImport,
  updateCourse,
  updateCourseOffering,
  updateCurriculum,
  updateCurriculumRequirement,
} from "./service";
import {
  MAX_IMPORT_FILE_BYTES,
  assertAllowedExternalUrl,
  parseImportBuffer,
  sha256,
  validateImportFile,
} from "./import-parser";

const router: IRouter = Router();
const educationRoles = requireRoles("EDUCATION_STAFF", "REVIEWER");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_BYTES, files: 1 },
});

router.get("/v1/courses", async (req, res, next) => {
  try {
    const query = CourseListQuerySchema.parse(req.query);
    res.json(
      CourseListResponseSchema.parse(
        await getCourses(query.search, query.page, query.pageSize),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/v1/courses", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const input = CourseMasterInputSchema.parse(req.body);
    const course = await createCourse(input, req.auth!.id, String(req.id));
    res.status(201).json(CourseMasterSchema.parse(course));
  } catch (error) {
    next(error);
  }
});

router.patch("/v1/courses/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    const input = CourseMasterUpdateSchema.parse(req.body);
    res.json(CourseMasterSchema.parse(await updateCourse(id, input, req.auth!.id, String(req.id))));
  } catch (error) {
    next(error);
  }
});

router.delete("/v1/courses/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    await archiveCourse(id, req.auth!.id, String(req.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/v1/course-offerings", async (req, res, next) => {
  try {
    const query = CourseOfferingQuerySchema.parse(req.query);
    res.json({ data: (await getCourseOfferings(query)).map((row) => CourseOfferingSchema.parse(row)) });
  } catch (error) {
    next(error);
  }
});

router.post("/v1/course-offerings", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const input = CourseOfferingInputSchema.parse(req.body);
    res.status(201).json(CourseOfferingSchema.parse(await createCourseOffering(input, req.auth!.id, String(req.id))));
  } catch (error) {
    next(error);
  }
});

router.patch("/v1/course-offerings/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    const input = CourseOfferingUpdateSchema.parse(req.body);
    res.json(CourseOfferingSchema.parse(await updateCourseOffering(id, input, req.auth!.id, String(req.id))));
  } catch (error) {
    next(error);
  }
});

router.delete("/v1/course-offerings/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    await archiveCourseOffering(id, req.auth!.id, String(req.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/v1/curricula", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const query = CurriculumQuerySchema.parse(req.query);
    res.json({
      data: (await getCurricula(query)).map((row) =>
        CurriculumSchema.parse(row),
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/v1/curricula", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const input = CurriculumInputSchema.parse(req.body);
    res.status(201).json(
      CurriculumSchema.parse(
        await createCurriculum(input, req.auth!.id, String(req.id)),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.patch("/v1/curricula/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    const input = CurriculumUpdateSchema.parse(req.body);
    res.json(
      CurriculumSchema.parse(
        await updateCurriculum(id, input, req.auth!.id, String(req.id)),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/v1/curricula/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    await archiveCurriculum(id, req.auth!.id, String(req.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/v1/curricula/:id/requirements", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    res.json({
      data: (await getCurriculumRequirements(id)).map((row) =>
        CurriculumRequirementSchema.parse(row),
      ),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/v1/curricula/:id/requirements", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    const input = CurriculumRequirementInputSchema.parse(req.body);
    res.status(201).json(
      CurriculumRequirementSchema.parse(
        await createCurriculumRequirement(
          id,
          input,
          req.auth!.id,
          String(req.id),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.patch("/v1/curriculum-requirements/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    const input = CurriculumRequirementUpdateSchema.parse(req.body);
    res.json(
      CurriculumRequirementSchema.parse(
        await updateCurriculumRequirement(
          id,
          input,
          req.auth!.id,
          String(req.id),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.delete("/v1/curriculum-requirements/:id", requireAuth, educationRoles, async (req, res, next) => {
  try {
    const { id } = AcademicEntityIdParamsSchema.parse(req.params);
    await archiveCurriculumRequirement(id, req.auth!.id, String(req.id));
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post(
  "/v1/course-imports",
  requireAuth,
  educationRoles,
  async (req, res, next) => {
    try {
      const input = StageCourseImportSchema.parse(req.body);
      const job = await stageCourseImport(input, req.auth!.id, String(req.id));
      res.status(201).json(ImportJobSummarySchema.parse(job));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/course-imports/upload",
  requireAuth,
  educationRoles,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new Error("IMPORT_FILE_REQUIRED");
      }
      const metadata = CourseImportUploadMetadataSchema.parse(req.body);
      const extension = validateImportFile(req.file);
      const rows = await parseImportBuffer(req.file.buffer, extension);
      const job = await stageCourseImport(
        {
          ...metadata,
          sourceType:
            extension === "csv"
              ? "CSV"
              : extension === "xlsx"
                ? "XLSX"
                : "JSON",
          fileName: req.file.originalname,
          fileHash: sha256(req.file.buffer),
          rows,
        },
        req.auth!.id,
        String(req.id),
      );
      res.status(201).json(ImportJobSummarySchema.parse(job));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/course-imports/external-api",
  requireAuth,
  educationRoles,
  async (req, res, next) => {
    try {
      const input = ExternalCourseImportSchema.parse(req.body);
      const url = assertAllowedExternalUrl(input.url);
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
        redirect: "error",
      });
      if (!response.ok) {
        throw new Error(`External API returned ${response.status}`);
      }
      const contentLength = Number(response.headers.get("content-length") ?? 0);
      if (contentLength > MAX_IMPORT_FILE_BYTES) {
        throw new Error("External API response exceeded limit");
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length > MAX_IMPORT_FILE_BYTES) {
        throw new Error("External API response exceeded limit");
      }
      const rows = await parseImportBuffer(buffer, "json");
      const job = await stageCourseImport(
        {
          businessYearId: input.businessYearId,
          termId: input.termId,
          sourceSystem: input.sourceSystem,
          sourceType: "API",
          fileHash: sha256(buffer),
          rows,
        },
        req.auth!.id,
        String(req.id),
      );
      res.status(201).json(ImportJobSummarySchema.parse(job));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/course-imports/:id/preview",
  requireAuth,
  educationRoles,
  async (req, res, next) => {
    try {
      const { id } = ImportJobIdParamsSchema.parse(req.params);
      const job = await previewCourseImport(id);
      res.json(ImportJobSummarySchema.parse(job));
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/course-imports/:id/commit",
  requireAuth,
  educationRoles,
  async (req, res, next) => {
    try {
      const { id } = ImportJobIdParamsSchema.parse(req.params);
      const job = await commitCourseImport(id, req.auth!.id, String(req.id));
      res.json(ImportJobSummarySchema.parse(job));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
