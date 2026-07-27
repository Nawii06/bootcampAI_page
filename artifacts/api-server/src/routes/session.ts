import { Router, type IRouter, type Request } from "express";
import { SessionResponseSchema } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { students } from "@workspace/db/schema";
import { requireAuth } from "../middleware/auth";

/** Session lifetime in milliseconds (30 minutes) */
const SESSION_TTL_MS = 30 * 60 * 1000;

/**
 * Represents the subset of an express-session SessionData object that we need.
 * Using a loose structural type allows this file to remain free of an
 * express-session peer-dependency while still being type-safe when the
 * session middleware IS mounted.
 */
interface SessionWithCookie {
  cookie: {
    expires?: Date | null;
  };
  touch?(): void;
}

/**
 * Returns the ISO 8601 expiry timestamp for the current session.
 *
 * Priority:
 *   1. `req.session.cookie.expires` — set by express-session (or a compatible
 *      middleware) to the real server-side expiry.  This is the source of truth
 *      once a real session store is connected.
 *   2. Fallback: `now + SESSION_TTL_MS` — used during development (mock-auth
 *      header mode) when no session middleware is mounted.
 */
function sessionExpiresAt(req: Request): string {
  // Access the session object loosely so this compiles without express-session
  // types being installed as a direct dependency.
  const session = (req as Request & { session?: SessionWithCookie }).session;
  const cookieExpires = session?.cookie?.expires;

  if (cookieExpires instanceof Date && !Number.isNaN(cookieExpires.getTime())) {
    return cookieExpires.toISOString();
  }

  // No real session store attached yet — derive from the configured TTL.
  return new Date(Date.now() + SESSION_TTL_MS).toISOString();
}

/**
 * Extends the session and returns the updated expiry timestamp.
 *
 * When express-session is mounted it automatically rolls the session on every
 * response (if `rolling: true`) or we can call `session.touch()` explicitly.
 * Either way the `cookie.expires` field is updated in place, so the next call
 * to `sessionExpiresAt()` will reflect the new expiry.
 */
function touchSession(req: Request): void {
  const session = (req as Request & { session?: SessionWithCookie }).session;
  if (typeof session?.touch === "function") {
    session.touch();
  }
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
        expiresAt: sessionExpiresAt(req),
      }),
    );
  } catch (error) {
    next(error);
  }
});

// Touch the session to extend it (called from the frontend warning dialog).
// Returns 200 while the session is still valid; 401 if it has already expired.
router.post("/v1/session/extend", requireAuth, (req, res) => {
  // Explicitly touch the session so the store updates cookie.expires before
  // we read it back.  This is a no-op when no session middleware is mounted.
  touchSession(req);
  res.json({ ok: true, expiresAt: sessionExpiresAt(req) });
});

export default router;
