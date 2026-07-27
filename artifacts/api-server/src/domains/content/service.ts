import { and, count, desc, eq, isNull, lte, max } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  contentAttachments,
  contentItems,
  contentVersions,
} from "@workspace/db/schema";
import type { z } from "zod";
import {
  ContentDecisionSchema,
  ContentItemInputSchema,
  ContentItemUpdateSchema,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";

type ContentInput = z.infer<typeof ContentItemInputSchema>;
type ContentDecision = z.infer<typeof ContentDecisionSchema>;
type ContentUpdate = z.infer<typeof ContentItemUpdateSchema>;

function contentSnapshot(item: typeof contentItems.$inferSelect, attachmentFileIds: string[]) {
  return {
    businessYearId: item.businessYearId,
    contentType: item.contentType,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    body: item.body,
    metadata: item.metadata,
    status: item.status,
    isPinned: item.isPinned,
    attachmentFileIds,
  };
}

export function createContent(
  input: ContentInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const { attachmentFileIds, ...content } = input;
    const [item] = await tx.insert(contentItems).values({
      ...content, authorId: actorId, status: "DRAFT",
    }).returning();
    if (!item) throw new ApiError(500, "CONTENT_CREATE_FAILED", "콘텐츠를 생성하지 못했습니다.");
    if (attachmentFileIds.length > 0) {
      await tx.insert(contentAttachments).values(
        attachmentFileIds.map((fileId) => ({ contentId: item.id, fileId })),
      );
    }
    await tx.insert(contentVersions).values({
      contentId: item.id,
      version: 1,
      snapshot: contentSnapshot(item, attachmentFileIds),
      changeSummary: "초안 생성",
      createdBy: actorId,
    });
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "CREATE", resourceType: "CONTENT_ITEM",
      resourceId: item.id, businessYearId: input.businessYearId, requestId,
      after: { contentType: input.contentType, slug: input.slug, title: input.title },
    });
    return item;
  });
}

const transitions = {
  SUBMIT_REVIEW: { from: ["DRAFT"], to: "IN_REVIEW" },
  APPROVE: { from: ["IN_REVIEW"], to: "APPROVED" },
  PUBLISH: { from: ["APPROVED"], to: "PUBLISHED" },
  ARCHIVE: { from: ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"], to: "ARCHIVED" },
} as const;

export async function listInternalContent(filters: {
  contentType?: string;
  status?: string;
}) {
  const items = await db.select().from(contentItems).where(and(
    filters.contentType ? eq(contentItems.contentType, filters.contentType) : undefined,
    filters.status ? eq(contentItems.status, filters.status as typeof contentItems.status.enumValues[number]) : undefined,
    isNull(contentItems.deletedAt),
  )).orderBy(desc(contentItems.updatedAt));
  const itemIds = new Set(items.map((row) => row.id));
  const attachments = (await db.select().from(contentAttachments))
    .filter((row) => itemIds.has(row.contentId));
  return { data: items, attachments };
}

export function updateContent(id: string, input: ContentUpdate, actorId: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(contentItems)
      .where(and(eq(contentItems.id, id), isNull(contentItems.deletedAt))).for("update");
    if (!current) throw new ApiError(404, "CONTENT_NOT_FOUND", "콘텐츠를 찾을 수 없습니다.");
    if (current.status !== "DRAFT") {
      throw new ApiError(409, "CONTENT_NOT_EDITABLE", "초안 상태의 콘텐츠만 수정할 수 있습니다.");
    }
    const currentAttachmentIds = (
      await tx.select({ fileId: contentAttachments.fileId }).from(contentAttachments)
        .where(eq(contentAttachments.contentId, id))
    ).map((row) => row.fileId);
    const [currentVersionRow] = await tx.select({ value: max(contentVersions.version) })
      .from(contentVersions).where(eq(contentVersions.contentId, id));
    const currentVersion = currentVersionRow?.value ?? 0;
    if (currentVersion === 0) {
      await tx.insert(contentVersions).values({
        contentId: id,
        version: 1,
        snapshot: contentSnapshot(current, currentAttachmentIds),
        changeSummary: "버전 관리 도입 시점 기준본",
        createdBy: actorId,
      });
    }
    const { attachmentFileIds, changeSummary, ...changes } = input;
    const [updated] = await tx.update(contentItems).set({
      ...changes,
      updatedAt: new Date(),
    }).where(eq(contentItems.id, id)).returning();
    if (!updated) throw new ApiError(500, "CONTENT_UPDATE_FAILED", "콘텐츠를 수정하지 못했습니다.");
    if (attachmentFileIds) {
      await tx.delete(contentAttachments).where(eq(contentAttachments.contentId, id));
      if (attachmentFileIds.length) {
        await tx.insert(contentAttachments).values(
          attachmentFileIds.map((fileId) => ({ contentId: id, fileId })),
        );
      }
    }
    const effectiveAttachmentIds = attachmentFileIds ?? currentAttachmentIds;
    const version = Math.max(1, currentVersion) + 1;
    await tx.insert(contentVersions).values({
      contentId: id,
      version,
      snapshot: contentSnapshot(updated, effectiveAttachmentIds),
      changeSummary,
      createdBy: actorId,
    });
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: "UPDATE", resourceType: "CONTENT_ITEM",
      resourceId: id, businessYearId: current.businessYearId, requestId,
      before: contentSnapshot(current, currentAttachmentIds),
      after: contentSnapshot(updated, effectiveAttachmentIds),
      changedFields: Object.keys(changes).concat(attachmentFileIds ? ["attachmentFileIds"] : []),
      reason: changeSummary,
      metadata: { version },
    });
    return updated;
  });
}

export function listContentVersions(id: string) {
  return db.select().from(contentVersions)
    .where(eq(contentVersions.contentId, id))
    .orderBy(desc(contentVersions.version));
}

export function transitionContent(
  id: string,
  command: ContentDecision,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(contentItems)
      .where(and(eq(contentItems.id, id), isNull(contentItems.deletedAt))).for("update");
    if (!current) throw new ApiError(404, "CONTENT_NOT_FOUND", "콘텐츠를 찾을 수 없습니다.");
    const transition = transitions[command.action];
    if (!(transition.from as readonly string[]).includes(current.status)) {
      throw new ApiError(409, "INVALID_CONTENT_TRANSITION", "현재 상태에서 수행할 수 없는 작업입니다.");
    }
    const now = new Date();
    const publishAt = command.action === "PUBLISH" && command.publishAt
      ? new Date(command.publishAt)
      : now;
    const [updated] = await tx.update(contentItems).set({
      status: transition.to,
      reviewedBy: command.action === "APPROVE" ? actorId : current.reviewedBy,
      publishedAt: command.action === "PUBLISH" ? publishAt : current.publishedAt,
      updatedAt: now,
    }).where(eq(contentItems.id, id)).returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId, action: command.action, resourceType: "CONTENT_ITEM",
      resourceId: id, businessYearId: current.businessYearId, requestId,
      before: { status: current.status }, after: { status: transition.to },
    });
    return updated;
  });
}

export async function listPublicContent(
  contentType: string | undefined,
  page: number,
  pageSize: number,
) {
  const condition = and(
      eq(contentItems.status, "PUBLISHED"),
    lte(contentItems.publishedAt, new Date()),
    contentType ? eq(contentItems.contentType, contentType) : undefined,
    isNull(contentItems.deletedAt),
  );
  const [data, totals] = await Promise.all([
    db.select().from(contentItems).where(condition)
      .orderBy(desc(contentItems.isPinned), desc(contentItems.publishedAt))
      .limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: count() }).from(contentItems).where(condition),
  ]);
  return { data, meta: { page, pageSize, total: totals[0]?.value ?? 0 } };
}
