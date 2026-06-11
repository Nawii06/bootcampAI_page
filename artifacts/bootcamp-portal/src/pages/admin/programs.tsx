import React, { useEffect, useState } from "react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { DataTable, ColumnDef } from "../../components/DataTable";
import { storageService } from "../../services/storageService";
import { Program } from "../../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "../../components/Modal";
import { FormField } from "../../components/FormField";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function AdminPrograms() {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<Program>>({});

  useEffect(() => {
    setPrograms(storageService.get<Program>("programs"));
  }, []);

  const handleSave = () => {
    if (!editingProgram.name || !editingProgram.year || !editingProgram.level || !editingProgram.track) {
      toast({ title: "오류", description: "필수 항목을 모두 입력해주세요.", variant: "destructive" });
      return;
    }
    
    let updated: Program[];
    if (editingProgram.id) {
      updated = programs.map(p => p.id === editingProgram.id ? editingProgram as Program : p);
    } else {
      const newProgram: Program = {
        ...(editingProgram as any),
        id: `p-${Date.now()}`,
        isActive: true,
        linkedKpiIds: []
      };
      updated = [...programs, newProgram];
    }
    
    setPrograms(updated);
    storageService.set("programs", updated);
    setIsModalOpen(false);
    toast({ title: "저장 성공", description: "프로그램 정보가 저장되었습니다." });
  };

  const handleDelete = (id: string) => {
    if (confirm("정말 이 프로그램을 삭제하시겠습니까? (연결된 신청 내역이 있으면 오류가 발생할 수 있습니다.)")) {
      const updated = programs.filter(p => p.id !== id);
      setPrograms(updated);
      storageService.set("programs", updated);
      toast({ title: "삭제 성공", description: "프로그램이 삭제되었습니다." });
    }
  };

  const columns: ColumnDef<Program>[] = [
    { key: "name", header: "프로그램명", cell: (item) => <span className="font-bold">{item.name}</span> },
    { key: "year", header: "연차", cell: (item) => `${item.year}년도 ${item.semester}학기` },
    { key: "track", header: "트랙", cell: (item) => <Badge variant="outline">{item.track}</Badge> },
    { key: "level", header: "수준", cell: (item) => <Badge variant="secondary">{item.level}</Badge> },
    { key: "type", header: "운영방식" },
    { key: "capacity", header: "정원", cell: (item) => `${item.capacity}명` },
    { key: "responsibleDept", header: "담당부서" },
    { 
      key: "actions", 
      header: "관리",
      cell: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingProgram(item); setIsModalOpen(true); }}>수정</Button>
          <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>삭제</Button>
        </div>
      )
    }
  ];

  return (
    <PortalLayout>
      <SectionHeader title="프로그램 관리" description="부트캠프 교육과정(교과/비교과/PBL/실습 등) 등록 및 관리">
        <Button onClick={() => { setEditingProgram({}); setIsModalOpen(true); }}>+ 프로그램 추가</Button>
      </SectionHeader>

      <DataTable 
        data={programs} 
        columns={columns} 
        filterKey="name"
        filterPlaceholder="프로그램명 검색..."
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingProgram.id ? "프로그램 수정" : "새 프로그램 추가"}
        className="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4 py-4">
          <FormField label="프로그램명" required className="col-span-2">
            <Input 
              value={editingProgram.name || ""} 
              onChange={e => setEditingProgram({...editingProgram, name: e.target.value})} 
            />
          </FormField>
          
          <FormField label="운영 연차" required>
            <Input 
              type="number" 
              value={editingProgram.year || ""} 
              onChange={e => setEditingProgram({...editingProgram, year: parseInt(e.target.value)})} 
            />
          </FormField>
          
          <FormField label="학기" required>
            <Input 
              type="number" 
              value={editingProgram.semester || ""} 
              onChange={e => setEditingProgram({...editingProgram, semester: parseInt(e.target.value)})} 
            />
          </FormField>

          <FormField label="트랙" required>
            <Select value={editingProgram.track} onValueChange={v => setEditingProgram({...editingProgram, track: v as any})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="autonomous">자율주행</SelectItem>
                <SelectItem value="aviation">항공</SelectItem>
                <SelectItem value="railway">철도</SelectItem>
                <SelectItem value="infra">스마트 인프라</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="수준" required>
            <Select value={editingProgram.level} onValueChange={v => setEditingProgram({...editingProgram, level: v as any})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">기초공통</SelectItem>
                <SelectItem value="beginner">초급</SelectItem>
                <SelectItem value="intermediate">중급</SelectItem>
                <SelectItem value="advanced">고급</SelectItem>
                <SelectItem value="field">현장실습</SelectItem>
                <SelectItem value="employment">취업연계</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="운영방식" required>
            <Select value={editingProgram.type} onValueChange={v => setEditingProgram({...editingProgram, type: v as any})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="course">교과</SelectItem>
                <SelectItem value="extracurricular">비교과</SelectItem>
                <SelectItem value="pbl">PBL</SelectItem>
                <SelectItem value="immersive">몰입형/실습</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="모집정원" required>
            <Input 
              type="number" 
              value={editingProgram.capacity || ""} 
              onChange={e => setEditingProgram({...editingProgram, capacity: parseInt(e.target.value)})} 
            />
          </FormField>

          <FormField label="담당부서">
            <Input 
              value={editingProgram.responsibleDept || ""} 
              onChange={e => setEditingProgram({...editingProgram, responsibleDept: e.target.value})} 
            />
          </FormField>

          <div className="col-span-2 flex justify-end mt-4">
            <Button onClick={handleSave}>저장</Button>
          </div>
        </div>
      </Modal>
    </PortalLayout>
  );
}
