import { z } from "zod";
import { RoleCodeSchema } from "./common";

export const AuthenticatedUserSchema = z.object({
  id: z.string().uuid(),
  loginId: z.string().min(1),
  displayName: z.string().min(1),
  roles: z.array(RoleCodeSchema).min(1),
});

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

export const SessionResponseSchema = z.object({
  user: AuthenticatedUserSchema.extend({
    studentId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    departmentCode: z.string().optional(),
    grade: z.string().optional(),
    defaultRoute: z.string().startsWith("/").optional(),
    isFakeSession: z.boolean().optional(),
    fakeDataSetId: z.string().optional(),
  }),
  /** ISO 8601 timestamp of when the server-side session will expire */
  expiresAt: z.string().datetime().optional(),
});

export const FakeIdentitySummarySchema = z.object({
  identityId: z.string().uuid(),
  displayName: z.string().min(1),
  roles: z.array(RoleCodeSchema).min(1),
  scenarioLabel: z.string().min(1),
  description: z.string().min(1),
  defaultRoute: z.string().startsWith("/"),
});

export const FakeIdentityListResponseSchema = z.object({
  data: z.array(FakeIdentitySummarySchema),
});

export const FakeOperationItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().optional(),
  name: z.string().optional(),
  companyName: z.string().optional(),
  type: z.string().optional(),
  contentType: z.string().optional(),
  status: z.string(),
  note: z.string().optional(),
  candidateCount: z.number().int().nonnegative().optional(),
  reviewRequired: z.number().int().nonnegative().optional(),
  paidCount: z.number().int().nonnegative().optional(),
}).passthrough();

export const FakeOperationsResponseSchema = z.object({
  dataSetId: z.string(),
  role: z.string(),
  operations: z.object({
    benefitPolicies: z.array(FakeOperationItemSchema),
    companyApplications: z.array(FakeOperationItemSchema),
    contentWorkflow: z.array(FakeOperationItemSchema),
    reviewQueue: z.array(FakeOperationItemSchema),
  }),
  benefitAwards: z.array(z.record(z.string(), z.unknown())),
  auditLogs: z.array(z.object({
    id: z.string().uuid(),
    actorDisplayName: z.string(),
    action: z.string(),
    entityType: z.string(),
    entityId: z.string().nullable().optional(),
    occurredAt: z.string(),
  }).passthrough()),
});

export type SessionResponse = z.infer<typeof SessionResponseSchema>;
export type FakeIdentitySummary = z.infer<typeof FakeIdentitySummarySchema>;
export type FakeOperationsResponse = z.infer<
  typeof FakeOperationsResponseSchema
>;
