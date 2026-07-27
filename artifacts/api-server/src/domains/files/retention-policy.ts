export function calculateFileExpiry(
  createdAt: Date,
  policy: {
    retentionDays: number;
    personalInfoRetentionDays: number;
  },
  containsPersonalInfo: boolean,
) {
  const days = containsPersonalInfo
    ? policy.personalInfoRetentionDays
    : policy.retentionDays;
  return new Date(createdAt.getTime() + days * 24 * 60 * 60 * 1_000);
}

export function evaluateRetentionOutcome(input: {
  now: Date;
  legalHoldUntil: Date | null;
  relationCount: number;
}) {
  if (input.legalHoldUntil && input.legalHoldUntil > input.now) {
    return "SKIPPED_LEGAL_HOLD" as const;
  }
  if (input.relationCount > 0) {
    return "SKIPPED_RELATION" as const;
  }
  return "ELIGIBLE" as const;
}
