import { useQuery } from "@tanstack/react-query";
import { FileText, RefreshCw } from "lucide-react";
import { contractFetch } from "@workspace/api-client-react";
import { PublicContentListResponseSchema } from "@workspace/api-zod";
import { Layout } from "../../components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "../../components/SectionHeader";

export default function Resources() {
  const resources = useQuery({
    queryKey: ["public", "content", "RESOURCE"],
    queryFn: () =>
      contractFetch(
        PublicContentListResponseSchema,
        "/api/v1/public/content?contentType=RESOURCE&page=1&pageSize=100",
        { credentials: "include" },
      ),
    staleTime: 60_000,
  });

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <SectionHeader
          title="자료실"
          description="사업단이 공개 승인한 안내서와 문서 자료를 제공합니다."
        />

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            공개 자료 {resources.data?.meta.total ?? 0}건
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={resources.isFetching}
            onClick={() => resources.refetch()}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${resources.isFetching ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
        </div>

        {resources.isLoading && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              공개 자료를 불러오는 중입니다.
            </CardContent>
          </Card>
        )}

        {resources.isError && (
          <Card className="border-destructive/40">
            <CardContent className="p-8 text-center">
              <p className="font-semibold text-destructive">
                자료실 API에 연결할 수 없습니다.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                API 서버와 데이터베이스 연결 상태를 확인해 주세요.
              </p>
            </CardContent>
          </Card>
        )}

        {resources.data?.data.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">공개된 자료가 없습니다.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                검토와 공개 승인이 완료된 자료만 표시됩니다.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {resources.data?.data.map((resource) => (
            <Card key={resource.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">{resource.title}</h2>
                    {resource.summary && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {resource.summary}
                      </p>
                    )}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                      {resource.body}
                    </p>
                    {resource.publishedAt && (
                      <p className="mt-4 text-xs text-muted-foreground">
                        공개일:{" "}
                        {new Intl.DateTimeFormat("ko-KR").format(
                          new Date(resource.publishedAt),
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
