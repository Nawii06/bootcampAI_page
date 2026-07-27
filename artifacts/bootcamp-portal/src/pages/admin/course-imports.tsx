import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  ImportJobSummarySchema,
  type ImportJobSummary as ImportJob,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const example = JSON.stringify([
  { courseCode: "AI401", name: "생성형 AI 프로젝트", defaultCredits: 3, externalId: "AI401-2026" },
], null, 2);

export default function AdminCourseImports() {
  const [sourceSystem, setSourceSystem] = useState("FD_Set_01_UPLOAD");
  const [rawRows, setRawRows] = useState(example);
  const [job, setJob] = useState<ImportJob>();
  const [selectedFile, setSelectedFile] = useState<File>();
  const stage = useMutation({
    mutationFn: async () => {
      const years = await contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true");
      const rows = JSON.parse(rawRows) as Array<Record<string, unknown>>;
      return contractFetch(ImportJobSummarySchema, "/api/v1/course-imports", {
        method: "POST", credentials: "include",
        body: JSON.stringify({
          businessYearId: years.data[0]?.id,
          sourceSystem,
          sourceType: "JSON",
          rows: rows.map((row) => ({ ...row, sourceSystem })),
        }),
      });
    },
    onSuccess: setJob,
  });
  const preview = useMutation({
    mutationFn: () => contractFetch(ImportJobSummarySchema, `/api/v1/course-imports/${job!.id}/preview`, { method: "POST", credentials: "include" }),
    onSuccess: setJob,
  });
  const upload = useMutation({
    mutationFn: async () => {
      const years = await contractFetch(BusinessYearListResponseSchema, "/api/v1/reference/business-years?active=true");
      const form = new FormData();
      form.append("file", selectedFile!);
      form.append("businessYearId", years.data[0]?.id ?? "");
      form.append("sourceSystem", sourceSystem);
      return contractFetch(ImportJobSummarySchema, "/api/v1/course-imports/upload", {
        method: "POST", credentials: "include", body: form,
      });
    },
    onSuccess: setJob,
  });
  const commit = useMutation({
    mutationFn: () => contractFetch(ImportJobSummarySchema, `/api/v1/course-imports/${job!.id}/commit`, { method: "POST", credentials: "include" }),
    onSuccess: setJob,
  });
  const error = stage.error ?? upload.error ?? preview.error ?? commit.error;
  return (
    <PortalLayout>
      <SectionHeader title="교과목 가져오기" description="staging → validation → preview → commit 순서로 외부 데이터를 반영합니다." />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border bg-card p-5">
          <label className="text-sm font-medium">외부 시스템</label>
          <Input className="mb-4 mt-2" value={sourceSystem} onChange={(e) => setSourceSystem(e.target.value)} />
          <label className="text-sm font-medium">JSON 데이터</label>
          <textarea className="mt-2 min-h-80 w-full rounded-md border bg-background p-3 font-mono text-sm" value={rawRows} onChange={(e) => setRawRows(e.target.value)} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button disabled={!sourceSystem || !rawRows || stage.isPending} onClick={() => stage.mutate()}>1. JSON Staging 및 Validation</Button>
          </div>
          <div className="mt-6 border-t pt-5">
            <label className="text-sm font-medium">CSV/XLSX/JSON 파일</label>
            <Input className="mt-2" type="file" accept=".csv,.xlsx,.json" onChange={(e) => setSelectedFile(e.target.files?.[0])} />
            <Button variant="outline" className="mt-3" disabled={!selectedFile || !sourceSystem || upload.isPending} onClick={() => upload.mutate()}>파일 업로드 및 Validation</Button>
            <p className="mt-2 text-xs text-muted-foreground">확장자·용량·MIME type 검증 후 동일한 Preview/Commit 단계를 사용합니다.</p>
          </div>
        </section>
        <aside className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">가져오기 작업</h3>
          {job ? (
            <div className="mt-4 space-y-3 text-sm">
              <p><span className="text-muted-foreground">상태</span><strong className="float-right">{job.status}</strong></p>
              <p>전체 <strong className="float-right">{job.totalRows}</strong></p>
              <p>정상 <strong className="float-right text-emerald-600">{job.validRows}</strong></p>
              <p>오류 <strong className="float-right text-destructive">{job.invalidRows}</strong></p>
              <p>추가/수정/동일 <strong className="float-right">{job.insertRows}/{job.updateRows}/{job.unchangedRows}</strong></p>
              <Button variant="outline" className="w-full" disabled={job.status === "COMMITTED" || preview.isPending} onClick={() => preview.mutate()}>2. Preview</Button>
              <Button className="w-full" disabled={job.status !== "PREVIEWED" || job.invalidRows > 0 || commit.isPending} onClick={() => commit.mutate()}>3. Commit</Button>
            </div>
          ) : <p className="mt-4 text-sm text-muted-foreground">데이터를 검증하면 작업 결과가 표시됩니다.</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error.message}</p>}
        </aside>
      </div>
    </PortalLayout>
  );
}
