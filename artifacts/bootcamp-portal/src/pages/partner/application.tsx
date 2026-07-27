import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  CompanyApplicationsResponseSchema,
  type CompanyApplicationResponse as Application,
} from "@workspace/api-zod";
import { PortalLayout } from "@/components/PortalLayout";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

declare const __FAKE_DATA_SET__: string | null;

const BUSINESS_YEAR_ID = "fd010000-0000-4000-8000-000000000001";
const api = <T,>(url: string, options?: RequestInit) =>
  customFetch<T>(url, { responseType: "json", credentials: "include", ...options });

export default function PartnerApplication() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [companyName, setCompanyName] = useState("가상모빌리티신청기업01");
  const [commitmentFile, setCommitmentFile] = useState<File | null>(null);
  const applications = useQuery({
    queryKey: ["partner", "company-applications"],
    queryFn: () => contractFetch(
      CompanyApplicationsResponseSchema,
      "/api/v1/company-applications",
      { credentials: "include" },
    ),
  });
  const editable = applications.data?.data.find((row) => ["DRAFT", "SUPPLEMENT_REQUESTED"].includes(row.status));
  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        businessYearId: BUSINESS_YEAR_ID,
        companyName,
        registrationNumber: "FAKE-BIZ-RESUBMIT-01",
        companyType: "중소기업",
        description: "AI 프로젝트·인턴십 참여 신청",
        website: "https://example.invalid/company",
        contact: { name: "가상 신청담당자", email: "applicant@example.invalid" },
        participationTypes: ["PROJECT", "INTERNSHIP"],
      };
      return api(
        editable ? `/api/v1/company-applications/${editable.id}` : "/api/v1/company-applications",
        { method: editable ? "PUT" : "POST", body: JSON.stringify(body) },
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["partner", "company-applications"] }),
  });
  const commitment = useMutation({
    mutationFn: async () => {
      let fileId = "fd010000-0000-4000-8800-000000000001";
      if (!__FAKE_DATA_SET__) {
        if (!commitmentFile) throw new Error("참여확약서 PDF 파일을 선택해 주세요.");
        const form = new FormData();
        form.append("file", commitmentFile);
        form.append("containsPersonalInfo", "false");
        const uploaded = await api<{ id: string }>("/api/v1/files", { method: "POST", body: form });
        fileId = uploaded.id;
      }
      return api("/api/v1/company-commitments", {
        method: "POST",
        body: JSON.stringify({
          businessYearId: BUSINESS_YEAR_ID,
          fileId,
          signedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
        }),
      });
    },
  });
  return (
    <PortalLayout>
      <SectionHeader title="참여기업 신청" description="기업 기본정보와 담당자, 희망 참여분야를 제출하고 보완요청을 확인합니다." />
      {editable?.supplementRequest && (
        <div className="mb-5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">보완요청</p>
          <p>{editable.supplementRequest}</p>
        </div>
      )}
      <div className="rounded-lg border bg-card p-5">
        <label className="text-sm font-medium" htmlFor="company-name">기업명</label>
        <Input id="company-name" className="mt-2" value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <p>기업유형: 중소기업</p><p>참여분야: 프로젝트·인턴십</p>
          <p>담당자: 가상 신청담당자</p><p>이메일: applicant@example.invalid</p>
        </div>
        <Button className="mt-5" disabled={!companyName.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
          {editable ? "보완 후 재제출" : "참여신청 제출"}
        </Button>
      </div>
      <div className="mt-6 space-y-3">
        {(applications.data?.data ?? []).map((row) => (
          <div key={row.id} className="flex justify-between rounded-lg border bg-card p-4 text-sm">
            <span>{row.companyName}</span><span className="font-medium">{row.status}</span>
          </div>
        ))}
      </div>
      {user?.roles?.includes("COMPANY_MANAGER") && (
        <section className="mt-6 rounded-lg border bg-card p-5">
          <h2 className="font-semibold">참여확약서</h2>
          <p className="mt-1 text-sm text-muted-foreground">승인 참여기업은 서명된 PDF를 사업연도별로 등록하거나 교체할 수 있습니다.</p>
          {!__FAKE_DATA_SET__ && <Input className="mt-4" type="file" accept="application/pdf,.pdf" onChange={(event) => setCommitmentFile(event.target.files?.[0] ?? null)} />}
          <Button className="mt-4" variant="outline" disabled={commitment.isPending || (!__FAKE_DATA_SET__ && !commitmentFile)} onClick={() => commitment.mutate()}>
            확약서 등록
          </Button>
          {commitment.isSuccess && <p className="mt-2 text-sm text-emerald-700">참여확약서가 등록되었습니다.</p>}
          {commitment.isError && <p className="mt-2 text-sm text-destructive">{commitment.error.message}</p>}
        </section>
      )}
      {(applications.isError || mutation.isError) && <p className="mt-4 text-sm text-destructive">{(applications.error ?? mutation.error)?.message}</p>}
    </PortalLayout>
  );
}
