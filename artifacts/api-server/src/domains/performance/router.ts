import { Router, type IRouter } from "express";
import {
  PerformanceIndicatorInputSchema,
  PerformanceOverviewQuerySchema,
  PerformanceReviewInputSchema,
  PerformanceReviewQuerySchema,
  PerformanceSourceSummaryQuerySchema,
  PerformanceResultIdParamsSchema,
  PerformanceResultInputSchema,
  PerformanceTargetInputSchema,
  PerformanceEvidenceInputSchema,
  PerformanceCalculationInputSchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  approvePublicResult,
  createIndicator,
  createTarget,
  getPerformanceOverview,
  getPerformanceSourceSummary,
  createPerformanceReview,
  listPerformanceReviews,
  listPublicResults,
  upsertResult,
  submitPerformanceResultForReview,
  linkPerformanceEvidence,
  calculatePerformanceResult,
} from "./service";

const router: IRouter = Router();

router.post("/v1/performance-results/calculate", requireAuth, requireRoles("PERFORMANCE_STAFF"), async (req, res, next) => {
  try {
    const input = PerformanceCalculationInputSchema.parse(req.body);
    res.json(await calculatePerformanceResult(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.get("/v1/public/performance-results", async (req, res, next) => {
  try {
    const businessYearId = typeof req.query.businessYearId === "string" ? req.query.businessYearId : undefined;
    res.json({ data: await listPublicResults(businessYearId) });
  } catch (error) { next(error); }
});

router.get(
  "/v1/performance/overview",
  requireAuth,
  requireRoles("PERFORMANCE_STAFF", "REVIEWER", "AUDITOR"),
  async (req, res, next) => {
    try {
      const query = PerformanceOverviewQuerySchema.parse(req.query);
      res.json(await getPerformanceOverview(query.businessYearId));
    } catch (error) { next(error); }
  },
);

router.get(
  "/v1/performance-reviews",
  requireAuth,
  requireRoles("PERFORMANCE_STAFF", "REVIEWER", "AUDITOR"),
  async (req, res, next) => {
    try {
      const query = PerformanceReviewQuerySchema.parse(req.query);
      res.json({ data: await listPerformanceReviews(query.businessYearId) });
    } catch (error) { next(error); }
  },
);

router.post(
  "/v1/performance-reviews",
  requireAuth,
  requireRoles("PERFORMANCE_STAFF"),
  async (req, res, next) => {
    try {
      const input = PerformanceReviewInputSchema.parse(req.body);
      res.status(201).json(
        await createPerformanceReview(input, req.auth!.id, String(req.id)),
      );
    } catch (error) { next(error); }
  },
);

router.get(
  "/v1/performance/source-summary",
  requireAuth,
  requireRoles("PERFORMANCE_STAFF", "REVIEWER", "AUDITOR"),
  async (req, res, next) => {
    try {
      const query = PerformanceSourceSummaryQuerySchema.parse(req.query);
      res.json(await getPerformanceSourceSummary(query.businessYearId));
    } catch (error) { next(error); }
  },
);

router.post("/v1/performance-indicators", requireAuth, requireRoles("PERFORMANCE_STAFF"), async (req, res, next) => {
  try {
    const input = PerformanceIndicatorInputSchema.parse(req.body);
    res.status(201).json(await createIndicator(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/performance-targets", requireAuth, requireRoles("PERFORMANCE_STAFF", "REVIEWER"), async (req, res, next) => {
  try {
    const input = PerformanceTargetInputSchema.parse(req.body);
    res.status(201).json(await createTarget(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.put("/v1/performance-results", requireAuth, requireRoles("PERFORMANCE_STAFF"), async (req, res, next) => {
  try {
    const input = PerformanceResultInputSchema.parse(req.body);
    res.json(await upsertResult(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/performance-evidence", requireAuth, requireRoles("PERFORMANCE_STAFF"), async (req, res, next) => {
  try {
    const input = PerformanceEvidenceInputSchema.parse(req.body);
    res.status(201).json(await linkPerformanceEvidence(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/performance-results/:id/submit-review", requireAuth, requireRoles("PERFORMANCE_STAFF"), async (req, res, next) => {
  try {
    const { id } = PerformanceResultIdParamsSchema.parse(req.params);
    res.json(await submitPerformanceResultForReview(id, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/performance-results/:id/approve-public", requireAuth, requireRoles("REVIEWER"), async (req, res, next) => {
  try {
    const { id } = PerformanceResultIdParamsSchema.parse(req.params);
    res.json(await approvePublicResult(id, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

export default router;
