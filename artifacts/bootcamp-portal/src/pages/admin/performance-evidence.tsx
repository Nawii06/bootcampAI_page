import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  StoredFileListResponseSchema,
  type StoredFileResponse as StoredFile,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";
import { useHighlightParam } from "@/hooks/useHighlightParam";

export default function AdminPerformanceEvidence() {
  const highlightId = useHighlightParam();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File>();
  const [containsPersonalInfo, setContainsPersonalInfo] = useState(false);
  const files = useQuery({
    queryKey: ["admin", "stored-files"],
    queryFn: () => contractFetch(StoredFileListResponseSchema, "/api/v1/files", { credentials: "include" }),
  });
  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append("file", file!);
      form.append("containsPersonalInfo", String(containsPersonalInfo));
      const response = await fetch("/api/v1/files", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => undefined);
        throw new Error(error?.error?.message ?? "파일 업로드에 실패했습니다.");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "stored-files"] });
      setFile(undefined);
      setContainsPersonalInfo(false);
    },
  });
  const columns: ColumnDef<StoredFile>[] = [
    { key: "originalName", header: "파일명" },
    { key: "mimeType", header: "파일유형" },
    { key: "sizeBytes", header: "크기", cell: (row) => `${Math.ceil(row.sizeBytes / 1024)} KB` },
    {
      key: "containsPersonalInfo",
      header: "개인정보",
      cell: (row) => <Badge variant={row.containsPersonalInfo ? "destructive" : "outline"}>{row.containsPersonalInfo ? "포함" : "미포함"}</Badge>,
    },
    { key: "uploadedByName", header: "등록자" },
    { key: "createdAt", header: "등록일시", cell: (row) => new Date(row.createdAt).toLocaleString("ko-KR") },
  ];
  return (
    <PortalLayout>
      <SectionHeader title="성과 증빙자료" description="확장자·용량·MIME·파일 시그니처 검증 후 비공개 저장합니다." />
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-md border bg-card p-5">
        <input
          type="file"
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
          onChange={(event) => setFile(event.target.files?.[0])}
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={containsPersonalInfo} onChange={(event) => setContainsPersonalInfo(event.target.checked)} />
          개인정보 포함
        </label>
        <Button disabled={!file || upload.isPending} onClick={() => upload.mutate()}>증빙 업로드</Button>
        {upload.isError && <span className="text-sm text-destructive">{upload.error.message}</span>}
      </div>
      {files.isLoading ? (
        <LoadingCard message="증빙자료 목록을 불러오는 중입니다." />
      ) : (
        <>
          {files.isError && (
            <ErrorCard
              message="증빙자료 목록을 불러오지 못했습니다."
              onRetry={() => files.refetch()}
              isRetrying={files.isFetching}
            />
          )}
          <DataTable
            data={files.data?.data ?? []}
            columns={columns}
            highlightId={highlightId}
            highlightMissingMessage="해당 증빙자료를 찾을 수 없습니다."
          />
        </>
      )}
    </PortalLayout>
  );
}
