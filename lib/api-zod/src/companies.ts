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

export const CompanyIdParamsSchema = z.object({ id: z.string().uuid() });

export const CompanyMasterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  companyType: z.string().trim().min(1).max(50).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  website: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "변경할 기업정보가 필요합니다.",
});

export const CompanyContactInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  department: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().max(30).optional(),
  isPrimary: z.boolean().default(false),
});

export const CompanyExpertInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  specialty: z.string().trim().min(1).max(200),
  profile: z.record(z.string(), z.unknown()).default({}),
});

export const CompanyExpertStatusInputSchema = z.object({
  isActive: z.boolean(),
});

export const CompanyApplicationsQuerySchema = z.object({
  businessYearId: z.string().uuid().optional(),
  status: z.enum([
    "DRAFT", "SUBMITTED", "REVIEWING", "SUPPLEMENT_REQUESTED",
    "APPROVED", "REJECTED",
  ]).optional(),
});

export const CompanyCommitmentInputSchema = z.object({
  businessYearId: z.string().uuid(),
  fileId: z.string().uuid(),
  signedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
}).refine(
  (value) => !value.expiresAt || new Date(value.expiresAt) > new Date(value.signedAt),
  { path: ["expiresAt"], message: "확약서 만료일은 서명일 이후여야 합니다." },
);

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

export const CompanyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  registrationNumber: z.string().nullable().optional(),
  companyType: z.string(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  isPublic: z.boolean(),
  isActive: z.boolean(),
  companyContacts: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    department: z.string().nullable().optional(),
    position: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    isPrimary: z.boolean(),
  }).passthrough()),
  companyExperts: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().optional(),
    specialty: z.string().optional(),
    isActive: z.boolean().optional(),
  }).passthrough()),
  companyParticipations: z.array(z.object({ id: z.string().uuid() }).passthrough()),
}).passthrough();

export const CompanyListResponseSchema = z.object({
  data: z.array(CompanyResponseSchema),
});

export const CompanyApplicationResponseSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string(),
  status: z.string(),
  supplementRequest: z.string().nullable().optional(),
  applicationData: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const CompanyApplicationsResponseSchema = z.object({
  data: z.array(CompanyApplicationResponseSchema),
  commitments: z.array(z.unknown()).optional().default([]),
});

export const PublicCompanyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  companyType: z.string(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
}).passthrough();

export const PublicCompanyListResponseSchema = z.object({
  data: z.array(PublicCompanyResponseSchema),
});

export const CompanyParticipationUpdateSchema = z.object({
  participationType: z.enum([
    "DEMAND_SURVEY",
    "PROJECT",
    "PROJECT_EVALUATION",
    "FIELD_PRACTICE",
    "INTERNSHIP",
    "EMPLOYMENT",
  ]).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  participantCount: z.number().int().nonnegative().optional(),
  employmentCount: z.number().int().nonnegative().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: "변경할 내용이 없습니다." });

export const CompanyParticipationResponseSchema = z.object({
  id: z.string().uuid(),
  participationType: z.string(),
  title: z.string(),
  details: z.object({
    track: z.string().optional(),
    problemDefinition: z.string().optional(),
    dataTypes: z.array(z.string()).optional(),
    expectedOutputs: z.array(z.string()).optional(),
    requiredSkills: z.array(z.string()).optional(),
    projectTopics: z.array(z.string()).optional(),
    linkedPortfolioIds: z.array(z.string()).optional(),
  }).passthrough().default({}),
  participantCount: z.number().default(0),
  employmentCount: z.number().default(0),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  createdAt: z.string(),
}).passthrough();

export const CompanyParticipationListResponseSchema = z.object({
  company: z.object({
    id: z.string().uuid(),
    name: z.string(),
    companyType: z.string(),
  }).passthrough(),
  data: z.array(CompanyParticipationResponseSchema),
});

export const CompanyPortfolioCandidateResponseSchema = z.object({
  id: z.string().uuid(),
  studentId: z.string().uuid(),
  title: z.string(),
  evidence: z.object({
    summary: z.string().optional(),
    techStack: z.array(z.string()).optional().default([]),
    outputLinks: z.array(z.string()).optional().default([]),
  }).passthrough(),
}).passthrough();

export const CompanyPortfolioCandidateListResponseSchema = z.object({
  data: z.array(CompanyPortfolioCandidateResponseSchema),
});

export type CompanyParticipationResponse = z.infer<
  typeof CompanyParticipationResponseSchema
>;
export type CompanyPortfolioCandidateResponse = z.infer<
  typeof CompanyPortfolioCandidateResponseSchema
>;

export type CompanyApplicationInput = z.infer<
  typeof CompanyApplicationInputSchema
>;
export type CompanyApplicationDecision = z.infer<
  typeof CompanyApplicationDecisionSchema
>;
export type CompanyParticipationInput = z.infer<
  typeof CompanyParticipationInputSchema
>;
export type CompanyMasterUpdate = z.infer<typeof CompanyMasterUpdateSchema>;
export type CompanyParticipationUpdate = z.infer<typeof CompanyParticipationUpdateSchema>;

export const CompanyParticipationStudentLinkSchema = z.object({
  portfolioIds: z.array(z.string().uuid()),
});
export type CompanyParticipationStudentLink = z.infer<typeof CompanyParticipationStudentLinkSchema>;

// ─── Admin: cross-company participation list ───────────────────────────────

/**
 * A single participation record enriched with company information.
 * Returned by GET /api/v1/company-participations when the caller has an
 * admin role (COMPANY_STAFF / REVIEWER / SYSTEM_ADMIN).
 */
export const AdminCompanyParticipationItemSchema =
  CompanyParticipationResponseSchema.extend({
    companyId: z.string().uuid(),
    companyName: z.string(),
    companyType: z.string(),
    businessYearId: z.string().uuid().optional(),
  });

export const AdminCompanyParticipationListResponseSchema = z.object({
  data: z.array(AdminCompanyParticipationItemSchema),
});

export type AdminCompanyParticipationItem = z.infer<
  typeof AdminCompanyParticipationItemSchema
>;
export type AdminCompanyParticipationListResponse = z.infer<
  typeof AdminCompanyParticipationListResponseSchema
>;

export const StudentEmploymentLinkResponseSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string(),
  companyType: z.string(),
  participationType: z.string(),
  title: z.string(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const StudentEmploymentLinksResponseSchema = z.object({
  data: z.array(StudentEmploymentLinkResponseSchema),
});

export type StudentEmploymentLinkResponse = z.infer<typeof StudentEmploymentLinkResponseSchema>;
export type CompanyContactInput = z.infer<typeof CompanyContactInputSchema>;
export type CompanyExpertInput = z.infer<typeof CompanyExpertInputSchema>;
export type CompanyCommitmentInput = z.infer<
  typeof CompanyCommitmentInputSchema
>;
export type CompanyResponse = z.infer<typeof CompanyResponseSchema>;
export type CompanyApplicationResponse = z.infer<
  typeof CompanyApplicationResponseSchema
>;
