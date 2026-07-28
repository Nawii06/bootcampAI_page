import { cn } from "@/lib/utils";

/**
 * Explicit notice for admin screens that gate their content on the active
 * business-years query. Shown when the query succeeds with ZERO active
 * years, so an empty dashboard/table is not mistaken for missing data.
 * (Pattern locked in by dev/no-open-period-admin-notices.test.ts.)
 */
export function NoActiveYearNotice({ className }: { className?: string }) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800",
        className,
      )}
    >
      현재 운영 중인 사업연도가 없습니다. 사업연도가 활성화되면 운영 데이터가 표시됩니다.
    </p>
  );
}
