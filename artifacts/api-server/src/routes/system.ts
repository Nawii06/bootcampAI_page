import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { requireAuth, requireRoles } from "../middleware/auth";

const router: IRouter = Router();

router.get(
  "/v1/system/status",
  requireAuth,
  requireRoles("SYSTEM_ADMIN", "AUDITOR"),
  async (_req, res, next) => {
    try {
      await db.execute(sql`select 1`);
      res.json({
        database: "CONNECTED",
        environment: process.env.NODE_ENV ?? "development",
        mockAuthEnabled:
          process.env.NODE_ENV !== "production" &&
          process.env.ENABLE_MOCK_AUTH === "true",
        ssoConfigured: Boolean(
          process.env.SSO_ISSUER &&
            process.env.SSO_CLIENT_ID &&
            process.env.SSO_REDIRECT_URI,
        ),
        externalImportAllowlistConfigured: Boolean(
          process.env.IMPORT_API_ALLOWED_HOSTS?.trim(),
        ),
        fileStorageConfigured: Boolean(process.env.FILE_STORAGE_DIR?.trim()),
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
