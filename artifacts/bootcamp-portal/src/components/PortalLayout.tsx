import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface PortalLayoutProps {
  children: React.ReactNode;
}

export function PortalLayout({ children }: PortalLayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const menuItems = {
    student: [
      { label: "내 대시보드", path: "/student/dashboard" },
      { label: "프로그램 신청", path: "/student/apply" },
      { label: "신청현황", path: "/student/status" },
      { label: "이수현황", path: "/student/completion" },
      { label: "포트폴리오", path: "/student/portfolio" }
    ],
    partner: [
      { label: "기관 대시보드", path: "/partner/dashboard" },
      { label: "수요조사 제출", path: "/partner/survey" },
      { label: "프로젝트 제안", path: "/partner/project" },
      { label: "학생 산출물 평가", path: "/partner/evaluation" },
      { label: "채용연계 현황", path: "/partner/employment" }
    ],
    admin: [
      { label: "대시보드", path: "/admin/dashboard" },
      { label: "프로그램 관리", path: "/admin/programs" },
      { label: "신청·선발 관리", path: "/admin/applications" },
      { label: "이수·수료 관리", path: "/admin/completion" },
      { label: "참여기업 관리", path: "/admin/partners" },
      { label: "성과지표 관리", path: "/admin/kpi" },
      { label: "예산 집행현황", path: "/admin/budget" },
      { label: "예산 변경이력", path: "/admin/budget-log" },
      { label: "증빙자료 관리", path: "/admin/evidence" },
      { label: "평가대응", path: "/admin/evaluation" },
      { label: "시스템 설정", path: "/admin/settings" }
    ],
    superAdmin: [
      { label: "전체 대시보드", path: "/superAdmin/dashboard" }
    ],
    public: []
  };

  const navItems = menuItems[user.role as keyof typeof menuItems] || [];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-4 bg-sidebar-accent/10 border-b border-sidebar-border">
          <Link href="/public/home" className="text-xl font-bold tracking-tight block">
            KNUT AI 부트캠프
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/70">{user.role.toUpperCase()} PORTAL</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <Link href="/public/home" className="block w-full text-center text-xs mb-2 text-sidebar-foreground/60 hover:text-sidebar-foreground">
            공개 포털로 이동
          </Link>
          <Button variant="outline" className="w-full bg-transparent text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={logout}>
            로그아웃
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
