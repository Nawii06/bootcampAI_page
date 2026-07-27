import type { ComponentType } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function withRoleGuard(
  Component: ComponentType,
  allowedRoles: string[],
) {
  return function GuardedRoute() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return <div className="p-8 text-center text-muted-foreground">세션 확인 중입니다.</div>;
    }
    if (!user) {
      return (
        <div className="p-8 text-center">
          <p className="mb-4">로그인이 필요한 화면입니다.</p>
          <Link href="/login"><Button>로그인 화면</Button></Link>
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
              <Link href={user.defaultRoute ?? "/public/home"}><Button>허용된 화면으로 이동</Button></Link>
              <Link href="/public/home"><Button variant="outline">공개 홈페이지</Button></Link>
            </div>
          </div>
        </div>
      );
    }
    return <Component />;
  };
}

