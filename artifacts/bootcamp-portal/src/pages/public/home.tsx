import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { storageService } from "../../services/storageService";
import { Program, KpiItem } from "../../types";

export default function Home() {
  const [stats, setStats] = useState({
    programsCount: 0,
    studentCount: 0,
    partnerCount: 0
  });

  useEffect(() => {
    storageService.init();
    const programs = storageService.get<Program>("programs");
    const kpis = storageService.get<KpiItem>("kpis");
    
    const studentsKpi = kpis.find(k => k.id === "kpi-08"); // 양성인원
    const partnersKpi = kpis.find(k => k.id === "kpi-03"); // 참여기업 수
    
    setStats({
      programsCount: programs.length,
      studentCount: studentsKpi ? studentsKpi.actualValue : 0,
      partnerCount: partnersKpi ? partnersKpi.actualValue : 0
    });
  }, []);

  return (
    <Layout>
      <div className="bg-primary text-primary-foreground py-20 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              미래 모빌리티 시대를 이끌<br />
              <span className="text-yellow-400">AI 핵심인재</span>의 요람
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl">
              국립한국교통대학교 첨단산업 인재양성 부트캠프는 자율주행, 항공, 철도, 인프라 분야의 현장 실무형 인재를 육성합니다.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 bg-white/10 p-6 rounded-lg backdrop-blur-sm border border-white/20">
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">운영기간</p>
                <p className="font-bold">2026.03 - 2031.02</p>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">양성목표</p>
                <p className="font-bold">총 780명</p>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">현재 참여인원</p>
                <p className="font-bold">{stats.studentCount}명</p>
              </div>
              <div>
                <p className="text-sm font-medium opacity-80 mb-1">참여기업</p>
                <p className="font-bold">{stats.partnerCount}개사</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8 text-center text-foreground">4대 모빌리티 특화 트랙</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-t-4 border-t-blue-600 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">🚗 자율주행 트랙</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">자율주행 인지/판단/제어 알고리즘 및 차량용 SW 검증 역량 확보</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-sky-500 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">✈️ 항공 모빌리티 트랙</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">UAM, 드론 비행 제어 및 항로 최적화를 위한 AI 모델링</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-emerald-600 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">🚄 철도 모빌리티 트랙</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">철도 신호제어, 예지정비 및 스마트 역사 운영 지능화</p>
              </CardContent>
            </Card>
            <Card className="border-t-4 border-t-indigo-600 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg">🏢 스마트 인프라 트랙</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">C-ITS 구축, 교통 데이터 분석 및 스마트시티 연계 서비스</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
