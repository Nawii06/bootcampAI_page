import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField, PrivacyWarningNotice } from "../../components/FormField";
import { storageService } from "../../services/storageService";
import { Portfolio } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentPortfolio() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<Portfolio>>({
    projectSummary: "",
    techStack: [],
    outputLinks: [],
    isPublicConsented: false
  });
  
  const [techInput, setTechInput] = useState("");
  const [linkInput, setLinkInput] = useState("");

  useEffect(() => {
    if (!user) return;
    const portfolios = storageService.get<Portfolio>("portfolios");
    const existing = portfolios.find(p => p.studentId === user.id);
    if (existing) {
      setFormData(existing);
    }
  }, [user]);

  const handleAddTech = () => {
    if (techInput.trim()) {
      setFormData({ ...formData, techStack: [...(formData.techStack || []), techInput.trim()] });
      setTechInput("");
    }
  };

  const handleAddLink = () => {
    if (linkInput.trim()) {
      setFormData({ ...formData, outputLinks: [...(formData.outputLinks || []), linkInput.trim()] });
      setLinkInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.projectSummary) {
      toast({ title: "오류", description: "프로젝트 요약을 입력해주세요.", variant: "destructive" });
      return;
    }

    const portfolios = storageService.get<Portfolio>("portfolios");
    const existingIndex = portfolios.findIndex(p => p.studentId === user.id);
    
    const newPortfolio: Portfolio = {
      id: formData.id || `pf-${Date.now()}`,
      studentId: user.id,
      projectSummary: formData.projectSummary || "",
      techStack: formData.techStack || [],
      outputLinks: formData.outputLinks || [],
      companyEvaluation: formData.companyEvaluation || "",
      isPublicConsented: formData.isPublicConsented || false
    };

    if (existingIndex >= 0) {
      portfolios[existingIndex] = newPortfolio;
    } else {
      portfolios.push(newPortfolio);
    }

    storageService.set("portfolios", portfolios);
    toast({ title: "저장 성공", description: "포트폴리오가 저장되었습니다." });
  };

  return (
    <PortalLayout>
      <SectionHeader title="포트폴리오" description="수행한 프로젝트 및 산출물을 관리합니다." />
      
      <PrivacyWarningNotice />

      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField label="프로젝트 요약" required>
              <Textarea 
                rows={4}
                value={formData.projectSummary}
                onChange={e => setFormData({ ...formData, projectSummary: e.target.value })}
                placeholder="진행했던 PBL이나 캡스톤 디자인의 핵심 내용을 요약해주세요."
              />
            </FormField>

            <FormField label="사용 기술 스택 (Tech Stack)">
              <div className="flex gap-2 mb-2">
                <Input 
                  value={techInput} 
                  onChange={e => setTechInput(e.target.value)} 
                  placeholder="예: Python, PyTorch, ROS2"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                />
                <Button type="button" onClick={handleAddTech} variant="secondary">추가</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.techStack?.map((tech, i) => (
                  <span key={i} className="bg-muted text-muted-foreground px-2 py-1 rounded text-sm flex items-center gap-1">
                    {tech}
                    <button type="button" onClick={() => setFormData({ ...formData, techStack: formData.techStack?.filter((_, idx) => idx !== i) })} className="text-destructive font-bold ml-1">×</button>
                  </span>
                ))}
              </div>
            </FormField>

            <FormField label="산출물 링크">
              <div className="flex gap-2 mb-2">
                <Input 
                  value={linkInput} 
                  onChange={e => setLinkInput(e.target.value)} 
                  placeholder="예: Github 링크, 시연 영상 링크 등"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
                />
                <Button type="button" onClick={handleAddLink} variant="secondary">추가</Button>
              </div>
              <div className="space-y-2">
                {formData.outputLinks?.map((link, i) => (
                  <div key={i} className="flex justify-between items-center bg-muted/50 p-2 rounded text-sm border">
                    <span className="truncate">{link}</span>
                    <button type="button" onClick={() => setFormData({ ...formData, outputLinks: formData.outputLinks?.filter((_, idx) => idx !== i) })} className="text-destructive px-2">삭제</button>
                  </div>
                ))}
              </div>
            </FormField>

            {formData.companyEvaluation && (
              <FormField label="기업 멘토 평가 (Read-only)">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded text-sm whitespace-pre-wrap">
                  {formData.companyEvaluation}
                </div>
              </FormField>
            )}

            <div className="p-4 border rounded-md bg-gray-50 flex items-center space-x-2">
              <Checkbox 
                id="public-consent" 
                checked={formData.isPublicConsented}
                onCheckedChange={(c) => setFormData({ ...formData, isPublicConsented: c as boolean })}
              />
              <label htmlFor="public-consent" className="text-sm font-medium text-foreground cursor-pointer">
                참여기업에 본 포트폴리오를 공개하여 채용/인턴십 연계 검토에 활용하는 것에 동의합니다.
              </label>
            </div>

            <div className="flex justify-end">
              <Button type="submit">포트폴리오 저장</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
