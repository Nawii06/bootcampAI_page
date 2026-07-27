import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LoadingCardProps {
  /** 사용자에게 보여줄 로딩 메시지. 미제공 시 기본 메시지 표시. */
  message?: string;
  className?: string;
}

export function LoadingCard({ message = "불러오는 중입니다…", className }: LoadingCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
