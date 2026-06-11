import React, { useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { Portfolio } from "../../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PartnerEvaluation() {
  const [portfolios] = useState<Portfolio[]>(() => {
    return storageService.get<Portfolio>("portfolios").filter(p => p.isPublicConsented);
  });

  return (
    <PortalLayout>
      <SectionHeader title="학생 산출물 평가" description="공개 동의된 우수 학생들의 포트폴리오를 열람하고 평가합니다." />

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            현재 공개된 학생 포트폴리오가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {portfolios.map(pf => (
            <Card key={pf.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg">학생 ID: {pf.studentId}</h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">채용검토 대상</Badge>
                </div>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground block mb-1">프로젝트 요약</span>
                    <p className="bg-muted/30 p-3 rounded">{pf.projectSummary}</p>
                  </div>
                  
                  <div>
                    <span className="font-medium text-muted-foreground block mb-1">사용 기술</span>
                    <div className="flex flex-wrap gap-1">
                      {pf.techStack.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-muted-foreground block mb-1">산출물 링크</span>
                    <ul className="list-disc pl-5">
                      {pf.outputLinks.map(l => (
                        <li key={l}><a href="#" className="text-primary hover:underline">{l}</a></li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <span className="font-bold text-primary block mb-2">기업 멘토 피드백 입력</span>
                    <textarea 
                      className="w-full border rounded-md p-2 min-h-24 text-sm bg-background"
                      placeholder="프로젝트 수행 결과에 대한 피드백을 입력해주세요. (Mock 데모에서는 저장되지 않습니다.)"
                      defaultValue={pf.companyEvaluation}
                    />
                    <div className="mt-2 text-right">
                      <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-xs font-medium">피드백 전송</button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PortalLayout>
  );
}
