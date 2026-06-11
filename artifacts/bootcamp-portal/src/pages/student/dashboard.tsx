import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";
import { storageService } from "../../services/storageService";
import { Application, CompletionRecord, Program } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState<Application[]>([]);
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (!user) return;
    const allApps = storageService.get<Application>("applications");
    const allCompletions = storageService.get<CompletionRecord>("completions");
    const allProgs = storageService.get<Program>("programs");

    setApps(allApps.filter(a => a.studentId === user.id));
    setCompletions(allCompletions.filter(c => c.studentId === user.id));
    setPrograms(allProgs);
  }, [user]);

  const activeApps = apps.filter(a => a.status === "reviewing" || a.status === "submitted" || a.status === "selected");
  const selectedApps = apps.filter(a => a.status === "selected");
  
  return (
    <PortalLayout>
      <SectionHeader title="내 대시보드" description="학습 현황 및 프로그램 진행 상태" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="진행/신청 중 프로그램" value={activeApps.length.toString()} />
        <StatCard label="선발 완료" value={selectedApps.length.toString()} />
        <StatCard label="최종 수료 과정" value={completions.filter(c => c.finalCompleted).length.toString()} />
        <StatCard label="포트폴리오 등록 여부" value="미등록" color="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">나의 신청 현황 요약</CardTitle>
          </CardHeader>
          <CardContent>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">신청 내역이 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {apps.slice(0, 5).map(app => {
                  const prog = programs.find(p => p.id === app.programId);
                  return (
                    <div key={app.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium text-sm">{prog?.name || "알 수 없는 프로그램"}</p>
                        <p className="text-xs text-muted-foreground">{app.appliedAt} 신청</p>
                      </div>
                      <Badge variant="outline">{app.status}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">알림</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-red-50 border border-red-100 rounded-md mb-3">
              <h4 className="text-sm font-bold text-red-800 mb-1">포트폴리오 작성 필요</h4>
              <p className="text-xs text-red-700">이수 완료를 위해 포트폴리오를 등록해주세요.</p>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
              <h4 className="text-sm font-bold text-blue-800 mb-1">신규 과정 모집 중</h4>
              <p className="text-xs text-blue-700">2026학년도 2학기 과정 모집이 진행 중입니다.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
