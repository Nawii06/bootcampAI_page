import { and, asc, count, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  courseMasters,
  importJobs,
  importStagingRows,
} from "@workspace/db/schema";

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = typeof db | Transaction;

export async function listCourses(
  search: string | undefined,
  page: number,
  pageSize: number,
) {
  const condition = and(
    isNull(courseMasters.deletedAt),
    search
      ? or(
          ilike(courseMasters.courseCode, `%${search}%`),
          ilike(courseMasters.name, `%${search}%`),
        )
      : undefined,
  );
  const offset = (page - 1) * pageSize;
  const [rows, totals] = await Promise.all([
    db
      .select()
      .from(courseMasters)
      .where(condition)
      .orderBy(asc(courseMasters.courseCode))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(courseMasters).where(condition),
  ]);
  return { rows, total: totals[0]?.value ?? 0 };
}

export function findCoursesByExternalIds(
  executor: DbExecutor,
  sourceSystem: string,
  externalIds: string[],
) {
  if (externalIds.length === 0) {
    return Promise.resolve([]);
  }
  return executor
    .select()
    .from(courseMasters)
    .where(
      and(
        eq(courseMasters.sourceSystem, sourceSystem),
        inArray(courseMasters.externalId, externalIds),
        isNull(courseMasters.deletedAt),
      ),
    );
}

export function findImportJob(id: string) {
  return db.query.importJobs.findFirst({
    where: eq(importJobs.id, id),
  });
}

export function findImportRows(id: string) {
  return db
    .select()
    .from(importStagingRows)
    .where(eq(importStagingRows.importJobId, id))
    .orderBy(asc(importStagingRows.rowNumber));
}

export {
  auditLogs,
  courseMasters,
  importJobs,
  importStagingRows,
};
