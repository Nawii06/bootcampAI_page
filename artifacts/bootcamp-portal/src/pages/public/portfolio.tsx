/**
 * Public portfolio view — no login required.
 * Accessible via /public/portfolio/:token once a student shares their link.
 */
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { contractFetch, ApiError } from "@workspace/api-client-react";
import { PublicPortfolioResponseSchema } from "@workspace/api-zod";
import { Layout } from "../../components/Layout";
import { ErrorCard } from "../../components/ErrorCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, AlertCircle, Clock } from "lucide-react";

/** True when the API explicitly said the link is gone (revoked/expired/private). */
function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 404 || error.status === 410 || error.status === 403)
  );
}

/** True when the API throttled the request (HTTP 429). */
function isRateLimitedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429;
}

export default function PublicPortfolio() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ["public", "portfolio", token],
    queryFn: () =>
      contractFetch(
        PublicPortfolioResponseSchema,
        `/api/v1/public/portfolio/${token}`,
      ),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <Layout>
      <div className="container mx-auto max-w-3xl px-4 py-10">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        )}

        {/* Not found — the link is revoked, expired, or private */}
        {isError && isNotFoundError(error) && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">포트폴리오를 찾을 수 없습니다</p>
              <p className="text-sm text-muted-foreground">
                링크가 만료되었거나 비공개 상태입니다.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Throttled — too many requests from this network right now */}
        {isError && isRateLimitedError(error) && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Clock className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">
                요청이 많아 잠시 후 다시 시도해주세요
              </p>
              <p className="text-sm text-muted-foreground">
                현재 네트워크에서 요청이 몰리고 있습니다. 링크는 유효하니 잠시
                후 다시 시도해주세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                다시 시도
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Network / API failure — the link may still be valid, offer retry */}
        {isError && !isNotFoundError(error) && !isRateLimitedError(error) && (
          <ErrorCard
            message="포트폴리오를 불러오지 못했습니다."
            onRetry={() => refetch()}
            isRetrying={isRefetching}
          />
        )}

        {/* Portfolio content */}
        {data && (
          <>
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                프로젝트 포트폴리오
              </p>
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(data.createdAt).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                에 등록됨
              </p>
            </div>

            {/* Summary */}
            <Card className="mb-4">
              <CardContent className="p-5">
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
                  프로젝트 요약
                </h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {data.summary}
                </p>
              </CardContent>
            </Card>

            {/* Tech stack */}
            {data.techStack.length > 0 && (
              <Card className="mb-4">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                    기술 스택
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {data.techStack.map((tech) => (
                      <Badge key={tech} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Output links */}
            {data.outputLinks.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                    산출물 링크
                  </h2>
                  <ul className="space-y-2">
                    {data.outputLinks.map((link) => (
                      <li key={link}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          {link}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
