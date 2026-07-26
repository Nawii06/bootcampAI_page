import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Building2, GraduationCap, Route } from "lucide-react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { Layout } from "../../components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Program { id: string; name: string; description?: string }
interface Company { id: string; name: string }
interface Result { id: string; indicatorName: string; actualValue: string; unit: string }

export default function Home() {
  const programs = useQuery({
    queryKey: ["public", "home", "programs"],
    queryFn: () => customFetch<{ data: Program[] }>("/api/v1/programs?status=OPEN", { responseType: "json" }),
  });
  const companies = useQuery({
    queryKey: ["public", "home", "companies"],
    queryFn: () => customFetch<{ data: Company[] }>("/api/v1/public/companies", { responseType: "json" }),
  });
  const results = useQuery({
    queryKey: ["public", "home", "results"],
    queryFn: () => customFetch<{ data: Result[] }>("/api/v1/public/performance-results", { responseType: "json" }),
  });
  return (
    <Layout>
      <section className="bg-gradient-to-br from-primary to-primary/75 py-20 text-primary-foreground">
        <div className="container mx-auto max-w-6xl px-4">
          <p className="mb-3 text-sm font-semibold tracking-widest opacity-80">KOREA NATIONAL UNIVERSITY OF TRANSPORTATION</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">미래 모빌리티를 이끄는 AI 실무인재 양성</h1>
          <p className="mt-6 max-w-2xl text-lg opacity-85">자율주행·항공·철도·스마트 인프라 분야의 교과, 비교과, 프로젝트와 현장실습을 통합 운영합니다.</p>
          <Link href="/public/recruitment"><Button className="mt-8" variant="secondary">모집 프로그램 보기<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
        </div>
      </section>
      <section className="container mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-6"><GraduationCap className="h-7 w-7 text-primary" /><p className="mt-3 text-sm text-muted-foreground">모집 프로그램</p><p className="text-3xl font-bold">{programs.data?.data.length ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-6"><Building2 className="h-7 w-7 text-primary" /><p className="mt-3 text-sm text-muted-foreground">공개 참여기업</p><p className="text-3xl font-bold">{companies.data?.data.length ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-6"><Route className="h-7 w-7 text-primary" /><p className="mt-3 text-sm text-muted-foreground">공개 성과지표</p><p className="text-3xl font-bold">{results.data?.data.length ?? 0}</p></CardContent></Card>
        </div>
        <h2 className="mb-5 mt-12 text-2xl font-bold">현재 운영 프로그램</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {programs.data?.data.slice(0, 4).map((program) => (
            <Card key={program.id}><CardContent className="p-6"><h3 className="font-bold">{program.name}</h3>{program.description && <p className="mt-2 text-sm text-muted-foreground">{program.description}</p>}</CardContent></Card>
          ))}
        </div>
      </section>
    </Layout>
  );
}
