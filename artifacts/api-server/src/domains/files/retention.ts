import {
  and,
  desc,
  eq,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { db } from "@workspace/db";
import {
  fileRetentionPolicies,
  storedFiles,
} from "@workspace/db/schema";
import { ApiError } from "../../lib/api-error";

export async function getDefaultRetentionPolicy() {
  const [policy] = await db
    .select()
    .from(fileRetentionPolicies)
    .where(
      and(
        eq(fileRetentionPolicies.isDefault, true),
        eq(fileRetentionPolicies.isActive, true),
        isNull(fileRetentionPolicies.deletedAt),
      ),
    )
    .orderBy(desc(fileRetentionPolicies.updatedAt))
    .limit(1);
  if (!policy) {
    throw new ApiError(
      503,
      "FILE_RETENTION_POLICY_MISSING",
      "활성 기본 파일 보존정책이 없습니다.",
    );
  }
  return policy;
}

export async function listExpiredOrPendingFiles(now: Date, limit: number) {
  return db
    .select({
      id: storedFiles.id,
      storageKey: storedFiles.storageKey,
      originalName: storedFiles.originalName,
      containsPersonalInfo: storedFiles.containsPersonalInfo,
      expiresAt: storedFiles.expiresAt,
      legalHoldUntil: storedFiles.legalHoldUntil,
      purgeRequestedAt: storedFiles.purgeRequestedAt,
      deletedAt: storedFiles.deletedAt,
    })
    .from(storedFiles)
    .where(
      and(
        isNull(storedFiles.purgedAt),
        or(
          and(
            isNull(storedFiles.deletedAt),
            isNotNull(storedFiles.expiresAt),
            lte(storedFiles.expiresAt, now),
          ),
          and(
            isNotNull(storedFiles.purgeRequestedAt),
            isNotNull(storedFiles.deletedAt),
          ),
        ),
      ),
    )
    .orderBy(storedFiles.expiresAt)
    .limit(limit);
}
