import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";
import { storageService } from "../../services/storageService";
import { Application, BudgetItem, KpiItem, Program, CompletionRecord } from "../../types";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalApps: 0,
    selectedApps: 0,
    completions: 0,
    programs: 0,
    budgetExecRate: 0,
    kpiRisks: 0
  });

  useEffect(() => {
    const apps = storageService.get<Application>("applications");
    const programs = storageService.get<Program>("programs");
    const completions = storageService.get<CompletionRecord>("completions");
    const budgets = storageService.get<BudgetItem>("budgetItems");
    const kpis = storageService.get<KpiItem>("kpis");

    const totalAlloc = budgets.reduce((sum, b) => sum + b.allocatedAmount, 0);
    const totalExec = budgets.reduce((sum, b) => sum + b.executedAmount, 0);
    const execRate = totalAlloc > 0 ? (totalExec / totalAlloc) * 100 : 0;

    const riskKpis = kpis.filter(k => (k.actualValue / k.targetValue) < 0.7).length;

    setStats({
      totalApps: apps.length,
      selectedApps: apps.filter(a => a.status === 'selected').length,
      completions: completions.filter(c => c.finalCompleted).length,
      programs: programs.length,
      budgetExecRate: execRate,
      kpiRisks: riskKpis
    });
  }, []);

  return (
    <PortalLayout>
      <SectionHeader title="관리자 대시보드" description="부트캠프 전체 운영 현황 요약" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="총 신청자" value={`${stats.totalApps}명`} />
        <StatCard label="선발자" value={`${stats.selectedApps}명`} />
        <StatCard label="수료자" value={`${stats.completions}명`} />
        <StatCard label="운영 프로그램" value={`${stats.programs}건`} />
        <StatCard 
          label="예산 집행률" 
          value={`${stats.budgetExecRate.toFixed(1)}%`} 
          color={stats.budgetExecRate < 50 ? "text-destructive" : ""} 
        />
        <StatCard 
          label="위험 성과지표" 
          value={`${stats.kpiRisks}건`} 
          color="text-destructive" 
          sublabel="달성률 70% 미만" 
        />
      </div>

      <div className="p-4 bg-red-50 border border-destructive/20 rounded-md">
        <h3 className="font-bold text-destructive mb-2">⚠️ 지표 관리 경고</h3>
        <p className="text-sm text-destructive/90">
          달성률이 70% 미만인 KPI가 {stats.kpiRisks}건 존재합니다. 
          [성과지표 관리] 메뉴에서 상세 내역 및 개선계획을 확인하세요.
        </p>
      </div>
    </PortalLayout>
  );
}
