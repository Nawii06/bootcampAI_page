import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function Login() {
  const { loginAs } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight text-primary">SSO 로그인 (Mock)</CardTitle>
          <CardDescription>KNUT 첨단산업 인재양성 부트캠프 포털</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md mb-6">
            <p className="text-sm text-blue-800 font-medium">본 화면은 SSO 연동 구조 검토용 mock입니다. 실제 학내 SSO 토큰, 학번, 개인정보는 저장하지 않습니다.</p>
          </div>
          
          <div className="space-y-3">
            <Button 
              className="w-full justify-start text-left font-medium h-12" 
              variant="outline"
              onClick={() => loginAs("student")}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-3 font-bold text-xs">학</div>
              학생으로 로그인
            </Button>
            
            <Button 
              className="w-full justify-start text-left font-medium h-12" 
              variant="outline"
              onClick={() => loginAs("partner")}
            >
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center mr-3 font-bold text-xs">기</div>
              기업/기관으로 로그인
            </Button>
            
            <Button 
              className="w-full justify-start text-left font-medium h-12" 
              variant="outline"
              onClick={() => loginAs("admin")}
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center mr-3 font-bold text-xs">관</div>
              관리자로 로그인
            </Button>
          </div>

          <div className="mt-8 text-center">
            <Link href="/public/home" className="text-sm text-muted-foreground hover:text-primary hover:underline">
              비로그인으로 홈페이지 둘러보기
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
