import {
  and,
  count,
  desc,
  eq,
  gte,
  lte,
  type SQL,
} from "drizzle-orm";
import { db } from "@workspace/db";
import { auditLogs, users } from "@workspace/db/schema";
import type { AuditLogQuery } from "@workspace/api-zod";
import { csvCell, maskAuditValue, maskIpAddress } from "./sanitizer";

function conditionsFor(filters: AuditLogQuery) {
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
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.resourceType) {
    conditions.push(eq(auditLogs.resourceType, filters.resourceType));
  }
  if (filters.resourceId) {
    conditions.push(eq(auditLogs.resourceId, filters.resourceId));
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listAuditLogs(filters: AuditLogQuery) {
  const where = conditionsFor(filters);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        actorUserId: auditLogs.actorUserId,
        actorDisplayName: users.displayName,
        actorRole: auditLogs.actorRole,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        requestId: auditLogs.requestId,
        reason: auditLogs.reason,
        changedFields: auditLogs.changedFields,
        before: auditLogs.before,
        after: auditLogs.after,
        metadata: auditLogs.metadata,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        occurredAt: auditLogs.occurredAt,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(where)
      .orderBy(desc(auditLogs.occurredAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ total: count() }).from(auditLogs).where(where),
  ]);

  return {
    data: rows.map((row) => ({
      ...row,
      changedFields: row.changedFields ?? [],
      before: (maskAuditValue(row.before) as Record<string, unknown> | null),
      after: (maskAuditValue(row.after) as Record<string, unknown> | null),
      metadata: maskAuditValue(row.metadata) as Record<string, unknown>,
      ipAddress: maskIpAddress(row.ipAddress),
      userAgent: row.userAgent?.slice(0, 200) ?? null,
      occurredAt: row.occurredAt.toISOString(),
    })),
    meta: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
    },
  };
}

export function auditLogsToCsv(
  rows: Awaited<ReturnType<typeof listAuditLogs>>["data"],
) {
  const headers = [
    "occurredAt",
    "actorDisplayName",
    "actorRole",
    "action",
    "resourceType",
    "resourceId",
    "requestId",
    "reason",
    "changedFields",
    "metadata",
  ];
  const lines = rows.map((row) =>
    [
      row.occurredAt,
      row.actorDisplayName,
      row.actorRole,
      row.action,
      row.resourceType,
      row.resourceId,
      row.requestId,
      row.reason,
      row.changedFields,
      row.metadata,
    ]
      .map(csvCell)
      .join(","),
  );
  return `\uFEFF${headers.map(csvCell).join(",")}\r\n${lines.join("\r\n")}`;
}
