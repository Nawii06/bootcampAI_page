import { Router, type IRouter } from "express";
import {
  BenefitApprovalInputSchema,
  BenefitBulkCalculationInputSchema,
  BenefitCandidateInputSchema,
  BenefitPaymentInputSchema,
  BenefitPolicyInputSchema,
  BenefitOperationsQuerySchema,
  BenefitPolicyIdParamsSchema,
  BenefitPolicyStatusInputSchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  approveBenefit,
  bulkCalculateBenefitCandidates,
  calculateBenefitCandidate,
  createBenefitPolicy,
  updateBenefitPayment,
  getBenefitOperations,
  transitionBenefitPolicy,
} from "./service";

const router: IRouter = Router();

router.get("/v1/benefit-operations", requireAuth, requireRoles("BENEFIT_STAFF", "REVIEWER", "AUDITOR"), async (req, res, next) => {
  try {
    const { businessYearId } = BenefitOperationsQuerySchema.parse(req.query);
    res.json(await getBenefitOperations(businessYearId));
  } catch (error) { next(error); }
});

router.post("/v1/benefit-policies", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const input = BenefitPolicyInputSchema.parse(req.body);
    res.status(201).json(await createBenefitPolicy(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.patch("/v1/benefit-policies/:id/status", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const { id } = BenefitPolicyIdParamsSchema.parse(req.params);
    const input = BenefitPolicyStatusInputSchema.parse(req.body);
    res.json(await transitionBenefitPolicy(id, input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/benefit-candidates/calculate", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const input = BenefitCandidateInputSchema.parse(req.body);
    res.status(201).json(await calculateBenefitCandidate(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/benefit-candidates/bulk-calculate", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const input = BenefitBulkCalculationInputSchema.parse(req.body);
    res.json(await bulkCalculateBenefitCandidates(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/benefit-approvals", requireAuth, requireRoles("BENEFIT_STAFF", "REVIEWER"), async (req, res, next) => {
  try {
    const input = BenefitApprovalInputSchema.parse(req.body);
    res.status(201).json(await approveBenefit(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.put("/v1/benefit-payments", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const input = BenefitPaymentInputSchema.parse(req.body);
    res.json(await updateBenefitPayment(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

export default router;
