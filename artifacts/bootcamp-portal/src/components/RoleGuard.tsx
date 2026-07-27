import type { ComponentType } from "react";
import { Link, useLocation } from "wouter";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingCard } from "@/components/LoadingCard";

export function withRoleGuard(
  Component: ComponentType,
  allowedRoles: string[],
) {
  return function GuardedRoute() {
    const { user, isLoading } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
          <LoadingCard message="세션 확인 중입니다…" className="w-full max-w-sm" />
        </div>
      );
    }

    if (!user) {
      const redirectParam = encodeURIComponent(location);
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
          <div className="max-w-lg rounded-lg border bg-background p-8 text-center shadow-sm">
            <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-sm font-semibold text-muted-foreground">로그인 필요</p>
            <h1 className="mt-2 text-2xl font-bold">
              이 화면은 로그인 후 이용할 수 있습니다.
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              세션이 만료되었거나 로그인하지 않은 상태입니다.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href={`/login?redirect=${redirectParam}`}>
                <Button>로그인하기</Button>
              </Link>
              <Link href="/public/home">
                <Button variant="outline">공개 홈페이지</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    const permitted =
      user.roles?.includes("SYSTEM_ADMIN") ||
      allowedRoles.some((role) => user.roles?.includes(role));

    if (!permitted) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
          <div className="max-w-lg rounded-lg border bg-background p-8 text-center shadow-sm">
            <p className="text-sm font-semibold text-destructive">403 · 접근 권한 없음</p>
            <h1 className="mt-2 text-2xl font-bold">이 업무화면을 조회할 권한이 없습니다.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              현재 역할: {user.roles?.join(", ")}
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Link href={user.defaultRoute ?? "/public/home"}>
                <Button>허용된 화면으로 이동</Button>
              </Link>
              <Link href="/public/home">
                <Button variant="outline">공개 홈페이지</Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return <Component />;
  };
}
