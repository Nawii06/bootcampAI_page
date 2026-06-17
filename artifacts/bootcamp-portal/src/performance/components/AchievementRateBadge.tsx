import { Badge } from "@/components/ui/badge";

export function AchievementRateBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <Badge variant="outline">계산불가</Badge>;
  }
  if (value >= 100) return <Badge className="bg-green-700 text-white">달성 {value}%</Badge>;
  if (value >= 70) return <Badge className="bg-yellow-600 text-white">주의 {value}%</Badge>;
  return <Badge className="bg-destructive text-destructive-foreground">미달 {value}%</Badge>;
}
