import { useQuery } from "@tanstack/react-query";
import { BookOpen, RefreshCw } from "lucide-react";
import { contractFetch } from "@workspace/api-client-react";
import { CourseListResponseSchema } from "@workspace/api-zod";
import { Layout } from "../../components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "../../components/SectionHeader";
import { ErrorCard } from "@/components/ErrorCard";

function useCourses() {
  return useQuery({
    queryKey: ["public", "courses"],
    queryFn: () =>
      contractFetch(CourseListResponseSchema, "/api/v1/courses?page=1&pageSize=100", {
        credentials: "include",
      }),
    staleTime: 60_000,
  });
}

export default function Curriculum() {
  const courses = useCourses();

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <SectionHeader
          title="교육과정"
          description="사업연도와 학기별로 운영되는 AI·모빌리티 교과목을 확인하세요."
        />

        <div className="mb-8 grid gap-3 md:grid-cols-4">
          {[
            ["자율주행", "인지·판단·제어와 차량용 소프트웨어"],
            ["항공 모빌리티", "UAM·드론 비행제어와 항로 최적화"],
            ["철도 모빌리티", "신호제어·예지정비와 운영 지능화"],
            ["스마트 인프라", "C-ITS·교통 데이터와 스마트시티"],
          ].map(([title, description]) => (
            <Card key={title}>
              <CardContent className="p-5">
                <p className="font-semibold text-primary">{title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">개설 교과목</h2>
            <p className="text-sm text-muted-foreground">
              교과목 마스터 DB에 등록된 공개 목록입니다.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => courses.refetch()}
            disabled={courses.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${courses.isFetching ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
        </div>

        {courses.isLoading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              교육과정을 불러오는 중입니다.
            </CardContent>
          </Card>
        )}

        {courses.isError && (
          <ErrorCard
            message="교육과정 API에 연결할 수 없습니다."
            onRetry={() => courses.refetch()}
            isRetrying={courses.isFetching}
          />
        )}

        {courses.data && courses.data.data.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">등록된 교과목이 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                교육 담당자가 교과목을 등록하거나 가져오기를 완료하면 표시됩니다.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {courses.data?.data.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-primary">
                      {course.courseCode}
                    </p>
                    <h3 className="mt-1 text-lg font-bold">{course.name}</h3>
                    {course.englishName && (
                      <p className="text-sm text-muted-foreground">
                        {course.englishName}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {course.defaultCredits}학점
                  </span>
                </div>
                {course.description && (
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {course.description}
                  </p>
                )}
                {course.departmentCode && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    개설 부서: {course.departmentCode}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
