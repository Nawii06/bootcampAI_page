import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  CourseImportRowSchema,
  type CourseMasterInput,
  type StageCourseImport,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import {
  auditLogs,
  courseMasters,
  findCoursesByExternalIds,
  findImportJob,
  findImportRows,
  importJobs,
  importStagingRows,
  listCourses,
} from "./repository";

function serializeCourse(row: typeof courseMasters.$inferSelect) {
  return {
    ...row,
    defaultCredits: Number(row.defaultCredits),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    englishName: row.englishName ?? undefined,
    description: row.description ?? undefined,
    departmentCode: row.departmentCode ?? undefined,
    sourceSystem: row.sourceSystem ?? undefined,
    externalId: row.externalId ?? undefined,
  };
}

export async function getCourses(
  search: string | undefined,
  page: number,
  pageSize: number,
) {
  const { rows, total } = await listCourses(search, page, pageSize);
  return {
    data: rows.map(serializeCourse),
    meta: { page, pageSize, total },
  };
}

export async function createCourse(
  input: CourseMasterInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(courseMasters)
      .values({
        ...input,
        defaultCredits: String(input.defaultCredits),
      })
      .returning();
    if (!created) {
      throw new ApiError(500, "CREATE_FAILED", "교과목을 생성하지 못했습니다.");
    }
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "COURSE_MASTER",
      resourceId: created.id,
      requestId,
      changedFields: Object.keys(input),
      after: input,
    });
    return serializeCourse(created);
  });
}

export async function stageCourseImport(
  input: StageCourseImport,
  actorId: string,
  requestId: string,
) {
  const parsedRows = input.rows.map((raw, index) => {
    const result = CourseImportRowSchema.safeParse(raw);
    return {
      rowNumber: index + 1,
      raw,
      result,
    };
  });
  const validRows = parsedRows.filter((row) => row.result.success);
  const invalidRows = parsedRows.length - validRows.length;

  return db.transaction(async (tx) => {
    const [job] = await tx
      .insert(importJobs)
      .values({
        businessYearId: input.businessYearId,
        termId: input.termId,
        entityType: "COURSE_MASTER",
        sourceSystem: input.sourceSystem,
        sourceType: input.sourceType,
        fileName: input.fileName,
        fileHash: input.fileHash,
        status: "VALIDATED",
        totalRows: parsedRows.length,
        validRows: validRows.length,
        invalidRows,
        createdBy: actorId,
      })
      .returning();
    if (!job) {
      throw new ApiError(500, "IMPORT_CREATE_FAILED", "가져오기 작업을 생성하지 못했습니다.");
    }

    await tx.insert(importStagingRows).values(
      parsedRows.map(({ rowNumber, raw, result }) => ({
        importJobId: job.id,
        rowNumber,
        sourceSystem: input.sourceSystem,
        externalId: result.success ? result.data.externalId : undefined,
        rawData: raw as Record<string, unknown>,
        normalizedData: result.success ? result.data : {},
        status: result.success ? ("VALID" as const) : ("INVALID" as const),
        validationErrors: result.success
          ? []
          : result.error.issues.map((issue) => ({
              field: issue.path.join("."),
              code: issue.code,
              message: issue.message,
            })),
      })),
    );

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "IMPORT_STAGE",
      resourceType: "IMPORT_JOB",
      resourceId: job.id,
      businessYearId: input.businessYearId,
      requestId,
      metadata: {
        entityType: "COURSE_MASTER",
        totalRows: parsedRows.length,
        invalidRows,
      },
    });
    return job;
  });
}

export async function previewCourseImport(id: string) {
  const job = await findImportJob(id);
  if (!job || job.entityType !== "COURSE_MASTER") {
    throw new ApiError(404, "IMPORT_NOT_FOUND", "가져오기 작업을 찾을 수 없습니다.");
  }
  if (job.status === "COMMITTED") {
    throw new ApiError(409, "IMPORT_ALREADY_COMMITTED", "이미 반영된 작업입니다.");
  }
  const rows = await findImportRows(id);
  const valid = rows.filter((row) => row.status !== "INVALID");
  const existing = await findCoursesByExternalIds(
    db,
    job.sourceSystem,
    valid.map((row) => row.externalId).filter((value): value is string => Boolean(value)),
  );
  const existingById = new Map(existing.map((row) => [row.externalId, row]));
  let inserts = 0;
  let updates = 0;
  let unchanged = 0;

  const previewRows = valid.map((row) => {
    const current = existingById.get(row.externalId);
    if (!current) {
      inserts += 1;
      return { id: row.id, status: "INSERT" as const, diff: {} };
    }
    const incoming = CourseImportRowSchema.parse(row.normalizedData);
    const changed = [
      "courseCode",
      "name",
      "englishName",
      "description",
      "defaultCredits",
      "departmentCode",
    ].filter((field) => {
      const key = field as keyof typeof incoming;
      return String(incoming[key] ?? "") !== String(current[key] ?? "");
    });
    if (changed.length === 0) {
      unchanged += 1;
      return { id: row.id, status: "UNCHANGED" as const, diff: {} };
    }
    updates += 1;
    return { id: row.id, status: "UPDATE" as const, diff: { changed } };
  });

  await db.transaction(async (tx) => {
    for (const row of previewRows) {
      await tx
        .update(importStagingRows)
        .set({ status: row.status, previewDiff: row.diff })
        .where(eq(importStagingRows.id, row.id));
    }
    await tx
      .update(importJobs)
      .set({
        status: "PREVIEWED",
        insertRows: inserts,
        updateRows: updates,
        unchangedRows: unchanged,
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, id));
  });
  return {
    ...job,
    status: "PREVIEWED" as const,
    insertRows: inserts,
    updateRows: updates,
    unchangedRows: unchanged,
  };
}

export async function commitCourseImport(
  id: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(importJobs)
      .where(eq(importJobs.id, id))
      .for("update");
    if (!job || job.entityType !== "COURSE_MASTER") {
      throw new ApiError(404, "IMPORT_NOT_FOUND", "가져오기 작업을 찾을 수 없습니다.");
    }
    if (job.status === "COMMITTED") {
      throw new ApiError(409, "IMPORT_ALREADY_COMMITTED", "이미 반영된 작업입니다.");
    }
    if (job.status !== "PREVIEWED" || job.invalidRows > 0) {
      throw new ApiError(409, "IMPORT_NOT_READY", "오류 없이 preview를 완료해야 합니다.");
    }
    const rows = await tx
      .select()
      .from(importStagingRows)
      .where(eq(importStagingRows.importJobId, id));

    for (const row of rows.filter((item) => item.status !== "UNCHANGED")) {
      const value = CourseImportRowSchema.parse(row.normalizedData);
      const [target] = await tx
        .insert(courseMasters)
        .values({
          ...value,
          defaultCredits: String(value.defaultCredits),
        })
        .onConflictDoUpdate({
          target: [courseMasters.sourceSystem, courseMasters.externalId],
          set: {
            courseCode: value.courseCode,
            name: value.name,
            englishName: value.englishName,
            description: value.description,
            defaultCredits: String(value.defaultCredits),
            departmentCode: value.departmentCode,
            isActive: true,
            updatedAt: new Date(),
            deletedAt: null,
          },
        })
        .returning({ id: courseMasters.id });
      await tx
        .update(importStagingRows)
        .set({ status: "COMMITTED", targetId: target?.id })
        .where(eq(importStagingRows.id, row.id));
    }

    const [committed] = await tx
      .update(importJobs)
      .set({
        status: "COMMITTED",
        committedBy: actorId,
        committedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(importJobs.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "IMPORT_COMMIT",
      resourceType: "IMPORT_JOB",
      resourceId: id,
      businessYearId: job.businessYearId,
      requestId,
      metadata: {
        inserts: job.insertRows,
        updates: job.updateRows,
        unchanged: job.unchangedRows,
      },
    });
    return committed;
  });
}
