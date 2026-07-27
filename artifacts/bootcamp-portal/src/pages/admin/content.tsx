import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  ContentOperationsResponseSchema,
  ContentVersionListResponseSchema,
  StoredFileListResponseSchema,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";

interface ContentItem {
  id: string; contentType: string; title: string; slug: string; status: string;
  body: string; publishedAt?: string; isPinned: boolean;
}
interface Attachment { id: string; contentId: string; fileId: string }
const api = <T,>(url: string, options?: RequestInit) =>
  customFetch<T>(url, { responseType: "json", credentials: "include", ...options });

export default function AdminContent() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [contentType, setContentType] = useState("NOTICE");
  const [title, setTitle] = useState("2026 부트캠프 운영 안내");
  const [body, setBody] = useState("첨단산업 인재양성 부트캠프 운영 안내입니다.");
  const [historyContentId, setHistoryContentId] = useState<string>();
  const canEdit = user?.roles?.some((role) => ["CONTENT_EDITOR", "SYSTEM_ADMIN"].includes(role));
  const canReview = user?.roles?.some((role) => ["REVIEWER", "SYSTEM_ADMIN"].includes(role));
  const content = useQuery({
    queryKey: ["admin", "content"],
    queryFn: () => contractFetch(ContentOperationsResponseSchema, "/api/v1/content", { credentials: "include" }),
  });
  const files = useQuery({
    queryKey: ["admin", "stored-files", "content"],
    enabled: Boolean(canEdit),
    queryFn: () => contractFetch(StoredFileListResponseSchema, "/api/v1/files", {
      credentials: "include",
    }),
  });
  const versions = useQuery({
    queryKey: ["admin", "content-versions", historyContentId],
    enabled: Boolean(historyContentId),
    queryFn: () => contractFetch(
      ContentVersionListResponseSchema,
      `/api/v1/content/${historyContentId}/versions`,
      { credentials: "include" },
    ),
  });
  const create = useMutation({
    mutationFn: () => api("/api/v1/content", {
      method: "POST",
      body: JSON.stringify({
        contentType,
        slug: `preview-${Date.now()}`,
        title,
        summary: body.slice(0, 80),
        body,
        metadata: { source: "portal-cms" },
        isPinned: false,
        attachmentFileIds: contentType === "RESOURCE" && files.data?.data[0]
          ? [files.data.data[0].id]
          : [],
      }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "content"] }),
  });
  const transition = useMutation({
    mutationFn: ({ id, action, publishAt }: { id: string; action: string; publishAt?: string }) =>
      api(`/api/v1/content/${id}/transition`, {
        method: "POST", body: JSON.stringify({ action, publishAt }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      queryClient.invalidateQueries({ queryKey: ["public", "content"] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, title, body, changeSummary }: { id: string; title: string; body: string; changeSummary: string }) =>
      api(`/api/v1/content/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ title, body, summary: body.slice(0, 80), changeSummary }),
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "content"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "content-versions", variables.id] });
    },
  });
  return (
    <PortalLayout>
      <SectionHeader title="콘텐츠 CMS" description="공지·모집공고·사업소식·성과사례·자료실을 작성하고 검토·예약발행합니다." />
      {canEdit && (
        <section className="mb-6 grid gap-3 rounded-lg border bg-card p-5 md:grid-cols-[180px_1fr_1fr_auto]">
          <select className="h-10 rounded-md border bg-background px-3" value={contentType} onChange={(event) => setContentType(event.target.value)}>
            <option value="NOTICE">공지사항</option><option value="RECRUITMENT">모집공고</option>
            <option value="NEWS">사업소식</option><option value="PERFORMANCE_CASE">성과사례</option>
            <option value="RESOURCE">자료실</option>
          </select>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" />
          <Input value={body} onChange={(event) => setBody(event.target.value)} placeholder="본문" />
          <Button disabled={!title.trim() || !body.trim() || create.isPending} onClick={() => create.mutate()}>초안 작성</Button>
        </section>
      )}
      <div className="space-y-3">
        {(content.data?.data ?? []).map((item) => {
          const attachments = content.data?.attachments.filter((row) => row.contentId === item.id).length ?? 0;
          const scheduled = item.status === "PUBLISHED" && item.publishedAt && new Date(item.publishedAt) > new Date();
          return <article key={item.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.contentType} · {item.status}{scheduled ? " · 예약발행" : ""} · 첨부 {attachments}건</p></div>
              <div className="flex flex-wrap gap-2">
                {canEdit && item.status === "DRAFT" && (
                  <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => {
                    const nextTitle = window.prompt("수정할 제목을 입력하세요.", item.title);
                    const nextBody = nextTitle ? window.prompt("수정할 본문을 입력하세요.", item.body) : null;
                    const changeSummary = nextBody ? window.prompt("변경 사유를 입력하세요.") : null;
                    if (!nextTitle || !nextBody || !changeSummary) return;
                    update.mutate({ id: item.id, title: nextTitle, body: nextBody, changeSummary });
                  }}>초안 수정</Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setHistoryContentId(
                  historyContentId === item.id ? undefined : item.id,
                )}>버전 이력</Button>
                {canEdit && item.status === "DRAFT" && <Button size="sm" variant="outline" disabled={transition.isPending} onClick={() => transition.mutate({ id: item.id, action: "SUBMIT_REVIEW" })}>검토요청</Button>}
                {canReview && item.status === "IN_REVIEW" && <Button size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ id: item.id, action: "APPROVE" })}>승인</Button>}
                {canEdit && item.status === "APPROVED" && <>
                  <Button size="sm" disabled={transition.isPending} onClick={() => transition.mutate({ id: item.id, action: "PUBLISH" })}>즉시발행</Button>
                  <Button size="sm" variant="outline" disabled={transition.isPending} onClick={() => transition.mutate({ id: item.id, action: "PUBLISH", publishAt: new Date(Date.now() + 3600000).toISOString() })}>1시간 후 예약</Button>
                </>}
                {(canEdit || canReview) && item.status !== "ARCHIVED" && <Button size="sm" variant="ghost" disabled={transition.isPending} onClick={() => transition.mutate({ id: item.id, action: "ARCHIVE" })}>보관</Button>}
              </div>
            </div>
            {historyContentId === item.id && (
              <div className="mt-3 border-t pt-3 text-sm">
                {versions.isLoading && <p className="text-muted-foreground">버전 이력을 불러오는 중입니다.</p>}
                {(versions.data?.data ?? []).map((version) => (
                  <p key={version.id}>
                    v{version.version} · {version.changeSummary} · {new Date(version.createdAt).toLocaleString("ko-KR")}
                  </p>
                ))}
              </div>
            )}
          </article>;
        })}
      </div>
      {(content.isError || versions.isError) && (
        <ErrorCard
          message={(content.error ?? versions.error)?.message}
          onRetry={() => { content.refetch(); versions.refetch(); }}
          isRetrying={content.isFetching || versions.isFetching}
        />
      )}
      {(create.isError || transition.isError || update.isError) && (
        <p className="mt-4 text-sm text-destructive">
          {(create.error ?? transition.error ?? update.error)?.message}
        </p>
      )}
    </PortalLayout>
  );
}
