import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  /** Seconds remaining when dialog is first shown */
  secondsRemaining: number;
  onExtend: () => void;
  onDismiss: () => void;
}

export function SessionExpiryWarning({
  secondsRemaining,
  onExtend,
  onDismiss,
}: Props) {
  const [countdown, setCountdown] = useState(secondsRemaining);

  // Sync if parent updates secondsRemaining (e.g. after activity)
  useEffect(() => {
    setCountdown(secondsRemaining);
  }, [secondsRemaining]);

  // Count down locally for a live display
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timeLabel =
    minutes > 0
      ? `${minutes}분 ${seconds.toString().padStart(2, "0")}초`
      : `${seconds}초`;

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>세션이 곧 만료됩니다</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block mb-2">
              작성 중인 내용이 있으면 저장해 주세요.
            </span>
            <span className="font-semibold text-foreground">
              {timeLabel}
            </span>{" "}
            후 자동으로 로그아웃됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>나중에</AlertDialogCancel>
          <AlertDialogAction onClick={onExtend}>세션 연장</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
