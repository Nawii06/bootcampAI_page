import { Router, type IRouter } from "express";
import { SessionResponseSchema } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { students } from "@workspace/db/schema";
import { requireAuth } from "../middleware/auth";

/** Session lifetime in milliseconds (30 minutes) */
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Compute an ISO 8601 expiry timestamp that matches the server-side session TTL.
 * Until a real session store with persistent expiry is integrated, this returns
 * `now + SESSION_TTL_MS` so the client can synchronize its warning timer.
 */
function sessionExpiresAt(): string {
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

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
        expiresAt: sessionExpiresAt(),
      }),
    );
  } catch (error) {
    next(error);
  }
});

// Touch the session to extend it (called from the frontend warning dialog).
// Returns 200 while the session is still valid; 401 if it has already expired.
router.post("/v1/session/extend", requireAuth, (_req, res) => {
  res.json({ ok: true, expiresAt: sessionExpiresAt() });
});

export default router;
