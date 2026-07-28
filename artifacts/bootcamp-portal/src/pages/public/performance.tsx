import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  PublicContentListResponseSchema,
  PublicPerformanceResultListResponseSchema,
} from "@workspace/api-zod";
import { Layout } from "../../components/Layout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

export default function Performance() {
  const results = useQuery({
    queryKey: ["public", "performance-results"],
    queryFn: () =>
      contractFetch(PublicPerformanceResultListResponseSchema, "/api/v1/public/performance-results"),
  });
  const news = useQuery({
    queryKey: ["public", "content", "NEWS"],
    queryFn: () =>
      contractFetch(
        PublicContentListResponseSchema,
        "/api/v1/public/content?contentType=NEWS&page=1&pageSize=20",
      ),
  });
  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <SectionHeader title="성과·소식" description="검토와 공개 승인을 완료한 성과만 제공합니다." />
        {results.isLoading || news.isLoading ? (
          <LoadingCard message="성과와 소식을 불러오는 중입니다." />
        ) : (
        <>
        <h2 className="mb-4 text-xl font-bold">주요 성과</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {results.data?.data.map((result) => (
            <Card key={result.id}>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{result.indicatorName}</p>
                <p className="mt-2 text-3xl font-bold text-primary">{Number(result.actualValue).toLocaleString("ko-KR")}<span className="ml-1 text-base">{result.unit}</span></p>
              </CardContent>
            </Card>
          ))}
        </div>
        <h2 className="mb-4 mt-10 text-xl font-bold">사업 소식</h2>
        <div className="space-y-3">
          {news.data?.data.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <h3 className="font-semibold">{item.title}</h3>
                {item.summary && <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
                {(results.isError || news.isError) && (
          <ErrorCard
            message="공개 성과 API 일부에 연결할 수 없습니다."
            onRetry={() => { results.refetch(); news.refetch(); }}
            isRetrying={results.isFetching || news.isFetching}
          />
        )}
        </>
        )}
      </div>
    </Layout>
  );
}
