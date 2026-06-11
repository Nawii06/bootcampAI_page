import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";
import { storageService } from "../../services/storageService";
import { DemandSurvey, IndustryProject } from "../../types";
import { useAuth } from "../../contexts/AuthContext";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<DemandSurvey[]>([]);
  const [projects, setProjects] = useState<IndustryProject[]>([]);

  useEffect(() => {
    if (!user) return;
    setSurveys(storageService.get<DemandSurvey>("surveys").filter(s => s.partnerId === user.id));
    setProjects(storageService.get<IndustryProject>("projects").filter(p => p.partnerId === user.id));
  }, [user]);

  return (
    <PortalLayout>
      <SectionHeader title="기관 대시보드" description="산학협력 및 수요조사 참여 현황" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="제출한 수요조사" value={`${surveys.length}건`} />
        <StatCard label="승인된 산학프로젝트" value={`${projects.filter(p => p.status === 'approved' || p.status === 'ongoing').length}건`} />
        <StatCard label="평가 대기 산출물" value="0건" />
      </div>

      <div className="p-6 bg-primary/5 border border-primary/10 rounded-lg">
        <h3 className="font-bold text-lg text-primary mb-2">테크모빌(주) 담당자님, 환영합니다.</h3>
        <p className="text-sm text-muted-foreground mb-4">
          본 시스템을 통해 기업의 AI 인재 수요를 전달하고, 학생들과의 산학공동과제를 효율적으로 관리할 수 있습니다. 
          채용연계를 위한 학생 포트폴리오는 '학생 산출물 평가' 메뉴에서 열람 가능합니다.
        </p>
      </div>
    </PortalLayout>
  );
}
