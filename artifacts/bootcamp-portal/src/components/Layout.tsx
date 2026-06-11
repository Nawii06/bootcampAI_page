import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "../contexts/AuthContext";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "홈", path: "/public/home" },
    { label: "사업소개", path: "/public/intro" },
    { label: "교육과정", path: "/public/curriculum" },
    { label: "학생모집", path: "/public/recruitment" },
    { label: "참여기업·기관", path: "/public/partners" },
    { label: "성과·소식", path: "/public/performance" },
    { label: "자료실", path: "/public/resources" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="bg-primary text-primary-foreground sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/public/home" className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <span>국립한국교통대학교</span>
            <span className="opacity-80 font-normal">|</span>
            <span>첨단산업 인재양성 부트캠프</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4 text-sm">
                <span>{user.name} 님 환영합니다</span>
                <Link href={`/${user.role}/dashboard`}>
                  <Button variant="secondary" size="sm">나의 포털</Button>
                </Link>
                <Button variant="outline" size="sm" onClick={logout} className="text-foreground">로그아웃</Button>
              </div>
            ) : (
              <Link href="/login">
                <Button variant="secondary" size="sm">로그인</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="bg-white text-foreground border-b shadow-sm">
          <div className="container mx-auto px-4 flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors hover:bg-gray-50 ${
                  location.startsWith(item.path) || (location === "/" && item.path === "/public/home")
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-gray-100 py-8 text-center text-sm text-muted-foreground">
        <p>국립한국교통대학교 첨단산업 인재양성 부트캠프(AI) 사업단</p>
        <p className="mt-2 text-xs">본 시스템은 검토용 Mock 시스템입니다. 실제 개인정보가 저장되지 않습니다.</p>
      </footer>
    </div>
  );
}
