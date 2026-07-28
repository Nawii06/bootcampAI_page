import { useQuery } from "@tanstack/react-query";
import { Building2, ExternalLink } from "lucide-react";
import { contractFetch } from "@workspace/api-client-react";
import { PublicCompanyListResponseSchema } from "@workspace/api-zod";
import { Layout } from "../../components/Layout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

export default function Partners() {
  const companies = useQuery({
    queryKey: ["public", "companies"],
    queryFn: () =>
      contractFetch(PublicCompanyListResponseSchema, "/api/v1/public/companies"),
  });
  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <SectionHeader title="참여기업·기관" description="공개 승인을 받은 협력기업과 기관입니다." />
        {companies.isLoading ? (
          <LoadingCard message="참여기업 정보를 불러오는 중입니다." />
        ) : (
        <>
                {companies.isError && (
          <ErrorCard
            message="참여기업 API에 연결할 수 없습니다."
            onRetry={() => companies.refetch()}
            isRetrying={companies.isFetching}
          />
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.data?.data.map((company) => (
            <Card key={company.id}>
              <CardContent className="p-6">
                <Building2 className="mb-4 h-8 w-8 text-primary" />
                <p className="text-xs font-semibold text-primary">{company.companyType}</p>
                <h2 className="mt-1 text-lg font-bold">{company.name}</h2>
                {company.description && <p className="mt-3 text-sm text-muted-foreground">{company.description}</p>}
                {company.website && (
                  <a className="mt-4 inline-flex items-center text-sm text-primary" href={company.website} target="_blank" rel="noreferrer">
                    홈페이지 <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        {companies.data?.data.length === 0 && <p className="text-center text-muted-foreground">공개된 참여기업이 없습니다.</p>}
        </>
        )}
      </div>
    </Layout>
  );
}
