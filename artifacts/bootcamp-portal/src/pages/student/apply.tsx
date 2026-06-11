import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { FormField, PrivacyWarningNotice } from "../../components/FormField";
import { storageService } from "../../services/storageService";
import { Program, Application } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentApply() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  
  const [formData, setFormData] = useState({
    programId: "",
    preferredTrack: "",
    reason: "",
    consentGiven: false
  });

  useEffect(() => {
    setPrograms(storageService.get<Program>("programs").filter(p => p.isActive));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.programId || !formData.preferredTrack || !formData.reason || !formData.consentGiven) {
      toast({ title: "오류", description: "모든 필수 항목을 입력하고 동의해주세요.", variant: "destructive" });
      return;
    }

    const apps = storageService.get<Application>("applications");
    const newApp: Application = {
      id: `app-${Date.now()}`,
      programId: formData.programId,
      studentId: user.id,
      studentName: user.name,
      dept: user.dept || "",
      year: user.year || 1,
      preferredTrack: formData.preferredTrack as any,
      reason: formData.reason,
      consentGiven: formData.consentGiven,
      status: "submitted",
      appliedAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    storageService.set("applications", [...apps, newApp]);
    toast({ title: "성공", description: "프로그램 신청이 완료되었습니다." });
    setLocation("/student/status");
  };

  return (
    <PortalLayout>
      <SectionHeader title="프로그램 신청" description="부트캠프 교육과정 참가 신청서 작성" />

      <PrivacyWarningNotice />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border">
              <FormField label="학번 (Mock)">
                <Input value={user?.id || ""} disabled className="bg-muted" />
              </FormField>
              <FormField label="성명 (Mock)">
                <Input value={user?.name || ""} disabled className="bg-muted" />
              </FormField>
              <FormField label="소속학과">
                <Input value={user?.dept || ""} disabled className="bg-muted" />
              </FormField>
              <FormField label="학년">
                <Input value={`${user?.year || 1}학년`} disabled className="bg-muted" />
              </FormField>
            </div>

            <FormField label="신청 프로그램" required>
              <Select value={formData.programId} onValueChange={v => setFormData({ ...formData, programId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="프로그램을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} ({p.applicationStart} ~ {p.applicationEnd})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="희망 트랙" required>
              <Select value={formData.preferredTrack} onValueChange={v => setFormData({ ...formData, preferredTrack: v })}>
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

            <FormField label="신청 사유 및 학업 계획" required showPrivacyWarning>
              <Textarea 
                rows={5} 
                placeholder="지원 동기와 본 프로그램을 통해 달성하고자 하는 목표를 기재해주세요."
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              />
            </FormField>

            <div className="p-4 border rounded-md bg-gray-50 flex flex-col space-y-3">
              <p className="text-xs text-muted-foreground">
                본 신청서는 mock 데모용으로 실제 정보가 전송되거나 저장되지 않습니다. 
                부트캠프 사업단은 위에서 입력한 가상의 정보를 사업 운영 및 성과관리 목적으로 활용하는 구조를 테스트합니다.
              </p>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="consent" 
                  checked={formData.consentGiven}
                  onCheckedChange={(c) => setFormData({ ...formData, consentGiven: c as boolean })}
                />
                <label htmlFor="consent" className="text-sm font-medium text-foreground cursor-pointer">
                  (필수) 개인정보 수집 및 이용에 동의합니다.
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setLocation("/student/dashboard")}>취소</Button>
              <Button type="submit">제출하기</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PortalLayout>
  );
}
