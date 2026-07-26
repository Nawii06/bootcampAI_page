import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  contentAttachments,
  contentItems,
} from "@workspace/db/schema";
import type { z } from "zod";
import {
  ContentDecisionSchema,
  ContentItemInputSchema,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";

type ContentInput = z.infer<typeof ContentItemInputSchema>;
type ContentDecision = z.infer<typeof ContentDecisionSchema>;

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
    const [updated] = await tx.update(contentItems).set({
      status: transition.to,
      reviewedBy: ["APPROVE", "PUBLISH"].includes(command.action) ? actorId : current.reviewedBy,
      publishedAt: command.action === "PUBLISH" ? now : current.publishedAt,
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
