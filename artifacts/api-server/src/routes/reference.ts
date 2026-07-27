import { Router, type IRouter } from "express";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessYears, terms } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/v1/reference/business-years", async (req, res, next) => {
  try {
    const activeOnly = req.query.active === "true";
    const data = await db
      .select()
      .from(businessYears)
      .where(
        activeOnly
          ? eq(businessYears.isActive, true)
          : isNull(businessYears.deletedAt),
      )
      .orderBy(asc(businessYears.year));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get("/v1/reference/terms", async (req, res, next) => {
  try {
    const businessYearId =
      typeof req.query.businessYearId === "string"
        ? req.query.businessYearId
        : undefined;
    const data = await db
      .select()
      .from(terms)
      .where(
        and(
          businessYearId
            ? eq(terms.businessYearId, businessYearId)
            : undefined,
        ),
      )
      .orderBy(asc(terms.startsAt));
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

export default router;
