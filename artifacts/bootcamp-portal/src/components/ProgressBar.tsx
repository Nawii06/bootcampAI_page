import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  label?: string;
  colorScheme?: "success" | "warning" | "danger" | "default" | "auto";
  className?: string;
}

export function ProgressBar({ value, label, colorScheme = "auto", className }: ProgressBarProps) {
  const safeValue = Math.min(100, Math.max(0, value));
  
  let colorClass = "bg-primary";
  
  if (colorScheme === "auto") {
    if (safeValue < 70) colorClass = "bg-destructive";
    else if (safeValue < 90) colorClass = "bg-yellow-500";
    else colorClass = "bg-green-600";
  } else if (colorScheme === "success") {
    colorClass = "bg-green-600";
  } else if (colorScheme === "warning") {
    colorClass = "bg-yellow-500";
  } else if (colorScheme === "danger") {
    colorClass = "bg-destructive";
  }

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="flex justify-between mb-1 text-xs">
          <span className="font-medium text-foreground">{label}</span>
          <span className="text-muted-foreground">{safeValue.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
        <div 
          className={cn("h-full transition-all duration-300 ease-in-out", colorClass)}
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {!label && (
        <div className="mt-1 text-right text-xs text-muted-foreground">
          {safeValue.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
