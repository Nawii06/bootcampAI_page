import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, type ColumnDef } from "../../components/DataTable";

interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  containsPersonalInfo: boolean;
  isPublic: boolean;
  uploadedByName: string;
  createdAt: string;
}

function fileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminEvidence() {
  const files = useQuery({
    queryKey: ["admin", "stored-files"],
    queryFn: () =>
      customFetch<{ data: StoredFile[] }>("/api/v1/files", {
        responseType: "json",
        credentials: "include",
      }),
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
        <p className="mb-4 text-destructive">증빙자료 목록을 불러오지 못했습니다.</p>
      )}
      <DataTable data={files.data?.data ?? []} columns={columns} />
    </PortalLayout>
  );
}
