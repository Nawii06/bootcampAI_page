import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import { contractFetch } from "@workspace/api-client-react";
import { ProgramListResponseSchema } from "@workspace/api-zod";
import { Layout } from "../../components/Layout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

export default function Recruitment() {
  const programs = useQuery({
    queryKey: ["public", "programs", "open"],
    queryFn: () =>
      contractFetch(ProgramListResponseSchema, "/api/v1/programs?status=OPEN"),
  });
  const sessions = programs.data?.data.flatMap((program) =>
    (program.programSessions ?? []).map((session) => ({ ...session, program })),
  ) ?? [];
  return (
    <Layout>
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <SectionHeader title="학생모집" description="현재 신청 가능한 교육 프로그램과 회차입니다." />
        {programs.isLoading ? (
          <LoadingCard message="모집 프로그램을 불러오는 중입니다." />
        ) : (
        <>
                {programs.isError && (
          <ErrorCard
            message="모집 API에 연결할 수 없습니다."
            onRetry={() => programs.refetch()}
            isRetrying={programs.isFetching}
          />
        )}
        <div className="space-y-4">
          {sessions.map(({ program, ...session }) => (
            <Card key={session.id}>
              <CardContent className="p-6">
                <h2 className="text-lg font-bold">{program.name} · {session.name}</h2>
                {program.description && <p className="mt-2 text-sm text-muted-foreground">{program.description}</p>}
                <div className="mt-4 flex flex-wrap gap-5 text-sm">
                  <span className="flex items-center gap-2"><Users className="h-4 w-4" />정원 {session.capacity}명</span>
                  <span className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    신청 {new Date(session.applicationStartsAt).toLocaleDateString("ko-KR")}–{new Date(session.applicationEndsAt).toLocaleDateString("ko-KR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {sessions.length === 0 && !programs.isLoading && <p className="text-center text-muted-foreground">현재 모집 중인 프로그램이 없습니다.</p>}
        </>
        )}
      </div>
    </Layout>
  );
}
