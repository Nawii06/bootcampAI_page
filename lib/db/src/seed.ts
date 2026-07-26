import { db, pool } from "./index";
import {
  businessYears,
  codeGroups,
  codeValues,
  roles,
  terms,
} from "./schema";

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
} as const;

async function seed() {
  await db.transaction(async (tx) => {
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
          name: groupCode === "TRACK" ? "교육 트랙" : "프로그램 수준",
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
