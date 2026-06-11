import React from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "../../components/SectionHeader";

export default function Intro() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <SectionHeader title="사업소개" description="첨단산업 인재양성 부트캠프 사업(AI 분야) 개요" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card>
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle className="text-base text-primary">사업 개요</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-sm">
              <div className="flex border-b pb-2">
                <span className="font-bold w-24 text-muted-foreground">사업명</span>
                <span className="font-medium text-foreground">첨단산업 인재양성 부트캠프 (AI 분야)</span>
              </div>
              <div className="flex border-b pb-2">
                <span className="font-bold w-24 text-muted-foreground">운영기관</span>
                <span className="font-medium text-foreground">국립한국교통대학교</span>
              </div>
              <div className="flex border-b pb-2">
                <span className="font-bold w-24 text-muted-foreground">사업기간</span>
                <span className="font-medium text-foreground">2026.03.01 ~ 2031.02.28 (5년)</span>
              </div>
              <div className="flex">
                <span className="font-bold w-24 text-muted-foreground">총괄목표</span>
                <span className="font-medium text-foreground">5년간 실무형 AI 인재 780명 양성</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-muted/50 pb-4">
              <CardTitle className="text-base text-primary">추진 방향</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm">
              <ul className="space-y-3 list-disc pl-5 text-muted-foreground">
                <li><strong className="text-foreground">모빌리티 도메인 특화:</strong> 자율주행, 항공, 철도, 인프라 등 4대 분야 AI 융합 교육</li>
                <li><strong className="text-foreground">기업 수요 맞춤형:</strong> 참여기업 요구 기술 스택 기반 커리큘럼 설계</li>
                <li><strong className="text-foreground">수준별 단계 교육:</strong> 기초공통 → 초/중급 → 고급(PBL) → 현장검증 연계</li>
                <li><strong className="text-foreground">실무 중심 프로젝트:</strong> 몰입형 캠프 및 산학연계 캡스톤 디자인 운영</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-bold mb-6 text-foreground">추진 체계</h3>
        <div className="bg-gray-50 border rounded-lg p-8 flex justify-center items-center mb-12">
          {/* Mock Organization Chart */}
          <div className="flex flex-col items-center">
            <div className="bg-primary text-primary-foreground py-3 px-8 rounded font-bold shadow mb-6">
              부트캠프 사업단장
            </div>
            <div className="w-1 bg-border h-6 mb-6"></div>
            <div className="w-[80%] h-1 bg-border mb-6"></div>
            <div className="flex gap-8 flex-wrap justify-center">
              <div className="bg-white border-2 border-primary/20 p-4 rounded text-center shadow-sm w-40">
                <p className="font-bold text-primary mb-2">교육운영팀</p>
                <p className="text-xs text-muted-foreground">과정 개발/운영<br/>학생 선발/관리</p>
              </div>
              <div className="bg-white border-2 border-primary/20 p-4 rounded text-center shadow-sm w-40">
                <p className="font-bold text-primary mb-2">산학협력팀</p>
                <p className="text-xs text-muted-foreground">기업수요조사<br/>현장실습/취업연계</p>
              </div>
              <div className="bg-white border-2 border-primary/20 p-4 rounded text-center shadow-sm w-40">
                <p className="font-bold text-primary mb-2">성과관리팀</p>
                <p className="text-xs text-muted-foreground">KPI 지표관리<br/>예산 및 평가</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
