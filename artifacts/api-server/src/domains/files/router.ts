import { Router, type IRouter } from "express";
import multer from "multer";
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import { auditLogs, storedFiles, users } from "@workspace/db/schema";
import { FileUploadMetadataSchema } from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  MAX_EVIDENCE_FILE_BYTES,
  persistEvidenceFile,
  removePersistedFile,
  validateEvidenceFile,
} from "./storage";

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
);

router.get("/v1/files", requireAuth, fileReaders, async (_req, res, next) => {
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
    res.json({ data });
  } catch (error) {
    next(error);
  }
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
          },
        });
        return file;
      });
      res.status(201).json(result);
    } catch (error) {
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
