import { useQuery } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { PortalLayout } from "../../components/PortalLayout";
import { SectionHeader } from "../../components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";

interface BusinessYear { id: string; year: number; name: string }
interface BudgetSummary {
  allocated: number;
  planned: number;
  executed: number;
  balance: number;
  executionRate: number;
}

const money = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

export default function AdminBudget() {
  const years = useQuery({
    queryKey: ["reference", "business-years", "active"],
    queryFn: () => customFetch<{ data: BusinessYear[] }>("/api/v1/reference/business-years?active=true", { responseType: "json" }),
  });
  const yearId = years.data?.data[0]?.id;
  const summary = useQuery({
    queryKey: ["admin", "budget-summary", yearId],
    enabled: Boolean(yearId),
    queryFn: () => customFetch<BudgetSummary>(`/api/v1/budget/summary?businessYearId=${yearId}`, {
      responseType: "json",
      credentials: "include",
    }),
  });
  const cards = summary.data
    ? [
        ["배정액", money.format(summary.data.allocated)],
        ["편성액", money.format(summary.data.planned)],
        ["집행액", money.format(summary.data.executed)],
        ["잔액", money.format(summary.data.balance)],
        ["집행률", `${summary.data.executionRate}%`],
      ]
    : [];
  return (
    <PortalLayout>
      <SectionHeader title="예산 집행현황" description={years.data?.data[0]?.name ?? "활성 사업연도"} />
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={label}><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></CardContent></Card>
        ))}
      </div>
      {(years.isError || summary.isError) && <p className="mt-4 text-destructive">예산 API에 연결할 수 없습니다.</p>}
    </PortalLayout>
  );
}
