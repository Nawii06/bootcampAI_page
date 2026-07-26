import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

const menus = {
  student: [
    ["대시보드", "/student/dashboard"],
    ["프로그램 신청", "/student/apply"],
    ["신청현황", "/student/status"],
    ["이수현황", "/student/completion"],
    ["포트폴리오", "/student/portfolio"],
  ],
  partner: [
    ["기업 대시보드", "/partner/dashboard"],
    ["수요조사", "/partner/survey"],
    ["프로젝트 제안", "/partner/project"],
    ["학생 평가", "/partner/evaluation"],
    ["채용연계", "/partner/employment"],
  ],
  admin: [
    ["대시보드", "/admin/dashboard"],
    ["프로그램", "/admin/programs"],
    ["신청·선발", "/admin/applications"],
    ["이수관리", "/admin/completion"],
    ["참여기업", "/admin/partners"],
    ["성과관리", "/admin/performance"],
    ["예산", "/admin/budget"],
    ["증빙자료", "/admin/evidence"],
    ["설정", "/admin/settings"],
  ],
  superAdmin: [["시스템 대시보드", "/admin/dashboard"]],
  public: [],
} as const;

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [location] = useLocation();
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
  const items = menus[user.role];
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <aside className="flex w-full shrink-0 flex-col bg-sidebar text-sidebar-foreground md:w-64">
        <div className="border-b border-sidebar-border p-4">
          <Link href="/public/home" className="text-lg font-bold">KNUT AI 부트캠프</Link>
          <p className="mt-4 text-sm font-medium">{user.name}</p>
          <p className="text-xs opacity-70">{user.role.toUpperCase()} PORTAL</p>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {items.map(([label, path]) => (
            <Link
              key={path}
              href={path}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                location.startsWith(path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <Button variant="outline" className="w-full" onClick={logout}>로그아웃</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
