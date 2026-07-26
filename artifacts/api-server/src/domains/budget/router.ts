import { Router, type IRouter } from "express";
import {
  BudgetAllocationInputSchema,
  BudgetAmountChangeSchema,
  BudgetChangeHistoryQuerySchema,
  BudgetExecutionInputSchema,
  BudgetSummaryQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  changeAllocationAmount,
  createAllocation,
  createExecution,
  getBudgetSummary,
  listBudgetChangeHistory,
} from "./service";

const router: IRouter = Router();
const staff = requireRoles("BUDGET_STAFF");

router.get("/v1/budget/summary", requireAuth, staff, async (req, res, next) => {
  try {
    const query = BudgetSummaryQuerySchema.parse(req.query);
    res.json(await getBudgetSummary(query.businessYearId, query.programId));
  } catch (error) { next(error); }
});

router.get("/v1/budget/change-history", requireAuth, staff, async (req, res, next) => {
  try {
    const query = BudgetChangeHistoryQuerySchema.parse(req.query);
    res.json({ data: await listBudgetChangeHistory(query) });
  } catch (error) { next(error); }
});

router.post("/v1/budget/allocations", requireAuth, staff, async (req, res, next) => {
  try {
    const input = BudgetAllocationInputSchema.parse(req.body);
    res.status(201).json(await createAllocation(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/budget/executions", requireAuth, staff, async (req, res, next) => {
  try {
    const input = BudgetExecutionInputSchema.parse(req.body);
    res.status(201).json(await createExecution(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/budget/amount-changes", requireAuth, staff, async (req, res, next) => {
  try {
    const input = BudgetAmountChangeSchema.parse(req.body);
    res.json(await changeAllocationAmount(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

export default router;
