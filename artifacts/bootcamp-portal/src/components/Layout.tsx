import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

declare const __FAKE_DATA_SET__: string | null;

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const navItems = [
    ["홈", "/public/home"],
    ["사업소개", "/public/intro"],
    ["교육과정", "/public/curriculum"],
    ["학생모집", "/public/recruitment"],
    ["참여기업·기관", "/public/partners"],
    ["성과·소식", "/public/performance"],
    ["자료실", "/public/resources"],
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {__FAKE_DATA_SET__ && (
        <div className="bg-amber-400 px-4 py-2 text-center text-xs font-semibold text-amber-950">
          Preview Fake Data: {__FAKE_DATA_SET__} · 실제 운영 데이터가 아닙니다.
        </div>
      )}
      <header className="sticky top-0 z-50 bg-primary text-primary-foreground">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/public/home" className="font-bold tracking-tight">
            국립한국교통대학교 <span className="font-normal opacity-75">|</span>{" "}
            첨단산업 인재양성 부트캠프
          </Link>
          {user ? (
            <div className="flex items-center gap-3 text-sm">
              <span>{user.name}</span>
              <Link href={`/${user.role}/dashboard`}>
                <Button variant="secondary" size="sm">업무 포털</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={logout} className="text-foreground">
                로그아웃
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="secondary" size="sm">로그인</Button>
            </Link>
          )}
        </div>
        <nav className="border-b bg-white text-foreground shadow-sm">
          <div className="container mx-auto flex overflow-x-auto px-4">
            {navItems.map(([label, route]) => (
              <Link
                key={route}
                href={route}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                  location.startsWith(route)
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-muted py-8 text-center text-sm text-muted-foreground">
        <p>국립한국교통대학교 첨단산업 인재양성 부트캠프 사업단</p>
        <p className="mt-2 text-xs">
          공개 승인된 정보만 제공하며 업무 데이터는 서버에서 관리합니다.
        </p>
      </footer>
    </div>
  );
}
