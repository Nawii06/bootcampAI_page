import React from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "../../components/SectionHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export default function Resources() {
  const faqs = [
    {
      q: "부트캠프 신청 자격이 어떻게 되나요?",
      a: "국립한국교통대학교 학부 재학생이라면 전공에 관계없이 누구나 지원 가능합니다. 단, 현재 휴학 중인 학생은 지원이 불가능하며, 졸업 예정자의 경우 취업연계 과정에 우선 선발될 수 있습니다."
    },
    {
      q: "비전공자도 자율주행이나 AI 과정을 따라갈 수 있을까요?",
      a: "네, 가능합니다. 기초공통과정(basic)을 통해 AI 및 프로그래밍 기초를 학습할 수 있으며, 이 과정을 성공적으로 수료한 후 단계적으로 초/중급 과정으로 넘어갈 수 있도록 커리큘럼이 설계되어 있습니다."
    },
    {
      q: "이수 기준을 충족하지 못하면 어떻게 되나요?",
      a: "프로그램별로 정해진 이수 기준(출석률 80% 이상, 과제/프로젝트 제출 등)을 충족하지 못할 경우 '미수료' 처리되며, 해당 프로그램에 부여된 장학금이나 현장실습 연계 혜택을 받을 수 없습니다."
    },
    {
      q: "여러 프로그램을 동시에 신청할 수 있나요?",
      a: "동일 학기에 최대 2개 프로그램(교과 1, 비교과 1)까지 신청 가능합니다. 단, 몰입형 현장실습 프로그램은 학기 중 풀타임으로 진행되므로 타 프로그램과 병행할 수 없습니다."
    }
  ];

  const docs = [
    { title: "2026학년도 부트캠프 참가 신청서 양식", type: "HWPX", date: "2026-01-15" },
    { title: "개인정보 수집 및 이용 동의서 양식", type: "PDF", date: "2026-01-15" },
    { title: "포트폴리오 작성 가이드라인", type: "PDF", date: "2026-02-01" },
    { title: "참여기업 수요조사서 양식", type: "HWPX", date: "2026-01-20" },
  ];

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <SectionHeader title="자료실" description="자주 묻는 질문 및 문서 양식" />

        <div className="space-y-12">
          <section>
            <h3 className="text-xl font-bold mb-6 text-foreground">자주 묻는 질문 (FAQ)</h3>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium">Q. {faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    A. {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section>
            <h3 className="text-xl font-bold mb-6 text-foreground">문서 양식 다운로드</h3>
            <Card>
              <div className="divide-y">
                {docs.map((doc, i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl opacity-50">📄</span>
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">등록일: {doc.date}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => alert("본 화면은 Mock 데모로 실제 파일 다운로드를 지원하지 않습니다.")}>
                      {doc.type} 다운로드
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </section>
        </div>
      </div>
    </Layout>
  );
}
