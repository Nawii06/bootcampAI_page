import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  StoredFileListResponseSchema,
  StoredFileRelationshipsResponseSchema,
  type StoredFileResponse as StoredFile,
} from "@workspace/api-zod";
import { Badge } from "@/components/ui/badge";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ErrorCard } from "@/components/ErrorCard";
import { LoadingCard } from "@/components/LoadingCard";

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminEvidence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const files = useQuery({
    queryKey: ["admin", "stored-files"],
    queryFn: () =>
      contractFetch(StoredFileListResponseSchema, "/api/v1/files", {
        credentials: "include",
      }),
  });
  const relationships = useQuery({
    queryKey: ["admin", "file-relationships", selectedId],
    enabled: Boolean(selectedId),
    queryFn: () => contractFetch(
      StoredFileRelationshipsResponseSchema,
      `/api/v1/files/${selectedId}/relationships`,
      { credentials: "include" },
    ),
  });
  const archive = useMutation({
    mutationFn: (id: string) => customFetch(`/api/v1/files/${id}`, {
      method: "DELETE", responseType: "text", credentials: "include",
    }),
    onSuccess: () => {
      setSelectedId("");
      queryClient.invalidateQueries({ queryKey: ["admin", "stored-files"] });
    },
  });
  const columns: ColumnDef<StoredFile>[] = [
    {
      key: "originalName",
      header: "파일명",
      cell: (row) => <span className="font-medium">{row.originalName}</span>,
    },
    { key: "mimeType", header: "MIME 유형" },
    { key: "sizeBytes", header: "크기", cell: (row) => fileSize(row.sizeBytes) },
    {
      key: "containsPersonalInfo",
      header: "개인정보",
      cell: (row) => (
        <Badge variant={row.containsPersonalInfo ? "destructive" : "outline"}>
          {row.containsPersonalInfo ? "포함" : "미포함"}
        </Badge>
      ),
    },
    {
      key: "isPublic",
      header: "공개",
      cell: (row) => (row.isPublic ? "공개 승인" : "비공개"),
    },
    { key: "uploadedByName", header: "등록자" },
    {
      key: "createdAt",
      header: "등록일시",
      cell: (row) => new Date(row.createdAt).toLocaleString("ko-KR"),
    },
  ];
  return (
    <PortalLayout>
      <SectionHeader
        title="증빙자료 관리"
        description="서버 검증을 거쳐 저장된 증빙파일의 메타데이터를 조회합니다."
      />
      <div className="mb-4 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
        개인정보 포함 파일은 비공개가 기본이며, 조회·수정·다운로드 작업은 감사로그 대상입니다.
      </div>
      {files.isError && (
        <ErrorCard
          message="증빙자료 목록을 불러오지 못했습니다."
          onRetry={() => files.refetch()}
          isRetrying={files.isFetching}
        />
      )}
      {files.isLoading ? (
        <LoadingCard message="증빙자료 목록을 불러오는 중입니다." />
      ) : (
      <DataTable data={files.data?.data ?? []} columns={columns} />
      )}
      <div className="mt-6 space-y-2">
        {(files.data?.data ?? []).map((file) => (
          <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3 text-sm">
            <span>{file.originalName}{file.containsPersonalInfo ? " · 개인정보 포함" : ""}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedId(file.id)}>관계조회</Button>
              <a href={`/api/v1/files/${file.id}/download`}><Button size="sm" variant="outline">다운로드</Button></a>
              {user?.roles?.includes("SYSTEM_ADMIN") && <Button size="sm" variant="ghost" disabled={archive.isPending} onClick={() => archive.mutate(file.id)}>보관</Button>}
            </div>
          </div>
        ))}
      </div>
      {selectedId && (
        <div className="mt-4 rounded-md border bg-muted/30 p-4 text-sm">
          <p className="font-medium">파일 연결관계</p>
          {relationships.data?.relations.map((relation) => <p key={`${relation.relationType}-${relation.relationId}`} className="mt-1 text-muted-foreground">{relation.relationType} · {relation.relationId}</p>)}
          {relationships.data?.relations.length === 0 && <p className="mt-1 text-muted-foreground">연결된 업무 데이터가 없습니다.</p>}
          {relationships.isError && <p className="mt-1 text-destructive">{relationships.error.message}</p>}
        </div>
      )}
      {archive.isError && <p className="mt-4 text-destructive">{archive.error.message}</p>}
    </PortalLayout>
  );
}
