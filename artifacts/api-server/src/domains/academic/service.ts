import { and, eq, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  CourseImportRowSchema,
  CurriculumInputSchema,
  CurriculumRequirementInputSchema,
  type CourseMasterUpdate,
  type CourseMasterInput,
  type CourseOfferingInput,
  type CourseOfferingUpdate,
  type CurriculumInput,
  type CurriculumUpdate,
  type CurriculumRequirementInput,
  type CurriculumRequirementUpdate,
  type StageCourseImport,
} from "@workspace/api-zod";
import { ApiError } from "../../lib/api-error";
import {
  auditLogs,
  courseMasters,
  courseOfferings,
  curricula,
  curriculumRequirements,
  findCoursesByExternalIds,
  findImportJob,
  findImportRows,
  importJobs,
  importStagingRows,
  listCourses,
  listCourseOfferings,
  listCurricula,
  listCurriculumRequirements,
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

function serializeCurriculum(row: typeof curricula.$inferSelect) {
  return {
    ...row,
    trackCodeId: row.trackCodeId ?? undefined,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveTo: row.effectiveTo?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeRequirement(
  row: typeof curriculumRequirements.$inferSelect,
) {
  return {
    ...row,
    requiredValue:
      row.requiredValue === null ? undefined : Number(row.requiredValue),
    unit: row.unit ?? undefined,
    courseMasterId: row.courseMasterId ?? undefined,
    trackCodeId: row.trackCodeId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeOffering(
  row: Awaited<ReturnType<typeof listCourseOfferings>>[number],
) {
  return {
    ...row.offering,
    credits: Number(row.offering.credits),
    courseCode: row.courseCode,
    courseName: row.courseName,
    businessYearName: row.businessYearName,
    termName: row.termName,
    createdAt: row.offering.createdAt.toISOString(),
    updatedAt: row.offering.updatedAt.toISOString(),
    instructorName: row.offering.instructorName ?? undefined,
    capacity: row.offering.capacity ?? undefined,
    trackCodeId: row.offering.trackCodeId ?? undefined,
    programLevelCodeId: row.offering.programLevelCodeId ?? undefined,
    sourceSystem: row.offering.sourceSystem ?? undefined,
    externalId: row.offering.externalId ?? undefined,
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

export async function updateCourse(
  id: string,
  input: CourseMasterUpdate,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(courseMasters)
      .where(and(eq(courseMasters.id, id), isNull(courseMasters.deletedAt)))
      .for("update");
    if (!before) throw new ApiError(404, "COURSE_NOT_FOUND", "교과목을 찾을 수 없습니다.");
    const [updated] = await tx
      .update(courseMasters)
      .set({
        ...input,
        defaultCredits:
          input.defaultCredits === undefined
            ? undefined
            : String(input.defaultCredits),
        updatedAt: new Date(),
      })
      .where(eq(courseMasters.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "UPDATE",
      resourceType: "COURSE_MASTER",
      resourceId: id,
      requestId,
      changedFields: Object.keys(input),
      before,
      after: input,
    });
    return serializeCourse(updated!);
  });
}

export async function archiveCourse(
  id: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [archived] = await tx
      .update(courseMasters)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(courseMasters.id, id), isNull(courseMasters.deletedAt)))
      .returning({ id: courseMasters.id });
    if (!archived) throw new ApiError(404, "COURSE_NOT_FOUND", "교과목을 찾을 수 없습니다.");
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "ARCHIVE",
      resourceType: "COURSE_MASTER",
      resourceId: id,
      requestId,
    });
  });
}

export async function getCourseOfferings(filters: {
  businessYearId?: string;
  termId?: string;
  courseMasterId?: string;
  isActive?: boolean;
}) {
  return (await listCourseOfferings(filters)).map(serializeOffering);
}

export async function createCourseOffering(
  input: CourseOfferingInput,
  actorId: string,
  requestId: string,
) {
  const createdId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(courseOfferings)
      .values({ ...input, credits: String(input.credits) })
      .returning();
    if (!created) throw new ApiError(500, "CREATE_FAILED", "개설 교과목을 생성하지 못했습니다.");
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "COURSE_OFFERING",
      resourceId: created.id,
      businessYearId: input.businessYearId,
      requestId,
      after: input,
    });
    return created.id;
  });
  const created = (await listCourseOfferings({ courseMasterId: input.courseMasterId }))
    .map(serializeOffering)
    .find((row) => row.id === createdId);
  if (!created) throw new ApiError(500, "READ_AFTER_CREATE_FAILED", "생성된 개설 교과목을 조회하지 못했습니다.");
  return created;
}

export async function updateCourseOffering(
  id: string,
  input: CourseOfferingUpdate,
  actorId: string,
  requestId: string,
) {
  const courseMasterId = await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(courseOfferings)
      .where(and(eq(courseOfferings.id, id), isNull(courseOfferings.deletedAt)))
      .for("update");
    if (!before) throw new ApiError(404, "COURSE_OFFERING_NOT_FOUND", "개설 교과목을 찾을 수 없습니다.");
    const [updated] = await tx
      .update(courseOfferings)
      .set({
        ...input,
        credits: input.credits === undefined ? undefined : String(input.credits),
        updatedAt: new Date(),
      })
      .where(eq(courseOfferings.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "UPDATE",
      resourceType: "COURSE_OFFERING",
      resourceId: id,
      businessYearId: before.businessYearId,
      requestId,
      changedFields: Object.keys(input),
      before,
      after: input,
    });
    return updated!.courseMasterId;
  });
  const updated = (await listCourseOfferings({ courseMasterId }))
    .map(serializeOffering)
    .find((row) => row.id === id);
  if (!updated) throw new ApiError(500, "READ_AFTER_UPDATE_FAILED", "수정된 개설 교과목을 조회하지 못했습니다.");
  return updated;
}

export async function archiveCourseOffering(
  id: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [archived] = await tx
      .update(courseOfferings)
      .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(courseOfferings.id, id), isNull(courseOfferings.deletedAt)))
      .returning();
    if (!archived) throw new ApiError(404, "COURSE_OFFERING_NOT_FOUND", "개설 교과목을 찾을 수 없습니다.");
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "ARCHIVE",
      resourceType: "COURSE_OFFERING",
      resourceId: id,
      businessYearId: archived.businessYearId,
      requestId,
    });
  });
}

export async function getCurricula(filters: {
  businessYearId?: string;
  isPublished?: boolean;
}) {
  return (await listCurricula(filters)).map(serializeCurriculum);
}

export async function createCurriculum(
  input: CurriculumInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [created] = await tx
      .insert(curricula)
      .values({
        ...input,
        effectiveFrom: new Date(input.effectiveFrom),
        effectiveTo: input.effectiveTo
          ? new Date(input.effectiveTo)
          : undefined,
      })
      .returning();
    if (!created) throw new ApiError(500, "CREATE_FAILED", "교육과정을 생성하지 못했습니다.");
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "CURRICULUM",
      resourceId: created.id,
      businessYearId: input.businessYearId,
      requestId,
      after: input,
    });
    return serializeCurriculum(created);
  });
}

export async function updateCurriculum(
  id: string,
  input: CurriculumUpdate,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(curricula)
      .where(and(eq(curricula.id, id), isNull(curricula.deletedAt)))
      .for("update");
    if (!before) throw new ApiError(404, "CURRICULUM_NOT_FOUND", "교육과정을 찾을 수 없습니다.");
    CurriculumInputSchema.parse({
      businessYearId: before.businessYearId,
      code: before.code,
      name: input.name ?? before.name,
      version: before.version,
      trackCodeId:
        input.trackCodeId === null
          ? undefined
          : input.trackCodeId ?? before.trackCodeId ?? undefined,
      effectiveFrom:
        input.effectiveFrom ?? before.effectiveFrom.toISOString(),
      effectiveTo:
        input.effectiveTo === null
          ? undefined
          : input.effectiveTo ?? before.effectiveTo?.toISOString(),
      isPublished: input.isPublished ?? before.isPublished,
    });
    const [updated] = await tx
      .update(curricula)
      .set({
        ...input,
        effectiveFrom: input.effectiveFrom
          ? new Date(input.effectiveFrom)
          : undefined,
        effectiveTo:
          input.effectiveTo === null
            ? null
            : input.effectiveTo
              ? new Date(input.effectiveTo)
              : undefined,
        updatedAt: new Date(),
      })
      .where(eq(curricula.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: input.isPublished === true ? "PUBLISH" : "UPDATE",
      resourceType: "CURRICULUM",
      resourceId: id,
      businessYearId: before.businessYearId,
      requestId,
      changedFields: Object.keys(input),
      before,
      after: input,
    });
    return serializeCurriculum(updated!);
  });
}

export async function archiveCurriculum(
  id: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [archived] = await tx
      .update(curricula)
      .set({ isPublished: false, deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(curricula.id, id), isNull(curricula.deletedAt)))
      .returning();
    if (!archived) throw new ApiError(404, "CURRICULUM_NOT_FOUND", "교육과정을 찾을 수 없습니다.");
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "ARCHIVE",
      resourceType: "CURRICULUM",
      resourceId: id,
      businessYearId: archived.businessYearId,
      requestId,
    });
  });
}

export async function getCurriculumRequirements(curriculumId: string) {
  return (await listCurriculumRequirements(curriculumId)).map(
    serializeRequirement,
  );
}

export async function createCurriculumRequirement(
  curriculumId: string,
  input: CurriculumRequirementInput,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const curriculum = await tx.query.curricula.findFirst({
      where: and(eq(curricula.id, curriculumId), isNull(curricula.deletedAt)),
    });
    if (!curriculum) throw new ApiError(404, "CURRICULUM_NOT_FOUND", "교육과정을 찾을 수 없습니다.");
    const [created] = await tx
      .insert(curriculumRequirements)
      .values({
        ...input,
        curriculumId,
        requiredValue:
          input.requiredValue === undefined
            ? undefined
            : String(input.requiredValue),
      })
      .returning();
    if (!created) throw new ApiError(500, "CREATE_FAILED", "이수요건을 생성하지 못했습니다.");
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "CREATE",
      resourceType: "CURRICULUM_REQUIREMENT",
      resourceId: created.id,
      businessYearId: curriculum.businessYearId,
      requestId,
      after: input,
    });
    return serializeRequirement(created);
  });
}

export async function updateCurriculumRequirement(
  id: string,
  input: CurriculumRequirementUpdate,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select({
        requirement: curriculumRequirements,
        businessYearId: curricula.businessYearId,
      })
      .from(curriculumRequirements)
      .innerJoin(curricula, eq(curricula.id, curriculumRequirements.curriculumId))
      .where(
        and(
          eq(curriculumRequirements.id, id),
          isNull(curriculumRequirements.deletedAt),
        ),
      )
      .for("update");
    if (!before) throw new ApiError(404, "REQUIREMENT_NOT_FOUND", "이수요건을 찾을 수 없습니다.");
    CurriculumRequirementInputSchema.parse({
      code: input.code ?? before.requirement.code,
      name: input.name ?? before.requirement.name,
      requirementType:
        input.requirementType ?? before.requirement.requirementType,
      operator: input.operator ?? before.requirement.operator,
      requiredValue:
        input.requiredValue ??
        (before.requirement.requiredValue === null
          ? undefined
          : Number(before.requirement.requiredValue)),
      unit: input.unit ?? before.requirement.unit ?? undefined,
      courseMasterId:
        input.courseMasterId ??
        before.requirement.courseMasterId ??
        undefined,
      trackCodeId:
        input.trackCodeId ?? before.requirement.trackCodeId ?? undefined,
      conditions: input.conditions ?? before.requirement.conditions,
      sortOrder: input.sortOrder ?? before.requirement.sortOrder,
      isRequired: input.isRequired ?? before.requirement.isRequired,
    });
    const [updated] = await tx
      .update(curriculumRequirements)
      .set({
        ...input,
        requiredValue:
          input.requiredValue === undefined
            ? undefined
            : String(input.requiredValue),
        updatedAt: new Date(),
      })
      .where(eq(curriculumRequirements.id, id))
      .returning();
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "UPDATE",
      resourceType: "CURRICULUM_REQUIREMENT",
      resourceId: id,
      businessYearId: before.businessYearId,
      requestId,
      changedFields: Object.keys(input),
      before: before.requirement,
      after: input,
    });
    return serializeRequirement(updated!);
  });
}

export async function archiveCurriculumRequirement(
  id: string,
  actorId: string,
  requestId: string,
) {
  return db.transaction(async (tx) => {
    const [archived] = await tx
      .update(curriculumRequirements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(curriculumRequirements.id, id),
          isNull(curriculumRequirements.deletedAt),
        ),
      )
      .returning();
    if (!archived) throw new ApiError(404, "REQUIREMENT_NOT_FOUND", "이수요건을 찾을 수 없습니다.");
    const curriculum = await tx.query.curricula.findFirst({
      where: eq(curricula.id, archived.curriculumId),
    });
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: "ARCHIVE",
      resourceType: "CURRICULUM_REQUIREMENT",
      resourceId: id,
      businessYearId: curriculum?.businessYearId,
      requestId,
    });
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
