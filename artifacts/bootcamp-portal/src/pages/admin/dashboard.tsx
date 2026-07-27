import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BudgetSummaryResponseSchema,
  BusinessYearListResponseSchema,
  CompletionAssessmentListResponseSchema,
  ProgramApplicationsResponseSchema,
  ProgramListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";

export default function AdminDashboard() {
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () =>
      contractFetch(
        BusinessYearListResponseSchema,
        "/api/v1/reference/business-years?active=true",
      ),
  });
  const yearId = years.data?.data[0]?.id;
  const programs = useQuery({
    queryKey: ["admin", "programs", yearId],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        ProgramListResponseSchema,
        `/api/v1/programs?businessYearId=${yearId}`,
      ),
  });
  const applications = useQuery({
    queryKey: ["admin", "program-applications"],
    queryFn: () =>
      contractFetch(ProgramApplicationsResponseSchema, "/api/v1/program-applications", {
        credentials: "include",
      }),
  });
  const assessments = useQuery({
    queryKey: ["admin", "completion-assessments", yearId],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        CompletionAssessmentListResponseSchema,
        `/api/v1/completion-assessments?businessYearId=${yearId}`,
        { credentials: "include" },
      ),
  });
  const budget = useQuery({
    queryKey: ["admin", "budget-summary", yearId],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        BudgetSummaryResponseSchema,
        `/api/v1/budget/summary?businessYearId=${yearId}`,
        { credentials: "include" },
      ),
  });

  const applicationRows = applications.data?.data ?? [];
  const assessmentRows = assessments.data?.data ?? [];
  const hasError =
    years.isError ||
    programs.isError ||
    applications.isError ||
    assessments.isError ||
    budget.isError;

  return (
    <PortalLayout>
      <SectionHeader
        title="운영 대시보드"
        description={`${years.data?.data[0]?.name ?? "활성 사업연도"} 기준 운영 현황`}
      />
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="운영 프로그램" value={`${programs.data?.data.length ?? 0}건`} />
        <StatCard label="전체 신청" value={`${applicationRows.length}건`} />
        <StatCard
          label="선발"
          value={`${applicationRows.filter((row) => row.status === "SELECTED").length}건`}
        />
        <StatCard
          label="이수 판정"
          value={`${assessmentRows.filter((row) => row.completed).length}명`}
        />
        <StatCard
          label="예산 집행률"
          value={`${budget.data?.executionRate ?? 0}%`}
          color={(budget.data?.executionRate ?? 0) < 50 ? "text-destructive" : ""}
        />
      </div>
      {hasError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          일부 운영 지표를 불러오지 못했습니다. 권한과 API 연결 상태를 확인해 주세요.
        </div>
      )}
    </PortalLayout>
  );
}
