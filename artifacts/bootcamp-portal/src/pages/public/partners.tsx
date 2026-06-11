import React, { useEffect, useState } from "react";
import { Layout } from "../../components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "../../components/SectionHeader";
import { storageService } from "../../services/storageService";
import { Partner } from "../../types";
import { Badge } from "@/components/ui/badge";

export default function Partners() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    setPartners(storageService.get<Partner>("partners").filter(p => p.isActive));
  }, []);

  const getCooperationTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      "curriculum": "교육과정 공동개발",
      "co-operation": "산학협력(일반)",
      "pbl": "PBL 멘토링",
      "field-practice": "현장실습",
      "internship": "인턴십",
      "employment": "채용연계"
    };
    return map[type] || type;
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

  const filteredPartners = filterType === "all" 
    ? partners 
    : partners.filter(p => p.cooperationType.includes(filterType as any));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <SectionHeader title="참여기업·기관" description="산학협력을 통한 실무형 인재 양성 파트너" />

        <div className="mb-6 flex flex-wrap gap-2">
          <Badge 
            variant={filterType === "all" ? "default" : "outline"} 
            className="cursor-pointer"
            onClick={() => setFilterType("all")}
          >
            전체 보기
          </Badge>
          {["curriculum", "pbl", "field-practice", "internship", "employment"].map(type => (
            <Badge 
              key={type}
              variant={filterType === type ? "default" : "outline"} 
              className="cursor-pointer"
              onClick={() => setFilterType(type)}
            >
              {getCooperationTypeLabel(type)}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPartners.map(partner => (
            <Card key={partner.id} className="h-full">
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-1">{partner.name}</h3>
                  <p className="text-sm text-muted-foreground min-h-10">{partner.description}</p>
                </div>
                
                <div className="space-y-4 text-sm mt-6">
                  <div>
                    <span className="font-medium text-muted-foreground block mb-1">관련 트랙</span>
                    <div className="flex flex-wrap gap-1">
                      {partner.tracks.map(t => (
                        <span key={t} className="text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                          {getTrackName(t)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground block mb-1">협력 분야</span>
                    <div className="flex flex-wrap gap-1">
                      {partner.cooperationType.map(t => (
                        <Badge key={t} variant="secondary" className="font-normal">
                          {getCooperationTypeLabel(t)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
