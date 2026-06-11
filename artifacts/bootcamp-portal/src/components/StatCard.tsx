import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: { value: string; isPositive: boolean };
  className?: string;
}

export function StatCard({ label, value, sublabel, trend, className }: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-foreground">{value}</div>
        {(sublabel || trend) && (
          <div className="flex items-center text-xs mt-1">
            {trend && (
              <span className={cn("mr-2 font-medium", trend.isPositive ? "text-green-600" : "text-destructive")}>
                {trend.isPositive ? "↑" : "↓"} {trend.value}
              </span>
            )}
            {sublabel && <span className="text-muted-foreground">{sublabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
