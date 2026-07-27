export type BenefitPolicyLifecycleStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED"
  | "ARCHIVED";

const transitions: Record<
  BenefitPolicyLifecycleStatus,
  readonly BenefitPolicyLifecycleStatus[]
> = {
  DRAFT: ["OPEN", "ARCHIVED"],
  OPEN: ["CLOSED"],
  CLOSED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionBenefitPolicy(
  current: BenefitPolicyLifecycleStatus,
  next: BenefitPolicyLifecycleStatus,
) {
  return transitions[current].includes(next);
}
