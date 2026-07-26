import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";

interface CompletionAssessment {
  id: string;
  studentNumber: string;
  studentName: string;
  curriculumName: string;
  calculationVersion: string;
  completed: boolean;
  progressRate: string;
  missing: Array<{ name?: string; shortage?: number }>;
  calculatedAt: string;
}

export default function AdminCompletion() {
  const assessments = useQuery({
    queryKey: ["admin", "completion-assessments"],
    queryFn: () =>
      customFetch<{ data: CompletionAssessment[] }>(
        "/api/v1/completion-assessments",
        { responseType: "json", credentials: "include" },
      ),
  });
  const columns: ColumnDef<CompletionAssessment>[] = [
    { key: "studentNumber", header: "학번" },
    {
      key: "studentName",
      header: "학생",
      cell: (row) => <span className="font-medium">{row.studentName}</span>,
    },
    { key: "curriculumName", header: "교육과정" },
    {
      key: "progressRate",
      header: "진행률",
      cell: (row) => (
        <div className="min-w-32">
          <span className="text-sm">{Number(row.progressRate)}%</span>
          <Progress value={Number(row.progressRate)} className="mt-1 h-2" />
        </div>
      ),
    },
    {
      key: "missing",
      header: "부족요건",
      cell: (row) =>
        row.missing.length === 0
          ? "-"
          : row.missing
              .slice(0, 2)
              .map((item) => item.name ?? "미지정 요건")
              .join(", "),
    },
    {
      key: "completed",
      header: "판정",
      cell: (row) => (
        <Badge variant={row.completed ? "default" : "secondary"}>
          {row.completed ? "이수" : "진행 중"}
        </Badge>
      ),
    },
    {
      key: "calculatedAt",
      header: "계산일시",
      cell: (row) => new Date(row.calculatedAt).toLocaleString("ko-KR"),
    },
  ];

  return (
    <PortalLayout>
      <SectionHeader
        title="학생 이수관리"
        description="교육과정 요건으로 계산·저장된 최신 이수 snapshot을 조회합니다."
      />
      {assessments.isError && (
        <p className="mb-4 text-destructive">
          이수 평가 결과를 불러오지 못했습니다.
        </p>
      )}
      <DataTable
        data={assessments.data?.data ?? []}
        columns={columns}
        filterKey="studentName"
        filterPlaceholder="학생명 검색"
      />
    </PortalLayout>
  );
}
