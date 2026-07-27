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

  // Count down locally for a live display.
  // Dependency is `secondsRemaining` (the prop), NOT `countdown` (the state).
  // This means the interval is created once per prop-reset, not once per
  // second — avoiding ~300 wasted setInterval/clearInterval cycles per
  // 5-minute warning window.
  //
  // The displayed value is computed from a fixed `deadline` wall-clock
  // timestamp rather than decrementing a counter by 1 each tick.  When
  // the browser throttles background-tab timers (e.g. fires the callback
  // 2 s late), the counter-based approach would under-count; anchoring to
  // `Date.now()` keeps the display accurate regardless of tick timing.
  // The interval clears itself when the countdown reaches zero; the cleanup
  // function handles unmount and prop-reset.
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const deadline = Date.now() + secondsRemaining * 1000;
    const id = setInterval(() => {
      const remaining = Math.round((deadline - Date.now()) / 1000);
      setCountdown(Math.max(0, remaining));
      if (remaining <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [secondsRemaining]);

  // Flash the browser tab title while the warning is mounted so users in
  // other tabs get a visual cue in the tab strip. The original title is
  // captured on mount and restored on unmount (extend, dismiss, or expiry).
  useEffect(() => {
    const originalTitle = document.title;
    const warningTitle = `⚠️ 세션 만료 임박 — ${originalTitle}`;
    let showWarning = true;
    document.title = warningTitle;
    const id = setInterval(() => {
      showWarning = !showWarning;
      document.title = showWarning ? warningTitle : originalTitle;
    }, 2000);
    return () => {
      clearInterval(id);
      document.title = originalTitle;
    };
  }, []);

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
