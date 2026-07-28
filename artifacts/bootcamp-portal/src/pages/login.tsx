import { LogIn, ShieldCheck } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { useEffect, useState } from "react";
import { contractFetch } from "@workspace/api-client-react";
import {
  FakeIdentityListResponseSchema,
  type FakeIdentitySummary,
} from "@workspace/api-zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";

declare const __FAKE_DATA_SET__: string | null;

export default function Login() {
  const [identities, setIdentities] = useState<FakeIdentitySummary[]>([]);
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { loginWithFakeIdentity, user, isLoading } = useAuth();

  // Decode the redirect path set by RoleGuard / PortalLayout when the session
  // was missing. After login we navigate there instead of defaultRoute.
  const redirectAfterLogin = (() => {
    try {
      const raw = new URLSearchParams(search).get("redirect");
      if (!raw) return null;
      const decoded = decodeURIComponent(raw);
      // Only honor same-app paths: must start with "/" but not "//" (a
      // protocol-relative URL) and contain no backslashes (some browsers
      // normalize "\" to "/"). Anything else (absolute URLs, schemes like
      // javascript:, etc.) falls back to the user's default route.
      if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  })();

  // If the user is already authenticated, redirect immediately.
  useEffect(() => {
    if (!isLoading && user) {
      setLocation(redirectAfterLogin ?? user.defaultRoute ?? "/public/home");
    }
  }, [isLoading, user, redirectAfterLogin, setLocation]);

  useEffect(() => {
    if (__FAKE_DATA_SET__ !== "FD_Set_01") return;
    contractFetch(FakeIdentityListResponseSchema, "/api/v1/fake-auth/identities", {
      credentials: "include",
    })
      .then((response) => setIdentities(response.data))
      .catch(() => setError("가상 계정 목록을 불러오지 못했습니다."));
  }, []);

  // While the session check is in flight, show nothing to avoid a flash of
  // the login form for authenticated users.
  if (isLoading) return null;

  // If user is set, the redirect effect above will fire — render nothing in the
  // meantime so the login form never flashes.
  if (user) return null;

  async function login(identity: FakeIdentitySummary) {
    setPendingId(identity.identityId);
    setError(undefined);
    try {
      const user = await loginWithFakeIdentity(identity.identityId);
      setLocation(redirectAfterLogin ?? user.defaultRoute ?? identity.defaultRoute);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "가상 로그인에 실패했습니다.");
    } finally {
      setPendingId(undefined);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-5xl border-t-4 border-t-primary shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">통합 로그인</CardTitle>
          <CardDescription>
            국립한국교통대학교 첨단산업 인재양성 부트캠프
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            대학 SSO 연동정보가 확정되면 이 화면에서 통합인증으로 이동합니다.
            운영 데이터는 브라우저에 저장하지 않습니다.
          </div>
          <Button className="w-full" disabled>
            <LogIn className="mr-2 h-4 w-4" />
            대학 SSO 연결 준비 중
          </Button>
          {__FAKE_DATA_SET__ === "FD_Set_01" && (
            <section className="space-y-4 border-t pt-6">
              <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <div className="mb-1 flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-4 w-4" /> 개발용 가상 SSO 로그인
                </div>
                FD_Set_01의 모든 계정과 업무정보는 가상 데이터이며 실제 대학 인증과 연결되지 않습니다.
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {identities.map((identity) => (
                  <div key={identity.identityId} className="flex flex-col rounded-lg border bg-background p-4">
                    <h3 className="font-semibold">{identity.displayName}</h3>
                    <div className="my-2 flex flex-wrap gap-1">
                      {identity.roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)}
                    </div>
                    <p className="text-xs font-medium text-primary">{identity.scenarioLabel}</p>
                    <p className="mt-1 flex-1 text-xs text-muted-foreground">{identity.description}</p>
                    <p className="my-2 text-[11px] text-muted-foreground">이동: {identity.defaultRoute}</p>
                    <Button size="sm" onClick={() => login(identity)} disabled={Boolean(pendingId)}>
                      {pendingId === identity.identityId ? "로그인 중..." : "가상 로그인"}
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          )}
          <Link
            href="/public/home"
            className="block text-center text-sm text-muted-foreground hover:text-primary"
          >
            공개 홈페이지로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
