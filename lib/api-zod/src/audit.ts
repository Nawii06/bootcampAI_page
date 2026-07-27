import { z } from "zod";
import { PaginationMetaSchema } from "./common";

const AuditLogQueryBaseSchema = z.object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    actorUserId: z.string().uuid().optional(),
    action: z.string().trim().min(1).max(100).optional(),
    resourceType: z.string().trim().min(1).max(100).optional(),
    resourceId: z.string().trim().min(1).max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(50),
  });

function validateAuditDateRange(
  value: { startAt?: string; endAt?: string },
  context: z.RefinementCtx,
) {
    if (value.startAt && value.endAt) {
      const start = new Date(value.startAt);
      const end = new Date(value.endAt);
      if (start > end) {
        context.addIssue({
          code: "custom",
          path: ["endAt"],
          message: "종료일시는 시작일시 이후여야 합니다.",
        });
      }
      if (end.getTime() - start.getTime() > 93 * 24 * 60 * 60 * 1_000) {
        context.addIssue({
          code: "custom",
          path: ["endAt"],
          message: "한 번에 조회할 수 있는 기간은 최대 93일입니다.",
        });
      }
    }
}

export const AuditLogQuerySchema = AuditLogQueryBaseSchema.superRefine(
  validateAuditDateRange,
);

export const AuditLogFiltersSchema = AuditLogQueryBaseSchema
  .omit({ page: true, pageSize: true })
  .superRefine(validateAuditDateRange);

export const AuditLogItemSchema = z.object({
  id: z.string().uuid(),
  actorUserId: z.string().uuid().nullable(),
  actorDisplayName: z.string().nullable(),
  actorRole: z.string().nullable(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  requestId: z.string(),
  reason: z.string().nullable(),
  changedFields: z.array(z.string()),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  occurredAt: z.string(),
});

export const AuditLogListResponseSchema = z.object({
  data: z.array(AuditLogItemSchema),
  meta: PaginationMetaSchema,
});

export const AuditLogExportInputSchema = z.object({
  purpose: z.string().trim().min(5).max(500),
  filters: AuditLogFiltersSchema.default({}),
}).superRefine((value, context) => {
  if (!value.filters.startAt || !value.filters.endAt) {
    context.addIssue({
      code: "custom",
      path: ["filters"],
      message: "내보내기에는 시작일시와 종료일시가 필요합니다.",
    });
  }
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
export type AuditLogItem = z.infer<typeof AuditLogItemSchema>;
