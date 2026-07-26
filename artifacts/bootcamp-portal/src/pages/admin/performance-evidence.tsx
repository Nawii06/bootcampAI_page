import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface StoredFile {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  containsPersonalInfo: boolean;
  uploadedByName: string;
  createdAt: string;
}

export default function AdminPerformanceEvidence() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File>();
  const [containsPersonalInfo, setContainsPersonalInfo] = useState(false);
  const files = useQuery({
    queryKey: ["admin", "stored-files"],
    queryFn: () => customFetch<{ data: StoredFile[] }>("/api/v1/files", {
      responseType: "json", credentials: "include",
    }),
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
      <DataTable data={files.data?.data ?? []} columns={columns} />
    </PortalLayout>
  );
}
