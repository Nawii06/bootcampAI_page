import { z } from "zod";

export const ContentItemInputSchema = z.object({
  businessYearId: z.string().uuid().optional(),
  contentType: z.enum([
    "NOTICE",
    "RECRUITMENT",
    "NEWS",
    "PERFORMANCE_CASE",
    "RESOURCE",
  ]),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(150)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(300),
  summary: z.string().trim().max(1000).optional(),
  body: z.string().trim().min(1).max(100_000),
  metadata: z.record(z.string(), z.unknown()).default({}),
  isPinned: z.boolean().default(false),
  attachmentFileIds: z.array(z.string().uuid()).default([]),
});

export const ContentDecisionSchema = z.object({
  action: z.enum(["SUBMIT_REVIEW", "APPROVE", "PUBLISH", "ARCHIVE"]),
  publishAt: z.string().datetime().optional(),
}).superRefine((value, context) => {
  if (value.action !== "PUBLISH" && value.publishAt) {
    context.addIssue({
      code: "custom",
      path: ["publishAt"],
      message: "발행일시는 발행 작업에서만 지정할 수 있습니다.",
    });
  }
});

export const ContentIdParamsSchema = z.object({ id: z.string().uuid() });

export const ContentItemUpdateSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  summary: z.string().trim().max(1000).nullable().optional(),
  body: z.string().trim().min(1).max(100_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isPinned: z.boolean().optional(),
  attachmentFileIds: z.array(z.string().uuid()).optional(),
  changeSummary: z.string().trim().min(1).max(500),
}).refine(
  (value) => Object.keys(value).some((key) => key !== "changeSummary"),
  { message: "변경할 콘텐츠 값이 필요합니다." },
);

export const PublicContentQuerySchema = z.object({
  contentType: z
    .enum(["NOTICE", "RECRUITMENT", "NEWS", "PERFORMANCE_CASE", "RESOURCE"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const InternalContentQuerySchema = z.object({
  contentType: z
    .enum(["NOTICE", "RECRUITMENT", "NEWS", "PERFORMANCE_CASE", "RESOURCE"])
    .optional(),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]).optional(),
});

export const ContentItemResponseSchema = z.object({
  id: z.string().uuid(),
  contentType: z.enum(["NOTICE", "RECRUITMENT", "NEWS", "PERFORMANCE_CASE", "RESOURCE"]),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  body: z.string(),
  status: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"]),
  isPinned: z.boolean(),
  publishedAt: z.string().datetime().nullable().optional(),
}).passthrough();

export const ContentAttachmentResponseSchema = z.object({
  id: z.string().uuid(),
  contentId: z.string().uuid(),
  fileId: z.string().uuid(),
  label: z.string().nullable().optional(),
}).passthrough();

export const ContentOperationsResponseSchema = z.object({
  data: z.array(ContentItemResponseSchema),
  attachments: z.array(ContentAttachmentResponseSchema),
});

export const ContentVersionResponseSchema = z.object({
  id: z.string().uuid(),
  contentId: z.string().uuid(),
  version: z.number().int().positive(),
  snapshot: z.record(z.string(), z.unknown()),
  changeSummary: z.string(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
});

export const ContentVersionListResponseSchema = z.object({
  data: z.array(ContentVersionResponseSchema),
});

export const PublicContentItemResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  summary: z.string().nullable().optional(),
  body: z.string(),
  publishedAt: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
}).passthrough();

export const PublicContentListResponseSchema = z.object({
  data: z.array(PublicContentItemResponseSchema),
  meta: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
  }),
});

export const FileUploadMetadataSchema = z.object({
  containsPersonalInfo: z
    .preprocess(
      (value) =>
        value === true || value === "true"
          ? true
          : value === false || value === "false" || value === undefined
            ? false
            : value,
      z.boolean(),
    )
    .default(false),
});

export const StoredFileIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const FileRetentionCleanupInputSchema = z.object({
  dryRun: z.boolean().default(true),
  limit: z.number().int().min(1).max(500).default(100),
});

export const FileLegalHoldInputSchema = z.object({
  until: z.string().datetime().nullable(),
  reason: z.string().trim().min(1).max(2_000),
});

export const FileRetentionPolicyUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    retentionDays: z.number().int().min(1).max(36_500).optional(),
    personalInfoRetentionDays: z.number().int().min(1).max(36_500).optional(),
    isDefault: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "변경할 보존정책 값이 필요합니다.",
  });

export const FileRetentionCandidateSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  expiresAt: z.string(),
  containsPersonalInfo: z.boolean(),
  outcome: z.enum(["ELIGIBLE", "SKIPPED_RELATION", "SKIPPED_LEGAL_HOLD"]),
  relationCount: z.number().int().nonnegative(),
});

export const FileRetentionCleanupResponseSchema = z.object({
  dryRun: z.boolean(),
  evaluated: z.number().int().nonnegative(),
  purged: z.number().int().nonnegative(),
  candidates: z.array(FileRetentionCandidateSchema),
});

export const StoredFileResponseSchema = z.object({
  id: z.string().uuid(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  containsPersonalInfo: z.boolean(),
  isPublic: z.boolean().optional().default(false),
  uploadedByName: z.string().optional().default(""),
  createdAt: z.string().optional().default(""),
}).passthrough();

export const StoredFileListResponseSchema = z.object({
  data: z.array(StoredFileResponseSchema),
});

export const FileRelationshipResponseSchema = z.object({
  relationType: z.string(),
  relationId: z.string().uuid(),
}).passthrough();

export const StoredFileRelationshipsResponseSchema = z.object({
  file: StoredFileResponseSchema,
  relations: z.array(FileRelationshipResponseSchema),
});

export type StoredFileResponse = z.infer<typeof StoredFileResponseSchema>;
