import { Router, type IRouter } from "express";
import {
  BenefitApprovalInputSchema,
  BenefitCandidateInputSchema,
  BenefitPaymentInputSchema,
  BenefitPolicyInputSchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  approveBenefit,
  calculateBenefitCandidate,
  createBenefitPolicy,
  updateBenefitPayment,
} from "./service";

const router: IRouter = Router();

router.post("/v1/benefit-policies", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const input = BenefitPolicyInputSchema.parse(req.body);
    res.status(201).json(await createBenefitPolicy(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/benefit-candidates/calculate", requireAuth, requireRoles("BENEFIT_STAFF"), async (req, res, next) => {
  try {
    const input = BenefitCandidateInputSchema.parse(req.body);
    res.status(201).json(await calculateBenefitCandidate(input, req.auth!.id, String(req.id)));
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
