import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { contractFetch, customFetch } from "@workspace/api-client-react";
import { ProgramListResponseSchema } from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField, PrivacyWarningNotice } from "../../components/FormField";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormDraft } from "@/hooks/useFormDraft";

export default function StudentApply() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState("");
  const [reason, setReason] = useState("");

  const { clearDraft } = useFormDraft(
    "/student/apply",
    { sessionId, reason },
    (draft) => {
      if (draft.sessionId) setSessionId(draft.sessionId);
      if (draft.reason) setReason(draft.reason);
    },
  );

  const programs = useQuery({
    queryKey: ["programs", "open"],
    queryFn: () =>
      contractFetch(ProgramListResponseSchema, "/api/v1/programs?status=OPEN", {
        credentials: "include",
      }),
  });

  const application = useMutation({
    mutationFn: () =>
      customFetch("/api/v1/program-applications", {
        method: "POST",
        responseType: "json",
        credentials: "include",
        body: JSON.stringify({
          sessionId,
          studentId: user?.id,
          answers: { reason },
        }),
      }),
    onSuccess: () => {
      clearDraft();
      toast({ title: "신청 완료", description: "프로그램 신청서가 제출되었습니다." });
      setLocation("/student/status");
    },
    onError: (error: Error) => {
      toast({ title: "신청 실패", description: error.message, variant: "destructive" });
    },
  });

  const sessions =
    programs.data?.data.flatMap((program) =>
      (program.programSessions ?? [])
        .filter((session) => session.status === "OPEN")
        .map((session) => ({ ...session, programName: program.name })),
    ) ?? [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user || !sessionId || !reason.trim()) {
      toast({ title: "입력 확인", description: "프로그램과 신청 사유를 입력해 주세요.", variant: "destructive" });
      return;
    }
    application.mutate();
  }

  return (
    <PortalLayout>
      <SectionHeader title="프로그램 신청" description="신청기간과 자격요건은 서버에서 검증됩니다." />
      <PrivacyWarningNotice />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <FormField label="신청 프로그램 회차" required>
              <Select value={sessionId} onValueChange={setSessionId}>
                <SelectTrigger><SelectValue placeholder="회차를 선택하세요" /></SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.programName} · {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="신청 사유 및 학업 계획" required showPrivacyWarning>
              <Textarea rows={6} value={reason} onChange={(event) => setReason(event.target.value)} />
            </FormField>
            {programs.isError && (
              <p className="text-sm text-destructive">프로그램 API에 연결할 수 없습니다.</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={application.isPending || !user}>
                {application.isPending ? "제출 중…" : "신청서 제출"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
