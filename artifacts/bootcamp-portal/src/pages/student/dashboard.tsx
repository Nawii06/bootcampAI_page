import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  CompletionAssessmentListResponseSchema,
  ProgramApplicationsResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../contexts/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const applications = useQuery({
    queryKey: ["student-dashboard-applications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => contractFetch(
      ProgramApplicationsResponseSchema,
      `/api/v1/program-applications?studentId=${encodeURIComponent(user!.id)}`,
      { credentials: "include" },
    ),
  });
  const assessments = useQuery({
    queryKey: ["student-dashboard-completion", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => contractFetch(
      CompletionAssessmentListResponseSchema,
      `/api/v1/completion-assessments?studentId=${encodeURIComponent(user!.id)}`,
      { credentials: "include" },
    ),
  });
  const latest = assessments.data?.data[0];
  const selected = applications.data?.data.filter((item) => item.status === "SELECTED").length ?? 0;
  return (
    <PortalLayout>
      <SectionHeader title="학생 대시보드" description={`${user?.name ?? "학생"}님의 프로그램·이수 현황입니다.`} />
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="전체 신청" value={applications.data?.data.length ?? 0} />
        <StatCard label="선발 프로그램" value={selected} />
        <StatCard label="이수 진행률" value={`${Number(latest?.progressRate ?? 0)}%`} />
        <StatCard label="부족요건" value={latest?.missing.length ?? 0} />
      </div>
    </PortalLayout>
  );
}
