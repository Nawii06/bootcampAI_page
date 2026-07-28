import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import {
  BusinessYearListResponseSchema,
  ExperientialRecordListResponseSchema,
  StudentEmploymentLinksResponseSchema,
  type ExperientialRecordResponse as PortfolioRecord,
  type StudentEmploymentLinkResponse,
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
import { ErrorCard } from "@/components/ErrorCard";
import { NoActiveYearNotice } from "@/components/NoActiveYearNotice";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Unlink } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const PARTICIPATION_LABELS: Record<string, string> = {
  EMPLOYMENT: "채용 연계",
  INTERNSHIP: "인턴십",
  FIELD_PRACTICE: "현장실습",
};

function formatDateRange(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
) {
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(
      new Date(iso),
    );
  if (startsAt && endsAt) return `${fmt(startsAt)} ~ ${fmt(endsAt)}`;
  if (startsAt) return `${fmt(startsAt)} ~`;
  if (endsAt) return `~ ${fmt(endsAt)}`;
  return "기간 미정";
}

export default function StudentPortfolio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PortfolioRecord | null>(null);

  async function handleRevokeLink(record: PortfolioRecord) {
    setRevokingId(record.id);
    try {
      await customFetch(
        `/api/v1/experiential-records/${record.id}/share-token`,
        { method: "DELETE", responseType: "json", credentials: "include" },
      );
      queryClient.invalidateQueries({
        queryKey: ["student", "experiential-records"],
      });
      toast({
        title: "링크 해제됨",
        description:
          "기존 공유 링크가 더 이상 작동하지 않습니다. 링크 복사 버튼으로 새 링크를 만들 수 있습니다.",
      });
    } catch {
      toast({ title: "링크 해제 실패", variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  }

  async function handleCopyLink(record: PortfolioRecord) {
    setCopyingId(record.id);
    try {
      let token = record.evidence.shareToken;
      if (!token) {
        const result = await customFetch(
          `/api/v1/experiential-records/${record.id}/share-token`,
          { method: "POST", responseType: "json", credentials: "include" },
        ) as { shareToken: string };
        token = result.shareToken;
        // Refresh list so the token shows up in subsequent renders
        queryClient.invalidateQueries({
          queryKey: ["student", "experiential-records"],
        });
      }
      await navigator.clipboard.writeText(
        `${window.location.origin}/public/portfolio/${token}`,
      );
      toast({
        title: "링크 복사됨",
        description: "포트폴리오 공유 링크가 클립보드에 복사되었습니다.",
      });
    } catch {
      toast({ title: "복사 실패", variant: "destructive" });
    } finally {
      setCopyingId(null);
    }
  }
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
  const noOpenPeriod = years.isSuccess && years.data.data.length === 0;
  const employmentLinks = useQuery({
    queryKey: ["student", "employment-links", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () =>
      contractFetch(
        StudentEmploymentLinksResponseSchema,
        "/api/v1/my-employment-links",
        { credentials: "include" },
      ),
  });

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
              {noOpenPeriod && (
                <NoActiveYearNotice message="현재 진행 중인 포트폴리오 등록 기간이 없습니다. 등록 기간이 열리면 제출할 수 있습니다." />
              )}
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
          {records.isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-4/5" />
                        <Skeleton className="h-3 w-3/5" />
                      </div>
                      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Skeleton className="h-5 w-14 rounded-full" />
                      <Skeleton className="h-5 w-18 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            : (records.data?.data ?? []).map((record) => (
                <Card key={record.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{record.title}</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {record.evidence.summary}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {record.evidence.publicConsent && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={copyingId === record.id}
                          onClick={() => handleCopyLink(record)}
                        >
                          <Link2 className="mr-1.5 h-3.5 w-3.5" />
                          {copyingId === record.id ? "복사 중…" : "링크 복사"}
                        </Button>
                        {record.evidence.shareToken && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={revokingId === record.id}
                            onClick={() => setRevokeTarget(record)}
                          >
                            <Unlink className="mr-1.5 h-3.5 w-3.5" />
                            {revokingId === record.id ? "해제 중…" : "링크 해제"}
                          </Button>
                        )}
                      </>
                    )}
                    <Badge variant={record.status === "VERIFIED" ? "default" : "secondary"}>
                      {record.status}
                    </Badge>
                  </div>
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
              {noOpenPeriod
                ? "현재 진행 중인 포트폴리오 등록 기간이 없습니다."
                : "등록된 프로젝트 포트폴리오가 없습니다."}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공유 링크를 해제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget
                ? `"${revokeTarget.title}" 포트폴리오의 기존 공유 링크가 즉시 작동을 멈춥니다. 링크를 받은 사람은 더 이상 열람할 수 없으며, 필요하면 링크 복사 버튼으로 새 링크를 만들 수 있습니다.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revokeTarget) handleRevokeLink(revokeTarget);
                setRevokeTarget(null);
              }}
            >
              링크 해제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Employment / internship links ── */}
      <div className="mt-10">
        <SectionHeader
          title="채용·연계 이력"
          description="파트너 기업이 귀하의 포트폴리오와 연결한 채용·실습 현황입니다."
        />

        {employmentLinks.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-start justify-between gap-4 p-5">
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {employmentLinks.isError && (
          <ErrorCard
            message="채용·연계 이력을 불러오지 못했습니다."
            onRetry={() => employmentLinks.refetch()}
            isRetrying={employmentLinks.isFetching}
          />
        )}

        {!employmentLinks.isLoading &&
          !employmentLinks.isError &&
          employmentLinks.data?.data.length === 0 && (
            <div className="rounded-md border p-10 text-center text-sm text-muted-foreground">
              아직 연결된 채용·연계 건이 없습니다. 파트너 기업의 담당자가
              연결하면 여기에 표시됩니다.
            </div>
          )}

        {employmentLinks.data && employmentLinks.data.data.length > 0 && (
          <div className="space-y-3">
            {employmentLinks.data.data.map(
              (link: StudentEmploymentLinkResponse) => (
                <Card key={link.id}>
                  <CardContent className="flex items-start justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <p className="font-medium">{link.companyName}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {link.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateRange(link.startsAt, link.endsAt)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {PARTICIPATION_LABELS[link.participationType] ??
                        link.participationType}
                    </Badge>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
