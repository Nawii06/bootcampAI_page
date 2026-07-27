import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sessionRouter from "./session";
import referenceRouter from "./reference";
import systemRouter from "./system";
import academicRouter from "../domains/academic/router";
import programsRouter from "../domains/programs/router";
import completionRouter from "../domains/completion/router";
import benefitsRouter from "../domains/benefits/router";
import companiesRouter from "../domains/companies/router";
import budgetRouter from "../domains/budget/router";
import performanceRouter from "../domains/performance/router";
import contentRouter from "../domains/content/router";
import filesRouter from "../domains/files/router";
import auditRouter from "../domains/audit/router";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(referenceRouter);
router.use(systemRouter);
router.use(academicRouter);
router.use(programsRouter);
router.use(completionRouter);
router.use(benefitsRouter);
router.use(companiesRouter);
router.use(budgetRouter);
router.use(performanceRouter);
router.use(contentRouter);
router.use(filesRouter);
router.use(auditRouter);

export default router;
