import { LogIn } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Login() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-lg">
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
