import { z } from "zod";

export const CompanyApplicationInputSchema = z.object({
  businessYearId: z.string().uuid(),
  companyName: z.string().trim().min(1).max(200),
  registrationNumber: z.string().trim().max(50).optional(),
  companyType: z.string().trim().min(1).max(50),
  description: z.string().trim().max(4000).optional(),
  website: z.string().url().optional(),
  contact: z.object({
    name: z.string().trim().min(1).max(100),
    department: z.string().trim().max(100).optional(),
    position: z.string().trim().max(100).optional(),
    email: z.string().email(),
    phone: z.string().trim().max(30).optional(),
  }),
  participationTypes: z.array(z.string().trim().min(1)).min(1),
});

export const CompanyApplicationDecisionSchema = z.object({
  decision: z.enum(["SUPPLEMENT_REQUESTED", "APPROVED", "REJECTED"]),
  note: z.string().trim().max(2000).optional(),
});

export const CompanyApplicationIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const CompanyParticipationQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  participationType: z.enum([
    "DEMAND_SURVEY",
    "PROJECT",
    "PROJECT_EVALUATION",
    "FIELD_PRACTICE",
    "INTERNSHIP",
    "EMPLOYMENT",
  ]).optional(),
});

export const CompanyParticipationInputSchema = z.object({
  businessYearId: z.string().uuid(),
  participationType: z.enum([
    "DEMAND_SURVEY",
    "PROJECT",
    "PROJECT_EVALUATION",
    "FIELD_PRACTICE",
    "INTERNSHIP",
    "EMPLOYMENT",
  ]),
  title: z.string().trim().min(1).max(200),
  details: z.record(z.string(), z.unknown()),
  participantCount: z.number().int().nonnegative().default(0),
  employmentCount: z.number().int().nonnegative().default(0),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export type CompanyApplicationInput = z.infer<
  typeof CompanyApplicationInputSchema
>;
export type CompanyApplicationDecision = z.infer<
  typeof CompanyApplicationDecisionSchema
>;
export type CompanyParticipationInput = z.infer<
  typeof CompanyParticipationInputSchema
>;
