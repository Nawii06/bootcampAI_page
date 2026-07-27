import { useQuery } from "@tanstack/react-query";
import { contractFetch } from "@workspace/api-client-react";
import { SystemStatusResponseSchema } from "@workspace/api-zod";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Status({ ready, readyLabel = "설정됨" }: { ready: boolean; readyLabel?: string }) {
  return <Badge variant={ready ? "default" : "secondary"}>{ready ? readyLabel : "미설정"}</Badge>;
}

export default function AdminSettings() {
  const status = useQuery({
    queryKey: ["system", "status"],
    queryFn: () => contractFetch(SystemStatusResponseSchema, "/api/v1/system/status", {
      credentials: "include",
    }),
  });
  const data = status.data;
  return (
    <PortalLayout>
      <SectionHeader title="시스템 설정 상태" description="비밀값을 노출하지 않고 운영환경의 필수 연동 설정 여부를 확인합니다." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-lg">핵심 인프라</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="flex justify-between"><span>PostgreSQL</span><Status ready={data?.database === "CONNECTED"} readyLabel="연결됨" /></div>
          <div className="flex justify-between"><span>파일 저장소</span><Status ready={Boolean(data?.fileStorageConfigured)} /></div>
          <div className="flex justify-between"><span>악성코드 검사</span><Status ready={Boolean(data?.malwareScanningConfigured)} /></div>
          <div className="flex justify-between"><span>외부 import allowlist</span><Status ready={Boolean(data?.externalImportAllowlistConfigured)} /></div>
          <div className="flex justify-between"><span>실행환경</span><Badge variant="outline">{data?.environment ?? "확인 중"}</Badge></div>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">인증·보안</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="flex justify-between"><span>대학 SSO</span><Status ready={Boolean(data?.ssoConfigured)} /></div>
          <div className="flex justify-between"><span>개발 mock 인증</span><Badge variant={data?.mockAuthEnabled ? "destructive" : "outline"}>{data?.mockAuthEnabled ? "활성" : "비활성"}</Badge></div>
          <p className="border-t pt-4 text-sm text-muted-foreground">
            운영 데이터 삭제·초기화 기능은 제공하지 않습니다. migration, seed, 복구 작업은 승인된 운영 절차와 별도 DB 계정으로 수행합니다.
          </p>
        </CardContent></Card>
      </div>
      {status.isError && <p className="mt-4 text-destructive">시스템 상태를 조회하지 못했습니다. SYSTEM_ADMIN 또는 AUDITOR 권한을 확인해 주세요.</p>}
    </PortalLayout>
  );
}
