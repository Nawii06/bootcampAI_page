import React from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminSettings() {
  const { toast } = useToast();

  const handleReset = () => {
    if (confirm("모든 데이터(신청 내역, 포트폴리오 등)가 초기 상태로 리셋됩니다. 계속하시겠습니까?")) {
      storageService.reset();
      toast({ title: "초기화 완료", description: "샘플 데이터로 시스템이 초기화되었습니다." });
      window.location.reload();
    }
  };

  return (
    <PortalLayout>
      <SectionHeader title="시스템 설정" description="포털 시스템 환경 및 연동 상태 모니터링" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">외부 시스템 연동 상태 (Mock)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">학내 SSO (정보전산원)</span>
              <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">연동 예정 - 협의 필요</Badge>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">학사정보시스템 (학사지원팀)</span>
              <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200">2단계 예정</Badge>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-medium">한국연구재단 RCMS</span>
              <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200">2단계 예정</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">국가인재데이터베이스(K-PASS)</span>
              <Badge variant="outline" className="text-gray-500 bg-gray-50 border-gray-200">2단계 예정</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">보안 및 정책</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              <strong className="block mb-1">🚨 개인정보 업로드 금지 정책 적용 중</strong>
              현재 시스템은 데모/mock 모드로 동작 중이며, 주민등록번호, 연락처 등 고유식별정보의 평문 저장을 시스템 차원에서 차단하고 있습니다.
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-bold text-sm mb-2 text-foreground">데이터 관리</h4>
              <p className="text-xs text-muted-foreground mb-4">
                localStorage에 저장된 모든 테스트 데이터를 삭제하고 초기 제공된 샘플 데이터로 되돌립니다.
              </p>
              <Button variant="destructive" onClick={handleReset}>샘플 데이터 복원 (초기화)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
