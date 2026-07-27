import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { LoadingCard } from "@/components/LoadingCard";

declare const __FAKE_DATA_SET__: string | null;

const menus = {
  student: [
    ["대시보드", "/student/dashboard"],
    ["프로그램 신청", "/student/apply"],
    ["신청현황", "/student/status"],
    ["이수현황", "/student/completion"],
    ["포트폴리오", "/student/portfolio"],
    ["과제·만족도", "/student/learning"],
  ],
  partner: [
    ["기업 대시보드", "/partner/dashboard"],
    ["참여기업 신청", "/partner/application"],
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
  superAdmin: [
    ["시스템 대시보드", "/admin/dashboard"],
    ["프로그램", "/admin/programs"],
    ["신청·선발", "/admin/applications"],
    ["이수관리", "/admin/completion"],
    ["참여기업", "/admin/partners"],
    ["예산", "/admin/budget"],
    ["예산 변경이력", "/admin/budget-log"],
    ["성과관리", "/admin/performance"],
    ["증빙자료", "/admin/evidence"],
    ["시스템 설정", "/admin/settings"],
    ["감사로그", "/admin/audit-logs"],
    ["Preview 업무현황", "/admin/preview-operations"],
    ["학사·교육과정", "/admin/academics"],
    ["교과목 가져오기", "/admin/course-imports"],
    ["프로그램 운영", "/admin/program-operations"],
    ["콘텐츠 CMS", "/admin/content"],
  ],
  public: [],
} as const;

const roleMenus: Record<string, ReadonlyArray<readonly [string, string]>> = {
  EDUCATION_STAFF: [["대시보드","/admin/dashboard"],["학사·교육과정","/admin/academics"],["교과목 가져오기","/admin/course-imports"],["프로그램","/admin/programs"],["프로그램 운영","/admin/program-operations"],["신청·선발","/admin/applications"],["이수확정","/admin/completion"],["증빙자료","/admin/evidence"]],
  BENEFIT_STAFF: [["대시보드","/admin/dashboard"],["수혜정책·대상자","/admin/benefits"]],
  COMPANY_STAFF: [["대시보드","/admin/dashboard"],["기업신청 Preview","/admin/preview-operations"],["참여기업","/admin/partners"]],
  BUDGET_STAFF: [["대시보드","/admin/dashboard"],["예산","/admin/budget"],["변경이력","/admin/budget-log"],["증빙자료","/admin/evidence"]],
  PERFORMANCE_STAFF: [["대시보드","/admin/dashboard"],["성과관리","/admin/performance"],["성과지표","/admin/performance/indicators"],["성과실적","/admin/performance/results"],["성과증빙","/admin/performance/evidence"],["내보내기","/admin/performance/export"]],
  CONTENT_EDITOR: [["대시보드","/admin/dashboard"],["콘텐츠 CMS","/admin/content"]],
  REVIEWER: [["검토 대시보드","/admin/dashboard"],["학사·교육과정","/admin/academics"],["교과목 가져오기","/admin/course-imports"],["프로그램 운영","/admin/program-operations"],["수혜자 검토","/admin/benefits"],["콘텐츠 검토","/admin/content"],["통합 검토대기","/admin/preview-operations"],["통합평가","/admin/evaluation"],["성과관리","/admin/performance"],["예산 변경이력","/admin/budget-log"]],
  AUDITOR: [["감사 대시보드","/admin/dashboard"],["감사로그","/admin/audit-logs"],["가상 감사로그","/admin/preview-operations"],["수혜자 조회","/admin/benefits"],["예산 조회","/admin/budget"],["예산 변경이력","/admin/budget-log"],["성과 조회","/admin/performance"],["증빙 조회","/admin/evidence"]],
};

export function PortalLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
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
  const detailedRole = user.roles?.find((role) => roleMenus[role]);
  const items = user.role === "superAdmin"
    ? menus.superAdmin
    : detailedRole
      ? roleMenus[detailedRole]
      : menus[user.role];
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
      {__FAKE_DATA_SET__ && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-500 bg-amber-300 px-4 py-2 text-center text-xs font-semibold text-amber-950 md:left-64">
          Preview Fake Data: {__FAKE_DATA_SET__} · {user.name} · {user.roles?.join(", ")}
          <span className="ml-2 font-normal">현재 계정과 업무정보는 모두 가상 데이터이며 운영 DB·대학 SSO와 연결되지 않았습니다.</span>
        </div>
      )}
    </div>
  );
}
