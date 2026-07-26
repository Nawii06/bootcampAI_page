import type {
  BenefitExpression,
  EligibilityExpression,
} from "@workspace/api-zod";

type FactValue = number | string | string[];
type Facts = Record<string, FactValue>;

export function evaluateEligibility(
  expression: EligibilityExpression,
  facts: Facts,
) {
  const actual = facts[expression.fact];
  switch (expression.operator) {
    case "GTE":
      return Number(actual) >= Number(expression.value);
    case "LTE":
      return Number(actual) <= Number(expression.value);
    case "EQ":
      return String(actual) === String(expression.value);
    case "IN": {
      const allowed = Array.isArray(expression.value)
        ? expression.value
        : [String(expression.value)];
      return Array.isArray(actual)
        ? actual.some((value) => allowed.includes(value))
        : allowed.includes(String(actual));
    }
  }
}

export function calculateBenefitAmount(
  formula: BenefitExpression,
  facts: Facts,
) {
  switch (formula.type) {
    case "FIXED":
      return formula.amount;
    case "MULTIPLY": {
      const calculated = Number(facts[formula.fact] ?? 0) * formula.rate;
      return formula.maximumAmount === undefined
        ? calculated
        : Math.min(calculated, formula.maximumAmount);
    }
    case "TIERED": {
      const value = Number(facts[formula.fact] ?? 0);
      return [...formula.tiers]
        .sort((a, b) => b.minimum - a.minimum)
        .find((tier) => value >= tier.minimum)?.amount ?? 0;
    }
  }
}
