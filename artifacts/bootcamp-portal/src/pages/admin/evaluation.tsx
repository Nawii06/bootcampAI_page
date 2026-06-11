import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { EvaluationResponse } from "../../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminEvaluation() {
  const [evaluations, setEvaluations] = useState<EvaluationResponse[]>([]);

  useEffect(() => {
    setEvaluations(storageService.get<EvaluationResponse>("evaluations"));
  }, []);

  return (
    <PortalLayout>
      <SectionHeader title="평가대응" description="연차/단계/최종평가 대비 예상 Q&A 및 답변 요지 관리">
        <Button variant="outline" onClick={() => window.print()}>출력용 요약 카드</Button>
      </SectionHeader>

      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            등록된 평가 Q&A 데이터가 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {evaluations.map(ev => (
            <Card key={ev.id} className="border-l-4 border-l-primary">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-2">Q. {ev.question}</h3>
                  <div className="bg-muted/50 p-4 rounded-md border text-sm leading-relaxed">
                    <strong className="text-primary block mb-1">A. 답변 요지:</strong>
                    {ev.answerSummary}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong className="text-muted-foreground block mb-1">한계 및 보완계획</strong>
                    <p className="text-foreground">{ev.improvementPlan}</p>
                  </div>
                  <div>
                    <strong className="text-muted-foreground block mb-1">관련 KPI / 증빙</strong>
                    <div className="flex flex-wrap gap-1">
                      {ev.linkedKpiIds.map(k => <span key={k} className="bg-slate-100 px-2 py-0.5 rounded text-xs">{k}</span>)}
                      {ev.linkedEvidenceIds.map(e => <span key={e} className="bg-slate-100 px-2 py-0.5 rounded text-xs">{e}</span>)}
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
