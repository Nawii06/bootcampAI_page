import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import {
  BusinessYearListResponseSchema,
  ExperientialRecordListResponseSchema,
  type ExperientialRecordResponse as PortfolioRecord,
} from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField, PrivacyWarningNotice } from "../../components/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentPortfolio() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [techStack, setTechStack] = useState("");
  const [outputLinks, setOutputLinks] = useState("");
  const [publicConsent, setPublicConsent] = useState(false);
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () =>
      contractFetch(
        BusinessYearListResponseSchema,
        "/api/v1/reference/business-years?active=true",
      ),
  });
  const yearId = years.data?.data[0]?.id;
  const records = useQuery({
    queryKey: ["student", "experiential-records", yearId, "PROJECT"],
    enabled: Boolean(yearId),
    queryFn: () =>
      contractFetch(
        ExperientialRecordListResponseSchema,
        `/api/v1/experiential-records?businessYearId=${yearId}&type=PROJECT`,
        { credentials: "include" },
      ),
  });
  const createRecord = useMutation({
    mutationFn: () =>
      customFetch("/api/v1/experiential-records", {
        method: "POST",
        responseType: "json",
        credentials: "include",
        body: JSON.stringify({
          businessYearId: yearId,
          type: "PROJECT",
          title,
          status: "SUBMITTED",
          evidence: {
            summary,
            techStack: techStack.split(",").map((item) => item.trim()).filter(Boolean),
            outputLinks: outputLinks.split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
            publicConsent,
          },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["student", "experiential-records", yearId, "PROJECT"],
      });
      setTitle("");
      setSummary("");
      setTechStack("");
      setOutputLinks("");
      setPublicConsent(false);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (yearId && title.trim() && summary.trim()) createRecord.mutate();
  }

  return (
    <PortalLayout>
      <SectionHeader
        title="프로젝트 포트폴리오"
        description="프로젝트 수행내용과 산출물을 학생 경험기록으로 관리합니다."
      />
      <PrivacyWarningNotice />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={submit} className="space-y-5">
              <FormField label="프로젝트명" required>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </FormField>
              <FormField label="프로젝트 요약" required>
                <Textarea rows={5} value={summary} onChange={(event) => setSummary(event.target.value)} />
              </FormField>
              <FormField label="기술스택">
                <Input
                  value={techStack}
                  onChange={(event) => setTechStack(event.target.value)}
                  placeholder="Python, PyTorch, ROS2"
                />
              </FormField>
              <FormField label="산출물 링크">
                <Textarea
                  rows={3}
                  value={outputLinks}
                  onChange={(event) => setOutputLinks(event.target.value)}
                  placeholder="한 줄에 하나의 https:// 링크"
                />
              </FormField>
              <label className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                <Checkbox
                  checked={publicConsent}
                  onCheckedChange={(checked) => setPublicConsent(checked === true)}
                />
                참여기업의 채용·인턴십 검토를 위한 포트폴리오 공개에 동의합니다.
              </label>
              <Button
                className="w-full"
                type="submit"
                disabled={!yearId || !title.trim() || !summary.trim() || createRecord.isPending}
              >
                포트폴리오 등록
              </Button>
              {createRecord.isError && (
                <p className="text-sm text-destructive">{createRecord.error.message}</p>
              )}
            </form>
          </CardContent>
        </Card>
        <div className="space-y-4">
          {(records.data?.data ?? []).map((record) => (
            <Card key={record.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{record.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {record.evidence.summary}
                    </p>
                  </div>
                  <Badge variant={record.status === "VERIFIED" ? "default" : "secondary"}>
                    {record.status}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {record.evidence.techStack.map((tech) => (
                    <Badge key={tech} variant="outline">{tech}</Badge>
                  ))}
                </div>
                {record.evidence.outputLinks.length > 0 && (
                  <div className="mt-4 space-y-1 text-sm">
                    {record.evidence.outputLinks.map((link) => (
                      <a key={link} className="block text-primary hover:underline" href={link} target="_blank" rel="noreferrer">
                        {link}
                      </a>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  공개동의: {record.evidence.publicConsent ? "동의" : "비동의"} · 등록일{" "}
                  {new Date(record.createdAt).toLocaleDateString("ko-KR")}
                </p>
              </CardContent>
            </Card>
          ))}
          {!records.isLoading && (records.data?.data.length ?? 0) === 0 && (
            <div className="rounded-md border p-10 text-center text-muted-foreground">
              등록된 프로젝트 포트폴리오가 없습니다.
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
