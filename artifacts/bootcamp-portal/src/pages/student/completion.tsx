import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { CompletionRecord, Program } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function StudentCompletion() {
  const { user } = useAuth();
  const [completions, setCompletions] = useState<CompletionRecord[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    if (!user) return;
    setPrograms(storageService.get<Program>("programs"));
    setCompletions(storageService.get<CompletionRecord>("completions").filter(c => c.studentId === user.id));
  }, [user]);

  const CheckItem = ({ label, isDone }: { label: string, isDone: boolean }) => (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <span className="text-sm">{label}</span>
      {isDone ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">완료</Badge>
      ) : (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">미완료</Badge>
      )}
    </div>
  );

  return (
    <PortalLayout>
      <SectionHeader title="이수현황" description="프로그램별 이수 요건 달성 현황" />

      {completions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            참여 중인 프로그램의 이수 데이터가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {completions.map(comp => {
            const prog = programs.find(p => p.id === comp.programId);
            return (
              <Card key={comp.id} className={comp.finalCompleted ? "border-green-200" : ""}>
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={comp.finalCompleted ? "default" : "secondary"}>
                      {comp.finalCompleted ? "최종 수료" : "이수 중"}
                    </Badge>
                    {comp.performanceRecognized && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">성과인정</Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{prog?.name || "알 수 없는 프로그램"}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <CheckItem label="교과/이론 과정" isDone={comp.courseCompleted} />
                  <CheckItem label="비교과/특강" isDone={comp.extracurricularCompleted} />
                  <CheckItem label="PBL 프로젝트 참여" isDone={comp.pblParticipated} />
                  <CheckItem label="현장실습" isDone={comp.fieldPracticeParticipated} />
                  <CheckItem label="인턴십" isDone={comp.internshipParticipated} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PortalLayout>
  );
}
