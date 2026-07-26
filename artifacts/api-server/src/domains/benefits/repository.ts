import { asc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  benefitEligibilityRules,
  benefitPolicies,
} from "@workspace/db/schema";

export async function getPolicyWithRules(
  transaction: Parameters<Parameters<typeof db.transaction>[0]>[0],
  policyId: string,
) {
  const [policy] = await transaction
    .select()
    .from(benefitPolicies)
    .where(eq(benefitPolicies.id, policyId));
  if (!policy) return undefined;
  const rules = await transaction
    .select()
    .from(benefitEligibilityRules)
    .where(eq(benefitEligibilityRules.policyId, policyId))
    .orderBy(asc(benefitEligibilityRules.sortOrder));
  return { policy, rules };
}
