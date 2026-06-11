import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { KpiItem, Notice } from "../../types";
import { StatCard } from "../../components/StatCard";
import { ProgressBar } from "../../components/ProgressBar";
import { Badge } from "lucide-react";

export default function Performance() {
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const allKpis = storageService.get<KpiItem>("kpis");
    // Only show safe public KPIs
    const publicKpis = allKpis.filter(k => 
      ["kpi-03", "kpi-05", "kpi-06", "kpi-08", "kpi-11", "kpi-13"].includes(k.id)
    );
    setKpis(publicKpis);
    setNotices(storageService.get<Notice>("notices").filter(n => n.isPublic));
  }, []);

  const getKpiById = (id: string) => kpis.find(k => k.id === id);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <SectionHeader title="성과·소식" description="부트캠프 사업 주요 성과 및 알림" />

        <h3 className="text-xl font-bold mb-6 text-foreground">주요 성과 지표 (2026년 기준)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          <StatCard 
            label="목표 양성 인원" 
            value={`${getKpiById("kpi-08")?.actualValue || 0}명`}
            sublabel={`목표 ${getKpiById("kpi-08")?.targetValue || 0}명`}
          />
          <StatCard 
            label="참여 기업 수" 
            value={`${getKpiById("kpi-03")?.actualValue || 0}개`}
            sublabel={`목표 ${getKpiById("kpi-03")?.targetValue || 0}개`}
          />
          <StatCard 
            label="취·창업률" 
            value={`${getKpiById("kpi-11")?.actualValue || 0}%`}
            sublabel={`목표 ${getKpiById("kpi-11")?.targetValue || 0}%`}
          />
          <StatCard 
            label="참여학생 만족도" 
            value={`${getKpiById("kpi-13")?.actualValue || 0}%`}
            sublabel={`목표 ${getKpiById("kpi-13")?.targetValue || 0}%`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle>인재 양성 성과 달성률</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {kpis.filter(k => ["kpi-08", "kpi-11"].includes(k.id)).map(kpi => {
                const percent = (kpi.actualValue / kpi.targetValue) * 100;
                return (
                  <div key={kpi.id}>
                    <div className="flex justify-between mb-2 text-sm font-medium">
                      <span>{kpi.name}</span>
                      <span>{kpi.actualValue}{kpi.unit} / {kpi.targetValue}{kpi.unit}</span>
                    </div>
                    <ProgressBar value={percent} colorScheme="auto" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>프로그램 및 산학협력 성과 달성률</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {kpis.filter(k => ["kpi-03", "kpi-05", "kpi-06"].includes(k.id)).map(kpi => {
                const percent = (kpi.actualValue / kpi.targetValue) * 100;
                return (
                  <div key={kpi.id}>
                    <div className="flex justify-between mb-2 text-sm font-medium">
                      <span>{kpi.name}</span>
                      <span>{kpi.actualValue}{kpi.unit} / {kpi.targetValue}{kpi.unit}</span>
                    </div>
                    <ProgressBar value={percent} colorScheme="auto" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-bold mb-6 text-foreground">공지사항</h3>
        <Card>
          <div className="divide-y">
            {notices.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">등록된 공지사항이 없습니다.</div>
            ) : (
              notices.map(notice => (
                <div key={notice.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="w-20 justify-center shrink-0">{notice.category}</Badge>
                    <span className="font-medium text-foreground">{notice.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground mt-2 md:mt-0">{notice.createdAt}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
