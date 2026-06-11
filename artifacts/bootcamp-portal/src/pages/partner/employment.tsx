import React from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function PartnerEmployment() {
  return (
    <PortalLayout>
      <SectionHeader title="채용연계 현황" description="귀사와 연계되어 채용되거나 실습에 참여한 학생 현황입니다." />

      <Card>
        <CardContent className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground">
          <div className="text-4xl mb-4 opacity-50">🤝</div>
          <h3 className="text-lg font-bold text-foreground mb-2">진행 중인 채용연계 건이 없습니다.</h3>
          <p className="max-w-md text-sm">
            학생 포트폴리오를 검토하시고 우수 인재에게 면접 제안을 할 수 있습니다.<br/>
            (본 화면은 Mock 데이터용 자리표시자입니다.)
          </p>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
