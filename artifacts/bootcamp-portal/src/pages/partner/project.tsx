import React, { useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField, PrivacyWarningNotice } from "../../components/FormField";
import { storageService } from "../../services/storageService";
import { IndustryProject } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function PartnerProject() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<IndustryProject>>({
    title: "",
    track: "autonomous",
    problemDefinition: "",
    dataTypes: [],
    expectedOutputs: [],
    mentorRole: "",
    evaluationCriteria: ""
  });

  const [dataInput, setDataInput] = useState("");
  const [outputInput, setOutputInput] = useState("");

  const handleAddArrayItem = (key: 'dataTypes' | 'expectedOutputs', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      setFormData({ ...formData, [key]: [...(formData[key] || []), value.trim()] });
      setter("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title || !formData.problemDefinition) {
      toast({ title: "오류", description: "필수 항목을 모두 입력해주세요.", variant: "destructive" });
      return;
    }

    const projects = storageService.get<IndustryProject>("projects");
    const newProject: IndustryProject = {
      id: `prj-${Date.now()}`,
      partnerId: user.id,
      title: formData.title,
      track: formData.track as any,
      problemDefinition: formData.problemDefinition,
      dataTypes: formData.dataTypes || [],
      expectedOutputs: formData.expectedOutputs || [],
      mentorRole: formData.mentorRole || "",
      evaluationCriteria: formData.evaluationCriteria || "",
      status: "proposed"
    };

    storageService.set("projects", [...projects, newProject]);
    toast({ title: "제출 성공", description: "산학 프로젝트 제안이 제출되었습니다." });
    
    setFormData({
      title: "", track: "autonomous", problemDefinition: "",
      dataTypes: [], expectedOutputs: [], mentorRole: "", evaluationCriteria: ""
    });
  };

  return (
    <PortalLayout>
      <SectionHeader title="프로젝트 제안" description="PBL 및 캡스톤 디자인을 위한 산업체 문제(과제) 제안" />
      <PrivacyWarningNotice />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="과제명" required>
              <Input 
                value={formData.title} 
                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                placeholder="예: 객체 인식률 향상을 위한 라이다-카메라 센서 퓨전 알고리즘 개발"
              />
            </FormField>

            <FormField label="참여 트랙" required>
              <Select value={formData.track} onValueChange={v => setFormData({ ...formData, track: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="트랙을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="autonomous">자율주행</SelectItem>
                  <SelectItem value="aviation">항공 모빌리티</SelectItem>
                  <SelectItem value="railway">철도 모빌리티</SelectItem>
                  <SelectItem value="infra">스마트 인프라</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="문제 정의 (현업의 애로사항)" required>
              <Textarea 
                rows={4}
                value={formData.problemDefinition} 
                onChange={e => setFormData({ ...formData, problemDefinition: e.target.value })} 
                placeholder="기업에서 실제로 겪고 있는 문제점이나 개선이 필요한 사항을 기술해주세요."
              />
            </FormField>

            <FormField label="제공 가능 데이터 유형">
              <div className="flex gap-2 mb-2">
                <Input 
                  value={dataInput} 
                  onChange={e => setDataInput(e.target.value)} 
                  placeholder="예: 주행 영상 데이터 1,000시간 분량"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddArrayItem('dataTypes', dataInput, setDataInput))}
                />
                <Button type="button" onClick={() => handleAddArrayItem('dataTypes', dataInput, setDataInput)} variant="secondary">추가</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.dataTypes?.map((item, i) => (
                  <span key={i} className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm flex items-center gap-1">
                    {item}
                    <button type="button" onClick={() => setFormData({ ...formData, dataTypes: formData.dataTypes?.filter((_, idx) => idx !== i) })} className="text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            </FormField>

            <FormField label="기대 산출물">
              <div className="flex gap-2 mb-2">
                <Input 
                  value={outputInput} 
                  onChange={e => setOutputInput(e.target.value)} 
                  placeholder="예: 인식률 95% 이상의 모델 가중치 파일"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddArrayItem('expectedOutputs', outputInput, setOutputInput))}
                />
                <Button type="button" onClick={() => handleAddArrayItem('expectedOutputs', outputInput, setOutputInput)} variant="secondary">추가</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.expectedOutputs?.map((item, i) => (
                  <span key={i} className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm flex items-center gap-1">
                    {item}
                    <button type="button" onClick={() => setFormData({ ...formData, expectedOutputs: formData.expectedOutputs?.filter((_, idx) => idx !== i) })} className="text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            </FormField>

            <FormField label="기업 멘토의 역할">
              <Textarea 
                rows={3}
                value={formData.mentorRole} 
                onChange={e => setFormData({ ...formData, mentorRole: e.target.value })} 
                placeholder="학생팀에 대한 멘토링 방식 (예: 격주 1회 온라인 화상회의, 코드 리뷰 등)"
              />
            </FormField>

            <div className="flex justify-end">
              <Button type="submit">제안서 제출</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
