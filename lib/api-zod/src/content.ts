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
});

export const ContentIdParamsSchema = z.object({ id: z.string().uuid() });

export const PublicContentQuerySchema = z.object({
  contentType: z
    .enum(["NOTICE", "RECRUITMENT", "NEWS", "PERFORMANCE_CASE", "RESOURCE"])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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
