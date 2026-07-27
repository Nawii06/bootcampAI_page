import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";
import {
  AuditLogExportInputSchema,
  AuditLogQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { auditLogsToCsv, listAuditLogs } from "./service";

const router: IRouter = Router();
const auditReaders = requireRoles("AUDITOR");

router.get(
  "/v1/audit-logs",
  requireAuth,
  auditReaders,
  async (req, res, next) => {
    try {
      const query = AuditLogQuerySchema.parse(req.query);
      const result = await listAuditLogs(query);
      await db.insert(auditLogs).values({
        actorUserId: req.auth!.id,
        action: "LIST",
        resourceType: "AUDIT_LOG",
        requestId: String(req.id),
        metadata: {
          filters: query,
          resultCount: result.data.length,
        },
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/audit-logs/export",
  requireAuth,
  auditReaders,
  async (req, res, next) => {
    try {
      const input = AuditLogExportInputSchema.parse(req.body);
      const result = await listAuditLogs({
        ...input.filters,
        page: 1,
        pageSize: 10_000,
      });
      await db.insert(auditLogs).values({
        actorUserId: req.auth!.id,
        action: "EXPORT",
        resourceType: "AUDIT_LOG",
        requestId: String(req.id),
        reason: input.purpose,
        metadata: {
          filters: input.filters,
          resultCount: result.data.length,
          format: "CSV",
        },
      });
      const timestamp = new Date().toISOString().replaceAll(":", "-");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="audit-logs-${timestamp}.csv"`,
      );
      res.send(auditLogsToCsv(result.data));
    } catch (error) {
      next(error);
    }
  },
);

export default router;
