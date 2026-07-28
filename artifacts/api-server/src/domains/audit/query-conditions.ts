import {
  and,
  eq,
  gte,
  inArray,
  lte,
  type SQL,
} from "drizzle-orm";
import { auditLogs } from "@workspace/db/schema";
import type { AuditLogQuery } from "@workspace/api-zod";

export function conditionsFor(filters: AuditLogQuery) {
  const conditions: SQL[] = [];
  if (filters.startAt) {
    conditions.push(gte(auditLogs.occurredAt, new Date(filters.startAt)));
  }
  if (filters.endAt) {
    conditions.push(lte(auditLogs.occurredAt, new Date(filters.endAt)));
  }
  if (filters.actorUserId) {
    conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  }
  if (filters.action?.length) {
    conditions.push(inArray(auditLogs.action, filters.action));
  }
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  }
  if (filters.resourceId) {
    conditions.push(eq(auditLogs.resourceId, filters.resourceId));
  }
  return conditions.length ? and(...conditions) : undefined;
}
