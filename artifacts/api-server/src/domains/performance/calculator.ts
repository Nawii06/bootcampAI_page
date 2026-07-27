import type { PerformanceCalculationFormula } from "@workspace/api-zod";

export function calculatePerformanceValue(
  formula: PerformanceCalculationFormula,
  sources: Record<string, number>,
) {
  if (formula.type === "COUNT") return sources[formula.source] ?? 0;
  const denominator = sources[formula.denominator] ?? 0;
  if (denominator === 0) return 0;
  const value =
    ((sources[formula.numerator] ?? 0) / denominator) * formula.multiplier;
  return Number(value.toFixed(formula.precision));
}
