import { Router, type IRouter } from "express";
import multer from "multer";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  fileRetentionPolicies,
  storedFiles,
  users,
} from "@workspace/db/schema";
import {
  FileLegalHoldInputSchema,
  FileRetentionCleanupInputSchema,
  FileRetentionPolicyUpdateSchema,
  FileUploadMetadataSchema,
  StoredFileIdParamsSchema,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  MAX_EVIDENCE_FILE_BYTES,
  createPersistedFileDownloadUrl,
  persistEvidenceFile,
  removePersistedFile,
  readPersistedFile,
  validateEvidenceFile,
} from "./storage";
import { canReadFile, getFileRelations } from "./access";
import { scanFileForMalware } from "./malware-scanner";
import {
  getDefaultRetentionPolicy,
  listExpiredOrPendingFiles,
} from "./retention";
import {
  calculateFileExpiry,
  evaluateRetentionOutcome,
} from "./retention-policy";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_FILE_BYTES, files: 1 },
});
const fileReaders = requireRoles(
  "EDUCATION_STAFF",
  "BENEFIT_STAFF",
  "COMPANY_STAFF",
  "BUDGET_STAFF",
  "PERFORMANCE_STAFF",
  "CONTENT_EDITOR",
  "AUDITOR",
);
const fileWriters = requireRoles(
  "EDUCATION_STAFF",
  "BENEFIT_STAFF",
  "COMPANY_STAFF",
  "BUDGET_STAFF",
  "PERFORMANCE_STAFF",
  "CONTENT_EDITOR",
  "COMPANY_MANAGER",
);

router.get("/v1/files", requireAuth, fileReaders, async (req, res, next) => {
  try {
    const data = await db
      .select({
        id: storedFiles.id,
        originalName: storedFiles.originalName,
        extension: storedFiles.extension,
        mimeType: storedFiles.mimeType,
        sizeBytes: storedFiles.sizeBytes,
        containsPersonalInfo: storedFiles.containsPersonalInfo,
        isPublic: storedFiles.isPublic,
        uploadedByName: users.displayName,
        createdAt: storedFiles.createdAt,
      })
      .from(storedFiles)
      .innerJoin(users, eq(users.id, storedFiles.uploadedBy))
      .where(isNull(storedFiles.deletedAt))
      .orderBy(desc(storedFiles.createdAt));
    await db.insert(auditLogs).values({
      actorUserId: req.auth!.id,
      action: "LIST",
      resourceType: "STORED_FILE",
      requestId: String(req.id),
      metadata: {
        resultCount: data.length,
        personalInformationCount: data.filter((file) => file.containsPersonalInfo).length,
      },
    });
    res.json({ data });
  } catch (error) {
    next(error);
  }
});

router.get("/v1/files/:id/relationships", requireAuth, async (req, res, next) => {
  try {
    const { id } = StoredFileIdParamsSchema.parse(req.params);
    const [file] = await db.select().from(storedFiles)
      .where(and(eq(storedFiles.id, id), isNull(storedFiles.deletedAt)));
    if (!file) throw new ApiError(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
    const relations = await getFileRelations(id);
    if (!(await canReadFile(req.auth!, file.uploadedBy, relations))) {
      throw new ApiError(403, "FILE_ACCESS_DENIED", "파일 관계정보를 조회할 권한이 없습니다.");
    }
    await db.insert(auditLogs).values({
      actorUserId: req.auth!.id, action: "VIEW_RELATIONSHIPS",
      resourceType: "STORED_FILE", resourceId: id, requestId: String(req.id),
      metadata: { containsPersonalInfo: file.containsPersonalInfo, relationCount: relations.length },
    });
    res.json({ file: {
      id: file.id, originalName: file.originalName, mimeType: file.mimeType,
      sizeBytes: file.sizeBytes, containsPersonalInfo: file.containsPersonalInfo,
    }, relations });
  } catch (error) { next(error); }
});

router.get("/v1/files/:id/download", requireAuth, async (req, res, next) => {
  try {
    const { id } = StoredFileIdParamsSchema.parse(req.params);
    const [file] = await db.select().from(storedFiles)
      .where(and(eq(storedFiles.id, id), isNull(storedFiles.deletedAt)));
    if (!file) throw new ApiError(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
    const relations = await getFileRelations(id);
    if (!(await canReadFile(req.auth!, file.uploadedBy, relations))) {
      throw new ApiError(403, "FILE_ACCESS_DENIED", "파일을 다운로드할 권한이 없습니다.");
    }
    const signedUrl = await createPersistedFileDownloadUrl(
      file.storageKey,
      file.originalName,
      file.mimeType,
    );
    await db.insert(auditLogs).values({
      actorUserId: req.auth!.id, action: "DOWNLOAD",
      resourceType: "STORED_FILE", resourceId: id, requestId: String(req.id),
      metadata: {
        containsPersonalInfo: file.containsPersonalInfo,
        relationTypes: [...new Set(relations.map((row) => row.relationType))],
        deliveryMode: signedUrl ? "SIGNED_URL" : "STREAM",
      },
    });
    if (signedUrl) {
      res.redirect(302, signedUrl);
      return;
    }
    const binary = await readPersistedFile(file.storageKey);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", String(binary.length));
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
    res.send(binary);
  } catch (error) { next(error); }
});

router.get(
  "/v1/files/retention/policies",
  requireAuth,
  requireRoles("SYSTEM_ADMIN", "AUDITOR"),
  async (_req, res, next) => {
    try {
      const data = await db
        .select()
        .from(fileRetentionPolicies)
        .where(isNull(fileRetentionPolicies.deletedAt))
        .orderBy(desc(fileRetentionPolicies.isDefault), fileRetentionPolicies.code);
      res.json({ data });
    } catch (error) {
      next(error);
    }
  },
);

router.put(
  "/v1/files/retention/policies/:id",
  requireAuth,
  requireRoles("SYSTEM_ADMIN"),
  async (req, res, next) => {
    try {
      const { id } = StoredFileIdParamsSchema.parse(req.params);
      const input = FileRetentionPolicyUpdateSchema.parse(req.body);
      const result = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(fileRetentionPolicies)
          .where(
            and(
              eq(fileRetentionPolicies.id, id),
              isNull(fileRetentionPolicies.deletedAt),
            ),
          )
          .for("update");
        if (!current) {
          throw new ApiError(
            404,
            "FILE_RETENTION_POLICY_NOT_FOUND",
            "파일 보존정책을 찾을 수 없습니다.",
          );
        }
        if (
          current.isDefault &&
          (input.isDefault === false || input.isActive === false)
        ) {
          throw new ApiError(
            409,
            "DEFAULT_RETENTION_POLICY_REQUIRED",
            "기본 보존정책은 기본값 또는 활성 상태를 해제할 수 없습니다.",
          );
        }
        if (input.isDefault === true) {
          await tx
            .update(fileRetentionPolicies)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(fileRetentionPolicies.isDefault, true));
        }
        const updateValues = {
          ...input,
          ...(input.isDefault === true ? { isActive: true } : {}),
          updatedAt: new Date(),
        };
        const [updated] = await tx
          .update(fileRetentionPolicies)
          .set(updateValues)
          .where(eq(fileRetentionPolicies.id, id))
          .returning();
        await tx.insert(auditLogs).values({
          actorUserId: req.auth!.id,
          action: "UPDATE",
          resourceType: "FILE_RETENTION_POLICY",
          resourceId: id,
          requestId: String(req.id),
          before: current,
          after: updated,
          changedFields: Object.keys(input),
        });
        return updated;
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/files/:id/legal-hold",
  requireAuth,
  requireRoles("SYSTEM_ADMIN", "AUDITOR"),
  async (req, res, next) => {
    try {
      const { id } = StoredFileIdParamsSchema.parse(req.params);
      const input = FileLegalHoldInputSchema.parse(req.body);
      const legalHoldUntil = input.until ? new Date(input.until) : null;
      const result = await db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(storedFiles)
          .where(
            and(eq(storedFiles.id, id), isNull(storedFiles.purgedAt)),
          )
          .for("update");
        if (!current) {
          throw new ApiError(
            404,
            "FILE_NOT_FOUND",
            "파일을 찾을 수 없습니다.",
          );
        }
        const [updated] = await tx
          .update(storedFiles)
          .set({ legalHoldUntil })
          .where(eq(storedFiles.id, id))
          .returning();
        await tx.insert(auditLogs).values({
          actorUserId: req.auth!.id,
          action: legalHoldUntil ? "LEGAL_HOLD_SET" : "LEGAL_HOLD_RELEASED",
          resourceType: "STORED_FILE",
          resourceId: id,
          requestId: String(req.id),
          reason: input.reason,
          before: {
            legalHoldUntil: current.legalHoldUntil?.toISOString() ?? null,
          },
          after: {
            legalHoldUntil: legalHoldUntil?.toISOString() ?? null,
          },
        });
        return updated;
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/files/retention/cleanup",
  requireAuth,
  requireRoles("SYSTEM_ADMIN", "AUDITOR"),
  async (req, res, next) => {
    try {
      const input = FileRetentionCleanupInputSchema.parse(req.body);
      if (!input.dryRun && !req.auth!.roles.includes("SYSTEM_ADMIN")) {
        throw new ApiError(
          403,
          "FILE_RETENTION_EXECUTION_DENIED",
          "실제 파일 정리는 시스템 관리자만 실행할 수 있습니다.",
        );
      }
      const now = new Date();
      const files = await listExpiredOrPendingFiles(now, input.limit);
      const candidates = [];
      let purged = 0;

      for (const file of files) {
        const relations = await getFileRelations(file.id);
        const outcome = evaluateRetentionOutcome({
          now,
          legalHoldUntil: file.legalHoldUntil,
          relationCount: relations.length,
        });
        candidates.push({
          id: file.id,
          originalName: file.originalName,
          expiresAt: (file.expiresAt ?? file.purgeRequestedAt ?? now).toISOString(),
          containsPersonalInfo: file.containsPersonalInfo,
          outcome,
          relationCount: relations.length,
        });
        if (input.dryRun || outcome !== "ELIGIBLE") continue;

        const requestedAt = file.purgeRequestedAt ?? new Date();
        await db.transaction(async (tx) => {
          await tx
            .update(storedFiles)
            .set({
              purgeRequestedAt: requestedAt,
              deletedAt: file.deletedAt ?? requestedAt,
            })
            .where(eq(storedFiles.id, file.id));
          await tx.insert(auditLogs).values({
            actorUserId: req.auth!.id,
            action: "PURGE_REQUEST",
            resourceType: "STORED_FILE",
            resourceId: file.id,
            requestId: String(req.id),
            metadata: {
              expiresAt: file.expiresAt?.toISOString() ?? null,
              containsPersonalInfo: file.containsPersonalInfo,
            },
          });
        });

        await removePersistedFile(file.storageKey);
        const purgedAt = new Date();
        await db.transaction(async (tx) => {
          await tx
            .update(storedFiles)
            .set({ purgedAt })
            .where(eq(storedFiles.id, file.id));
          await tx.insert(auditLogs).values({
            actorUserId: req.auth!.id,
            action: "PURGE",
            resourceType: "STORED_FILE",
            resourceId: file.id,
            requestId: String(req.id),
            before: { purgedAt: null },
            after: { purgedAt: purgedAt.toISOString() },
          });
        });
        purged += 1;
      }

      res.json({
        dryRun: input.dryRun,
        evaluated: files.length,
        purged,
        candidates,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.delete("/v1/files/:id", requireAuth, async (req, res, next) => {
  try {
    const { id } = StoredFileIdParamsSchema.parse(req.params);
    await db.transaction(async (tx) => {
      const [file] = await tx.select().from(storedFiles)
        .where(and(eq(storedFiles.id, id), isNull(storedFiles.deletedAt))).for("update");
      if (!file) throw new ApiError(404, "FILE_NOT_FOUND", "파일을 찾을 수 없습니다.");
      if (file.uploadedBy !== req.auth!.id && !req.auth!.roles.includes("SYSTEM_ADMIN")) {
        throw new ApiError(403, "FILE_ARCHIVE_DENIED", "업로더 또는 시스템 관리자만 파일을 보관할 수 있습니다.");
      }
      const relations = await getFileRelations(id);
      if (relations.length > 0) {
        throw new ApiError(409, "FILE_IN_USE", "업무 데이터에 연결된 파일은 보관할 수 없습니다.");
      }
      await tx.update(storedFiles).set({ deletedAt: new Date() }).where(eq(storedFiles.id, id));
      await tx.insert(auditLogs).values({
        actorUserId: req.auth!.id, action: "ARCHIVE",
        resourceType: "STORED_FILE", resourceId: id, requestId: String(req.id),
        before: { deletedAt: null }, after: { deletedAt: new Date().toISOString() },
      });
    });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post(
  "/v1/files",
  requireAuth,
  fileWriters,
  upload.single("file"),
  async (req, res, next) => {
    let persisted:
      | Awaited<ReturnType<typeof persistEvidenceFile>>
      | undefined;
    try {
      if (!req.file) {
        throw new ApiError(
          400,
          "FILE_REQUIRED",
          "업로드할 파일이 필요합니다.",
        );
      }
      const metadata = FileUploadMetadataSchema.parse(req.body);
      const extension = validateEvidenceFile(req.file);
      const scan = await scanFileForMalware(req.file.buffer, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      const retentionPolicy = await getDefaultRetentionPolicy();
      const createdAt = new Date();
      const expiresAt = calculateFileExpiry(
        createdAt,
        retentionPolicy,
        metadata.containsPersonalInfo,
      );
      persisted = await persistEvidenceFile(req.file.buffer, extension);
      const result = await db.transaction(async (tx) => {
        const [file] = await tx
          .insert(storedFiles)
          .values({
            ...persisted!,
            originalName: req.file!.originalname,
            extension,
            mimeType: req.file!.mimetype,
            sizeBytes: req.file!.size,
            containsPersonalInfo: metadata.containsPersonalInfo,
            retentionPolicyId: retentionPolicy.id,
            expiresAt,
            createdAt,
            isPublic: false,
            uploadedBy: req.auth!.id,
          })
          .returning();
        await tx.insert(auditLogs).values({
          actorUserId: req.auth!.id,
          action: "UPLOAD",
          resourceType: "STORED_FILE",
          resourceId: file?.id,
          requestId: String(req.id),
          metadata: {
            extension,
            sizeBytes: req.file!.size,
            containsPersonalInfo: metadata.containsPersonalInfo,
            malwareScanStatus: scan.status,
            malwareScanEngine: scan.engine,
            retentionPolicyCode: retentionPolicy.code,
            expiresAt: expiresAt.toISOString(),
          },
        });
        return file;
      });
      res.status(201).json(result);
    } catch (error) {
      if (
        error instanceof ApiError &&
        ["FILE_MALWARE_DETECTED", "MALWARE_SCAN_UNAVAILABLE"].includes(
          error.code,
        )
      ) {
        try {
          await db.insert(auditLogs).values({
            actorUserId: req.auth!.id,
            action: "UPLOAD_REJECTED",
            resourceType: "STORED_FILE",
            requestId: String(req.id),
            metadata: {
              reasonCode: error.code,
              extension:
                req.file?.originalname.split(".").pop()?.toLowerCase() ?? null,
              sizeBytes: req.file?.size ?? null,
            },
          });
        } catch (auditError) {
          req.log.error(
            { err: auditError, reasonCode: error.code },
            "Failed to audit rejected file upload",
          );
        }
      }
      if (persisted) {
        try {
          await removePersistedFile(persisted.storageKey);
        } catch (cleanupError) {
          req.log.error(
            { err: cleanupError, storageKey: persisted.storageKey },
            "Failed to clean up orphaned uploaded file",
          );
        }
      }
      next(error);
    }
  },
);

export default router;
