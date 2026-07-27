import { db, pool } from "./index";
import {
  businessYears,
  codeGroups,
  codeValues,
  courseMasters,
  curricula,
  curriculumRequirements,
  fileRetentionPolicies,
  programs,
  roles,
  students,
  terms,
  userRoles,
  users,
} from "./schema";
import { and, eq } from "drizzle-orm";

if (
  process.env.NODE_ENV === "production" ||
  process.env.SEED_PROFILE === "production"
) {
  throw new Error(
    "Development seed is disabled for production. Provision production reference data through an approved migration process.",
  );
}

const roleSeeds = [
  ["PUBLIC", "공개 사용자"],
  ["STUDENT", "학생"],
  ["COMPANY_APPLICANT", "기업 신청자"],
  ["COMPANY_MANAGER", "기업 담당자"],
  ["EDUCATION_STAFF", "교육과정 담당자"],
  ["BENEFIT_STAFF", "수혜 담당자"],
  ["COMPANY_STAFF", "기업협력 담당자"],
  ["BUDGET_STAFF", "예산 담당자"],
  ["PERFORMANCE_STAFF", "성과 담당자"],
  ["CONTENT_EDITOR", "콘텐츠 편집자"],
  ["REVIEWER", "검토자"],
  ["SYSTEM_ADMIN", "시스템 관리자"],
  ["AUDITOR", "감사자"],
] as const;

const codeSeeds = {
  TRACK: [
    ["AUTONOMOUS", "자율주행"],
    ["AVIATION", "항공 모빌리티"],
    ["RAILWAY", "철도 모빌리티"],
    ["INFRA", "스마트 인프라"],
  ],
  PROGRAM_LEVEL: [
    ["BASIC", "기초"],
    ["BEGINNER", "초급"],
    ["INTERMEDIATE", "중급"],
    ["ADVANCED", "고급"],
    ["FIELD", "현장"],
    ["EMPLOYMENT", "취업연계"],
  ],
  DEPARTMENT: [
    ["MOBILITY", "첨단모빌리티학과"],
    ["AI_SOFTWARE", "AI소프트웨어학과"],
    ["INDUSTRY_COOP", "산학협력단"],
  ],
  REQUIREMENT_TYPE: [
    ["TOTAL_CREDITS", "총 이수학점"],
    ["REQUIRED_COURSE", "필수 교과목"],
    ["TRACK_CREDITS", "트랙 이수학점"],
    ["EXTRACURRICULAR_HOURS", "비교과 이수시간"],
    ["PROJECT", "산학 프로젝트"],
    ["FIELD_PRACTICE", "현장실습"],
    ["INTERNSHIP", "인턴십"],
  ],
} as const;

async function seed() {
  await db.transaction(async (tx) => {
    await tx
      .insert(fileRetentionPolicies)
      .values({
        code: "DEFAULT_EVIDENCE",
        name: "기본 증빙파일 보존정책",
        retentionDays: 1_825,
        personalInfoRetentionDays: 1_095,
        isDefault: true,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: fileRetentionPolicies.code,
        set: {
          name: "기본 증빙파일 보존정책",
          retentionDays: 1_825,
          personalInfoRetentionDays: 1_095,
          isDefault: true,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    await tx
      .insert(roles)
      .values(
        roleSeeds.map(([code, name]) => ({
          code,
          name,
          description: `${name} 역할`,
        })),
      )
      .onConflictDoNothing();

    for (const [groupCode, values] of Object.entries(codeSeeds)) {
      const [group] = await tx
        .insert(codeGroups)
        .values({
          code: groupCode,
          name:
            groupCode === "TRACK"
              ? "교육 트랙"
              : groupCode === "PROGRAM_LEVEL"
                ? "프로그램 수준"
                : groupCode === "DEPARTMENT"
                  ? "학과·부서"
                  : "교육과정 요건 유형",
          isSystem: true,
        })
        .onConflictDoUpdate({
          target: codeGroups.code,
          set: { updatedAt: new Date() },
        })
        .returning({ id: codeGroups.id });

      if (!group) {
        throw new Error(`Unable to seed code group: ${groupCode}`);
      }

      await tx
        .insert(codeValues)
        .values(
          values.map(([code, name], index) => ({
            groupId: group.id,
            code,
            name,
            sortOrder: index + 1,
          })),
        )
        .onConflictDoNothing();
    }

    const [businessYear] = await tx
      .insert(businessYears)
      .values({
        year: 2026,
        name: "2026 사업연도",
        startsAt: new Date("2026-03-01T00:00:00+09:00"),
        endsAt: new Date("2027-02-28T23:59:59+09:00"),
        isActive: true,
      })
      .onConflictDoUpdate({
        target: businessYears.year,
        set: { isActive: true, updatedAt: new Date() },
      })
      .returning({ id: businessYears.id });

    if (!businessYear) {
      throw new Error("Unable to seed business year");
    }

    await tx
      .insert(terms)
      .values([
        {
          businessYearId: businessYear.id,
          semester: "FIRST",
          name: "2026학년도 1학기",
          startsAt: new Date("2026-03-01T00:00:00+09:00"),
          endsAt: new Date("2026-06-30T23:59:59+09:00"),
        },
        {
          businessYearId: businessYear.id,
          semester: "SECOND",
          name: "2026학년도 2학기",
          startsAt: new Date("2026-09-01T00:00:00+09:00"),
          endsAt: new Date("2026-12-31T23:59:59+09:00"),
        },
      ])
      .onConflictDoNothing();

    const [admin] = await tx
      .insert(users)
      .values({
        loginId: "dev-admin",
        displayName: "개발 시스템 관리자",
        email: "dev-admin@example.invalid",
        sourceSystem: "DEV_SEED",
        externalId: "DEV_ADMIN_01",
      })
      .onConflictDoUpdate({
        target: users.loginId,
        set: { displayName: "개발 시스템 관리자", isActive: true, updatedAt: new Date() },
      })
      .returning({ id: users.id });
    if (!admin) throw new Error("Unable to seed development administrator");

    await tx
      .insert(userRoles)
      .values({ userId: admin.id, roleCode: "SYSTEM_ADMIN", scopeType: "GLOBAL" })
      .onConflictDoNothing();

    const [studentUser] = await tx
      .insert(users)
      .values({
        loginId: "dev-student",
        displayName: "개발 학생",
        email: "dev-student@example.invalid",
        sourceSystem: "DEV_SEED",
        externalId: "DEV_STUDENT_USER_01",
      })
      .onConflictDoUpdate({
        target: users.loginId,
        set: { displayName: "개발 학생", isActive: true, updatedAt: new Date() },
      })
      .returning({ id: users.id });
    if (!studentUser) throw new Error("Unable to seed development student user");

    await tx
      .insert(userRoles)
      .values({ userId: studentUser.id, roleCode: "STUDENT", scopeType: "GLOBAL" })
      .onConflictDoNothing();

    await tx
      .insert(students)
      .values({
        userId: studentUser.id,
        studentNumber: "DEV2026001",
        name: "개발 학생",
        departmentCode: "MOBILITY",
        grade: "3",
        sourceSystem: "DEV_SEED",
        externalId: "DEV_STUDENT_01",
      })
      .onConflictDoUpdate({
        target: students.studentNumber,
        set: { userId: studentUser.id, isActive: true, updatedAt: new Date() },
      });

    const [course] = await tx
      .insert(courseMasters)
      .values({
        courseCode: "DEV-AI-101",
        name: "첨단산업 AI 기초",
        defaultCredits: "3.0",
        departmentCode: "AI_SOFTWARE",
        sourceSystem: "DEV_SEED",
        externalId: "COURSE_01",
      })
      .onConflictDoUpdate({
        target: courseMasters.courseCode,
        set: { name: "첨단산업 AI 기초", isActive: true, updatedAt: new Date() },
      })
      .returning({ id: courseMasters.id });
    if (!course) throw new Error("Unable to seed sample course");

    const [trackGroup] = await tx
      .select({ id: codeGroups.id })
      .from(codeGroups)
      .where(eq(codeGroups.code, "TRACK"));
    const [track] = trackGroup
      ? await tx
          .select({ id: codeValues.id })
          .from(codeValues)
          .where(and(eq(codeValues.groupId, trackGroup.id), eq(codeValues.code, "AUTONOMOUS")))
      : [];

    const [curriculum] = await tx
      .insert(curricula)
      .values({
        businessYearId: businessYear.id,
        code: "DEV-CURRICULUM",
        name: "개발 검증용 첨단산업 교육과정",
        version: 1,
        trackCodeId: track?.id,
        effectiveFrom: new Date("2026-03-01T00:00:00+09:00"),
        isPublished: true,
      })
      .onConflictDoUpdate({
        target: [curricula.code, curricula.version],
        set: { name: "개발 검증용 첨단산업 교육과정", isPublished: true, updatedAt: new Date() },
      })
      .returning({ id: curricula.id });
    if (!curriculum) throw new Error("Unable to seed sample curriculum");

    await tx
      .insert(curriculumRequirements)
      .values([
        {
          curriculumId: curriculum.id,
          code: "TOTAL_CREDITS",
          name: "총 3학점 이상",
          requirementType: "TOTAL_CREDITS",
          operator: "GTE",
          requiredValue: "3",
          unit: "CREDIT",
          sortOrder: 1,
        },
        {
          curriculumId: curriculum.id,
          code: "REQUIRED_DEV_AI_101",
          name: "첨단산업 AI 기초 필수",
          requirementType: "REQUIRED_COURSE",
          operator: "EQ",
          requiredValue: "1",
          courseMasterId: course.id,
          sortOrder: 2,
        },
      ])
      .onConflictDoNothing();

    await tx
      .insert(programs)
      .values({
        businessYearId: businessYear.id,
        code: "DEV-PROGRAM-01",
        name: "개발 검증용 AI 산학 프로젝트",
        trackCodeId: track?.id,
        programType: "PROJECT",
        eligibilityRules: { minimumGrade: 1 },
        completionRules: { attendanceRate: 80, surveyRequired: true },
        status: "OPEN",
        sourceSystem: "DEV_SEED",
        externalId: "PROGRAM_01",
      })
      .onConflictDoUpdate({
        target: [programs.businessYearId, programs.code],
        set: { name: "개발 검증용 AI 산학 프로젝트", status: "OPEN", updatedAt: new Date() },
      });
  });
}

seed()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await pool.end();
    process.exitCode = 1;
  });
