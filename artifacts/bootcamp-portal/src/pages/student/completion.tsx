import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { contractFetch } from "@workspace/api-client-react";
import {
  CompletionAssessmentListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "../../contexts/AuthContext";

export default function StudentCompletion() {
  const { user } = useAuth();
  const assessments = useQuery({
    queryKey: ["completion-assessments", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () =>
      contractFetch(
        CompletionAssessmentListResponseSchema,
        `/api/v1/completion-assessments?studentId=${encodeURIComponent(user!.id)}`,
        { credentials: "include" },
      ),
  });
  const latest = assessments.data?.data[0];
  return (
    <PortalLayout>
      <SectionHeader title="이수현황" description="교육과정 요건을 기준으로 계산된 최신 결과입니다." />
      {!latest && !assessments.isLoading && <p className="text-muted-foreground">아직 계산된 이수평가가 없습니다.</p>}
      {latest && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">종합 진행률</p><p className="text-3xl font-bold">{Number(latest.progressRate)}%</p></div>
                <span className={latest.completed ? "text-green-600" : "text-amber-600"}>{latest.completed ? "이수 완료" : "진행 중"}</span>
              </div>
              <Progress value={Number(latest.progressRate)} className="mt-4" />
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardContent className="p-6"><h2 className="mb-4 font-bold">충족사항</h2>{latest.satisfied.map((item) => <div key={item.id} className="mb-2 flex gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600" />{item.name}</div>)}</CardContent></Card>
            <Card><CardContent className="p-6"><h2 className="mb-4 font-bold">부족사항</h2>{latest.missing.map((item) => <div key={item.id} className="mb-2 flex gap-2 text-sm"><CircleAlert className="h-4 w-4 text-amber-600" /><span>{item.name} · 부족 {item.shortage}</span></div>)}</CardContent></Card>
          </div>
        </div>
      )}
      {assessments.isError && <p className="text-destructive">이수정보 API에 연결할 수 없습니다.</p>}
    </PortalLayout>
  );
}
