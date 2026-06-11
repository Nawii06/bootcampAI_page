import React, { useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField, PrivacyWarningNotice } from "../../components/FormField";
import { storageService } from "../../services/storageService";
import { DemandSurvey } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function PartnerSurvey() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<DemandSurvey>>({
    requiredSkills: [],
    requiredCourses: [],
    projectTopics: [],
    canFieldPractice: false,
    canInternship: false,
    canEmploy: false,
    requiredHeadcount: 0
  });

  const [skillInput, setSkillInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  const handleAddArrayItem = (key: 'requiredSkills' | 'projectTopics', value: string, setter: (v: string) => void) => {
    if (value.trim()) {
      setFormData({ ...formData, [key]: [...(formData[key] || []), value.trim()] });
      setter("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const surveys = storageService.get<DemandSurvey>("surveys");
    const newSurvey: DemandSurvey = {
      id: `sv-${Date.now()}`,
      partnerId: user.id,
      partnerName: user.company || user.name,
      requiredSkills: formData.requiredSkills || [],
      requiredCourses: formData.requiredCourses || [],
      projectTopics: formData.projectTopics || [],
      canFieldPractice: formData.canFieldPractice || false,
      canInternship: formData.canInternship || false,
      canEmploy: formData.canEmploy || false,
      requiredHeadcount: formData.requiredHeadcount || 0,
      submittedAt: new Date().toISOString().split('T')[0]
    };

    storageService.set("surveys", [...surveys, newSurvey]);
    toast({ title: "제출 성공", description: "수요조사가 제출되었습니다. 커리큘럼 개발에 반영하겠습니다." });
    
    // reset
    setFormData({
      requiredSkills: [], requiredCourses: [], projectTopics: [],
      canFieldPractice: false, canInternship: false, canEmploy: false, requiredHeadcount: 0
    });
  };

  return (
    <PortalLayout>
      <SectionHeader title="수요조사 제출" description="부트캠프 커리큘럼 설계 및 채용 연계를 위한 기업 수요 조사" />
      
      <PrivacyWarningNotice />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <FormField label="필요 기술 스택 (Required Skills)">
              <div className="flex gap-2 mb-2">
                <Input 
                  value={skillInput} 
                  onChange={e => setSkillInput(e.target.value)} 
                  placeholder="예: TensorFlow, C++, ROS2"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddArrayItem('requiredSkills', skillInput, setSkillInput))}
                />
                <Button type="button" onClick={() => handleAddArrayItem('requiredSkills', skillInput, setSkillInput)} variant="secondary">추가</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills?.map((item, i) => (
                  <span key={i} className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm flex items-center gap-1">
                    {item}
                    <button type="button" onClick={() => setFormData({ ...formData, requiredSkills: formData.requiredSkills?.filter((_, idx) => idx !== i) })} className="text-destructive ml-1">×</button>
                  </span>
                ))}
              </div>
            </FormField>

            <FormField label="희망 산학 프로젝트 주제">
              <div className="flex gap-2 mb-2">
                <Input 
                  value={topicInput} 
                  onChange={e => setTopicInput(e.target.value)} 
                  placeholder="예: 카메라 기반 차선 인식 최적화"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddArrayItem('projectTopics', topicInput, setTopicInput))}
                />
                <Button type="button" onClick={() => handleAddArrayItem('projectTopics', topicInput, setTopicInput)} variant="secondary">추가</Button>
              </div>
              <div className="space-y-2">
                {formData.projectTopics?.map((item, i) => (
                  <div key={i} className="flex justify-between items-center bg-muted/50 p-2 rounded text-sm border">
                    <span className="truncate">{item}</span>
                    <button type="button" onClick={() => setFormData({ ...formData, projectTopics: formData.projectTopics?.filter((_, idx) => idx !== i) })} className="text-destructive px-2">삭제</button>
                  </div>
                ))}
              </div>
            </FormField>

            <FormField label="연계 및 채용 가능 여부">
              <div className="space-y-3 p-4 border rounded-md">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="fp" checked={formData.canFieldPractice} 
                    onCheckedChange={c => setFormData({ ...formData, canFieldPractice: c as boolean })} 
                  />
                  <label htmlFor="fp" className="text-sm">현장실습 (계절학기 등 단기) 제공 가능</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="it" checked={formData.canInternship} 
                    onCheckedChange={c => setFormData({ ...formData, canInternship: c as boolean })} 
                  />
                  <label htmlFor="it" className="text-sm">인턴십 (장기) 제공 가능</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="em" checked={formData.canEmploy} 
                    onCheckedChange={c => setFormData({ ...formData, canEmploy: c as boolean })} 
                  />
                  <label htmlFor="em" className="text-sm font-bold text-primary">우수 수료자 채용 연계 고려 가능</label>
                </div>
              </div>
            </FormField>

            <FormField label="필요 인원 (예상 채용 규모)">
              <div className="flex items-center gap-2 max-w-xs">
                <Input 
                  type="number" 
                  min="0"
                  value={formData.requiredHeadcount || 0}
                  onChange={e => setFormData({ ...formData, requiredHeadcount: parseInt(e.target.value) || 0 })}
                />
                <span className="text-sm whitespace-nowrap">명</span>
              </div>
            </FormField>

            <div className="flex justify-end">
              <Button type="submit">제출하기</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
