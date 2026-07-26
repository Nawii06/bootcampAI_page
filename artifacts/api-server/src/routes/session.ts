import { Router, type IRouter } from "express";
import { SessionResponseSchema } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { students } from "@workspace/db/schema";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/v1/session", requireAuth, async (req, res, next) => {
  try {
    const student = req.auth!.roles.includes("STUDENT")
      ? await db.query.students.findFirst({
          where: eq(students.userId, req.auth!.id),
        })
      : undefined;
    res.json(
      SessionResponseSchema.parse({
        user: {
          ...req.auth,
          studentId: student?.id,
          departmentCode: student?.departmentCode,
          grade: student?.grade ?? undefined,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
