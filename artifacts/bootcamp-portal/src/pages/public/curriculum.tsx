import React from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "../../components/SectionHeader";

export default function Curriculum() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <SectionHeader title="교육과정" description="수준별 맞춤형 AI 교육 로드맵" />

        {/* Progression Map */}
        <div className="mb-12">
          <h3 className="text-lg font-bold mb-4 text-foreground">성장 단계별 로드맵</h3>
          <div className="flex flex-col md:flex-row gap-2">
            {[
              { level: "기초", desc: "AI 기본 수학/프로그래밍", color: "bg-slate-100 border-slate-300" },
              { level: "초급", desc: "머신러닝/딥러닝 입문", color: "bg-blue-50 border-blue-200" },
              { level: "중급", desc: "도메인별 AI 응용 (PBL)", color: "bg-indigo-50 border-indigo-200" },
              { level: "고급", desc: "심화 모델링 및 최적화", color: "bg-violet-50 border-violet-200" },
              { level: "현장실습", desc: "기업 연계 프로젝트", color: "bg-purple-50 border-purple-200" },
              { level: "취업연계", desc: "포트폴리오/면접", color: "bg-fuchsia-50 border-fuchsia-200" }
            ].map((step, i) => (
              <div key={i} className={`flex-1 border p-4 rounded-lg flex flex-col items-center justify-center text-center ${step.color} relative`}>
                <span className="font-bold text-sm mb-1">{step.level}</span>
                <span className="text-[10px] text-muted-foreground">{step.desc}</span>
                {i < 5 && (
                  <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10 bg-white rounded-full">
                    ▶
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/4 border-r pr-6">
                  <h4 className="font-bold text-lg text-primary flex items-center gap-2 mb-2">🚗 자율주행</h4>
                  <p className="text-xs text-muted-foreground">자율주행 인지, 판단, 제어 SW 특화</p>
                </div>
                <div className="flex-1 text-sm space-y-2">
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">주요교과</span><span>자율주행 AI 기초, 차량 영상처리 실무, V2X 통신 기반 강화학습</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">PBL예시</span><span>라이다/카메라 센서 퓨전 기반 객체 인식 모델 개발</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">인프라</span><span>자율주행 시뮬레이터(MORAI), 모형차 테스트트랙</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/4 border-r pr-6">
                  <h4 className="font-bold text-lg text-primary flex items-center gap-2 mb-2">✈️ 항공</h4>
                  <p className="text-xs text-muted-foreground">UAM 및 무인기 제어/관제 AI</p>
                </div>
                <div className="flex-1 text-sm space-y-2">
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">주요교과</span><span>항공 모빌리티 입문, 무인기 항법 제어, 비행체 상태 진단 AI</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">PBL예시</span><span>군집 드론 경로 최적화 및 충돌 회피 알고리즘 구현</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">인프라</span><span>비행 제어 시뮬레이터, 드론 실내 비행장</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/4 border-r pr-6">
                  <h4 className="font-bold text-lg text-primary flex items-center gap-2 mb-2">🚄 철도</h4>
                  <p className="text-xs text-muted-foreground">철도 시스템 효율화 및 안전 AI</p>
                </div>
                <div className="flex-1 text-sm space-y-2">
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">주요교과</span><span>철도 신호 시스템, 열차운행 다이어그램 최적화, 예지정비 AI</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">PBL예시</span><span>전동차 주요 부품 고장 예측 머신러닝 모델 구축</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">인프라</span><span>철도운전 시뮬레이터, 스마트관제 시스템 랩</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/4 border-r pr-6">
                  <h4 className="font-bold text-lg text-primary flex items-center gap-2 mb-2">🏢 인프라</h4>
                  <p className="text-xs text-muted-foreground">모빌리티 인프라 지능화</p>
                </div>
                <div className="flex-1 text-sm space-y-2">
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">주요교과</span><span>스마트 교통 인프라, C-ITS 데이터 분석, 교통망 시뮬레이션</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">PBL예시</span><span>도심 교차로 신호등 연동 강화를 위한 교통량 예측 모델</span></div>
                  <div className="flex"><span className="w-20 font-bold text-muted-foreground">인프라</span><span>교통 데이터 분석 서버, 디지털 트윈 랩</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
