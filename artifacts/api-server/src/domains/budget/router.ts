import { Router, type IRouter } from "express";
import {
  BudgetAllocationInputSchema,
  BudgetAmountChangeSchema,
  BudgetChangeHistoryQuerySchema,
  BudgetExecutionInputSchema,
  BudgetSummaryQuerySchema,
  BudgetOperationsQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  changeAllocationAmount,
  createAllocation,
  createExecution,
  getBudgetSummary,
  listBudgetChangeHistory,
  getBudgetOperations,
} from "./service";

const router: IRouter = Router();
const readers = requireRoles("BUDGET_STAFF", "AUDITOR", "REVIEWER");
const writers = requireRoles("BUDGET_STAFF");

router.get("/v1/budget/summary", requireAuth, readers, async (req, res, next) => {
  try {
    const query = BudgetSummaryQuerySchema.parse(req.query);
    res.json(await getBudgetSummary(query.businessYearId, query.programId));
  } catch (error) { next(error); }
});

router.get("/v1/budget/change-history", requireAuth, readers, async (req, res, next) => {
  try {
    const query = BudgetChangeHistoryQuerySchema.parse(req.query);
    res.json({ data: await listBudgetChangeHistory(query) });
  } catch (error) { next(error); }
});

router.get("/v1/budget/operations", requireAuth, readers, async (req, res, next) => {
  try {
    const query = BudgetOperationsQuerySchema.parse(req.query);
    res.json(await getBudgetOperations(query.businessYearId, query.programId));
  } catch (error) { next(error); }
});

router.post("/v1/budget/allocations", requireAuth, writers, async (req, res, next) => {
  try {
    const input = BudgetAllocationInputSchema.parse(req.body);
    res.status(201).json(await createAllocation(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/budget/executions", requireAuth, writers, async (req, res, next) => {
  try {
    const input = BudgetExecutionInputSchema.parse(req.body);
    res.status(201).json(await createExecution(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/budget/amount-changes", requireAuth, writers, async (req, res, next) => {
  try {
    const input = BudgetAmountChangeSchema.parse(req.body);
    res.json(await changeAllocationAmount(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

export default router;
