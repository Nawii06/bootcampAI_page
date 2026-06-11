import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { Program } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Recruitment() {
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    setPrograms(storageService.get<Program>("programs").filter(p => p.isActive));
  }, []);

  const getTrackColor = (track: string) => {
    switch (track) {
      case "autonomous": return "bg-blue-100 text-blue-800 border-blue-200";
      case "aviation": return "bg-sky-100 text-sky-800 border-sky-200";
      case "railway": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "infra": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      default: return "";
    }
  };

  const getTrackName = (track: string) => {
    switch (track) {
      case "autonomous": return "자율주행";
      case "aviation": return "항공 모빌리티";
      case "railway": return "철도 모빌리티";
      case "infra": return "스마트 인프라";
      default: return track;
    }
  };

  const getLevelName = (level: string) => {
    switch (level) {
      case "basic": return "기초공통";
      case "beginner": return "초급";
      case "intermediate": return "중급";
      case "advanced": return "고급";
      case "field": return "현장실습";
      case "employment": return "취업연계";
      default: return level;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <SectionHeader title="학생모집" description="진행 중인 AI 부트캠프 교육과정" />

        <div className="mb-8 p-4 bg-muted rounded-md text-sm border">
          <h4 className="font-bold mb-2">📢 신청 안내</h4>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>지원 자격: 국립한국교통대학교 학부 재학생 (휴학생 지원 불가)</li>
            <li>개인정보 수집 및 이용 동의 필수 (신청서 작성 시 동의 체크)</li>
            <li>프로그램별 이수 기준을 충족해야 수료증이 발급됩니다.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map(program => (
            <Card key={program.id} className="flex flex-col">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={getTrackColor(program.track)}>
                    {getTrackName(program.track)}
                  </Badge>
                  <Badge variant="secondary">{getLevelName(program.level)}</Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{program.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">모집정원</span>
                    <span className="font-medium">{program.capacity}명</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">신청기간</span>
                    <span className="font-medium">{program.applicationStart} ~ {program.applicationEnd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">운영방식</span>
                    <span className="font-medium">
                      {program.type === 'course' ? '교과' : program.type === 'extracurricular' ? '비교과' : program.type === 'pbl' ? 'PBL' : '몰입형'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">주관부서</span>
                    <span className="font-medium">{program.responsibleDept}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <span className="text-xs text-muted-foreground block mb-1">이수기준</span>
                    <span className="text-xs font-medium">{program.completionCriteria}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Link href="/login" className="w-full">
                  <Button className="w-full">신청하기</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
