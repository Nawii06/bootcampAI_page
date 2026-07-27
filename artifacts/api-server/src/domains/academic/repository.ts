import { and, asc, count, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  auditLogs,
  businessYears,
  courseMasters,
  courseOfferings,
  curricula,
  curriculumRequirements,
  importJobs,
  importStagingRows,
  terms,
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

export function listCurricula(filters: {
  businessYearId?: string;
  isPublished?: boolean;
}) {
  return db
    .select()
    .from(curricula)
    .where(
      and(
        isNull(curricula.deletedAt),
        filters.businessYearId
          ? eq(curricula.businessYearId, filters.businessYearId)
          : undefined,
        filters.isPublished === undefined
          ? undefined
          : eq(curricula.isPublished, filters.isPublished),
      ),
    )
    .orderBy(asc(curricula.code), asc(curricula.version));
}

export function listCurriculumRequirements(curriculumId: string) {
  return db
    .select()
    .from(curriculumRequirements)
    .where(
      and(
        eq(curriculumRequirements.curriculumId, curriculumId),
        isNull(curriculumRequirements.deletedAt),
      ),
    )
    .orderBy(
      asc(curriculumRequirements.sortOrder),
      asc(curriculumRequirements.code),
    );
}

export function listCourseOfferings(filters: {
  businessYearId?: string;
  termId?: string;
  courseMasterId?: string;
  isActive?: boolean;
}) {
  return db
    .select({
      offering: courseOfferings,
      courseCode: courseMasters.courseCode,
      courseName: courseMasters.name,
      businessYearName: businessYears.name,
      termName: terms.name,
    })
    .from(courseOfferings)
    .innerJoin(
      courseMasters,
      eq(courseMasters.id, courseOfferings.courseMasterId),
    )
    .innerJoin(
      businessYears,
      eq(businessYears.id, courseOfferings.businessYearId),
    )
    .innerJoin(terms, eq(terms.id, courseOfferings.termId))
    .where(
      and(
        isNull(courseOfferings.deletedAt),
        isNull(courseMasters.deletedAt),
        filters.businessYearId
          ? eq(courseOfferings.businessYearId, filters.businessYearId)
          : undefined,
        filters.termId ? eq(courseOfferings.termId, filters.termId) : undefined,
        filters.courseMasterId
          ? eq(courseOfferings.courseMasterId, filters.courseMasterId)
          : undefined,
        filters.isActive === undefined
          ? undefined
          : eq(courseOfferings.isActive, filters.isActive),
      ),
    )
    .orderBy(
      asc(businessYears.year),
      asc(terms.startsAt),
      asc(courseMasters.courseCode),
      asc(courseOfferings.sectionCode),
    );
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
  courseOfferings,
  curricula,
  curriculumRequirements,
  importJobs,
  importStagingRows,
};
