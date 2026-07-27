import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ErrorCardProps {
  /** 사용자에게 보여줄 오류 메시지. 미제공 시 error.message 또는 기본 메시지 표시. */
  message?: string;
  /** React Query 등에서 전달된 오류 객체 */
  error?: Error | null;
  /** 제공 시 "다시 시도" 버튼이 표시되며 클릭 시 호출됩니다. */
  onRetry?: () => void;
  /** 재시도 진행 중 여부 (버튼 비활성화) */
  isRetrying?: boolean;
  className?: string;
}

export function ErrorCard({
  message,
  error,
  onRetry,
  isRetrying = false,
  className,
}: ErrorCardProps) {
  const displayMessage =
    message ?? error?.message ?? "데이터를 불러오지 못했습니다.";

  return (
    <Card className={cn("border-destructive/40", className)}>
      <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">{displayMessage}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            API 서버 또는 네트워크 연결 상태를 확인해 주세요.
          </p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isRetrying && "animate-spin")}
            />
            다시 시도
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
