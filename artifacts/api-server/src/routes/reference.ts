import { Router, type IRouter } from "express";
import { asc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { businessYears } from "@workspace/db/schema";

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

export default router;
