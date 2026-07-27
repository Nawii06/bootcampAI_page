import { Router, type IRouter } from "express";
import {
  CompanyApplicationDecisionSchema,
  CompanyApplicationIdParamsSchema,
  CompanyApplicationInputSchema,
  CompanyParticipationInputSchema,
  CompanyParticipationQuerySchema,
  CompanyParticipationUpdateSchema,
  CompanyApplicationsQuerySchema,
  CompanyCommitmentInputSchema,
  CompanyContactInputSchema,
  CompanyExpertInputSchema,
  CompanyExpertStatusInputSchema,
  CompanyIdParamsSchema,
  CompanyMasterUpdateSchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  decideCompanyApplication,
  createCompanyParticipation,
  updateCompanyParticipation,
  deleteCompanyParticipation,
  submitCompanyApplication,
  resubmitCompanyApplication,
  upsertCompanyCommitment,
  archiveCompanyContact,
  createCompanyContact,
  createCompanyExpert,
  updateCompanyExpertStatus,
  updateCompanyMaster,
} from "./service";
import {
  findCompanyForUser,
  listCompanies,
  listCompanyParticipations,
  listConsentedProjectPortfolios,
  listPublicCompanies,
  listCompanyApplications,
  listCompanyCommitments,
} from "./repository";
import { ApiError } from "../../lib/api-error";

const router: IRouter = Router();

router.patch("/v1/companies/:id", requireAuth, requireRoles("COMPANY_STAFF"), async (req, res, next) => {
  try {
    const { id } = CompanyIdParamsSchema.parse(req.params);
    res.json(await updateCompanyMaster(id, CompanyMasterUpdateSchema.parse(req.body), req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/companies/:id/contacts", requireAuth, requireRoles("COMPANY_STAFF"), async (req, res, next) => {
  try {
    const { id } = CompanyIdParamsSchema.parse(req.params);
    res.status(201).json(await createCompanyContact(id, CompanyContactInputSchema.parse(req.body), req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.delete("/v1/company-contacts/:id", requireAuth, requireRoles("COMPANY_STAFF"), async (req, res, next) => {
  try {
    const { id } = CompanyIdParamsSchema.parse(req.params);
    res.json(await archiveCompanyContact(id, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/companies/:id/experts", requireAuth, requireRoles("COMPANY_STAFF"), async (req, res, next) => {
  try {
    const { id } = CompanyIdParamsSchema.parse(req.params);
    res.status(201).json(await createCompanyExpert(id, CompanyExpertInputSchema.parse(req.body), req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.patch("/v1/company-experts/:id/status", requireAuth, requireRoles("COMPANY_STAFF"), async (req, res, next) => {
  try {
    const { id } = CompanyIdParamsSchema.parse(req.params);
    const input = CompanyExpertStatusInputSchema.parse(req.body);
    res.json(await updateCompanyExpertStatus(id, input.isActive, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.get("/v1/company-applications", requireAuth, async (req, res, next) => {
  try {
    const query = CompanyApplicationsQuerySchema.parse(req.query);
    const isApplicant = req.auth!.roles.some((role) => ["COMPANY_APPLICANT", "COMPANY_MANAGER"].includes(role));
    const canReview = req.auth!.roles.some((role) => ["COMPANY_STAFF", "REVIEWER", "AUDITOR", "SYSTEM_ADMIN"].includes(role));
    if (!isApplicant && !canReview) throw new ApiError(403, "FORBIDDEN", "기업신청 조회 권한이 없습니다.");
    res.json({
      data: await listCompanyApplications({
        ...query,
        applicantUserId: isApplicant && !req.auth!.roles.includes("SYSTEM_ADMIN") ? req.auth!.id : undefined,
      }),
      commitments: canReview ? await listCompanyCommitments() : [],
    });
  } catch (error) { next(error); }
});

router.get("/v1/public/companies", async (_req, res, next) => {
  try {
    res.json({ data: await listPublicCompanies() });
  } catch (error) {
    next(error);
  }
});

router.get(
  "/v1/companies",
  requireAuth,
  requireRoles("COMPANY_STAFF", "REVIEWER"),
  async (_req, res, next) => {
    try {
      res.json({ data: await listCompanies() });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/company-applications",
  requireAuth,
  requireRoles("COMPANY_APPLICANT", "COMPANY_MANAGER"),
  async (req, res, next) => {
    try {
      const input = CompanyApplicationInputSchema.parse(req.body);
      res.status(201).json(
        await submitCompanyApplication(input, req.auth!.id, String(req.id)),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.put("/v1/company-applications/:id", requireAuth, requireRoles("COMPANY_APPLICANT", "COMPANY_MANAGER"), async (req, res, next) => {
  try {
    const { id } = CompanyApplicationIdParamsSchema.parse(req.params);
    const input = CompanyApplicationInputSchema.parse(req.body);
    res.json(await resubmitCompanyApplication(id, input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/company-commitments", requireAuth, requireRoles("COMPANY_MANAGER"), async (req, res, next) => {
  try {
    const input = CompanyCommitmentInputSchema.parse(req.body);
    const company = await findCompanyForUser(req.auth!.id);
    if (!company) throw new ApiError(409, "APPROVED_COMPANY_REQUIRED", "승인되어 연결된 참여기업이 없습니다.");
    res.status(201).json(await upsertCompanyCommitment(input, company.id, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.get(
  "/v1/company-portfolio-candidates",
  requireAuth,
  requireRoles("COMPANY_MANAGER"),
  async (req, res, next) => {
    try {
      const company = await findCompanyForUser(req.auth!.id);
      if (!company) {
        throw new ApiError(409, "APPROVED_COMPANY_REQUIRED", "승인되어 연결된 참여기업이 없습니다.");
      }
      res.json({ data: await listConsentedProjectPortfolios() });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/v1/company-participations",
  requireAuth,
  requireRoles("COMPANY_MANAGER"),
  async (req, res, next) => {
    try {
      const query = CompanyParticipationQuerySchema.parse(req.query);
      const company = await findCompanyForUser(req.auth!.id);
      if (!company) {
        throw new ApiError(409, "APPROVED_COMPANY_REQUIRED", "승인되어 연결된 참여기업이 없습니다.");
      }
      res.json({
        company,
        data: await listCompanyParticipations(company.id, query),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/v1/company-participations",
  requireAuth,
  requireRoles("COMPANY_MANAGER"),
  async (req, res, next) => {
    try {
      const input = CompanyParticipationInputSchema.parse(req.body);
      const company = await findCompanyForUser(req.auth!.id);
      if (!company) {
        throw new ApiError(409, "APPROVED_COMPANY_REQUIRED", "승인되어 연결된 참여기업이 없습니다.");
      }
      res.status(201).json(
        await createCompanyParticipation(
          input,
          company.id,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/v1/company-participations/:id",
  requireAuth,
  requireRoles("COMPANY_MANAGER"),
  async (req, res, next) => {
    try {
      const { id } = CompanyIdParamsSchema.parse(req.params);
      const input = CompanyParticipationUpdateSchema.parse(req.body);
      const company = await findCompanyForUser(req.auth!.id);
      if (!company) throw new ApiError(409, "APPROVED_COMPANY_REQUIRED", "승인되어 연결된 참여기업이 없습니다.");
      res.json(await updateCompanyParticipation(id, company.id, input, req.auth!.id, String(req.id)));
    } catch (error) { next(error); }
  },
);

router.delete(
  "/v1/company-participations/:id",
  requireAuth,
  requireRoles("COMPANY_MANAGER"),
  async (req, res, next) => {
    try {
      const { id } = CompanyIdParamsSchema.parse(req.params);
      const company = await findCompanyForUser(req.auth!.id);
      if (!company) throw new ApiError(409, "APPROVED_COMPANY_REQUIRED", "승인되어 연결된 참여기업이 없습니다.");
      res.json(await deleteCompanyParticipation(id, company.id, req.auth!.id, String(req.id)));
    } catch (error) { next(error); }
  },
);

router.post(
  "/v1/company-applications/:id/decision",
  requireAuth,
  requireRoles("COMPANY_STAFF", "REVIEWER"),
  async (req, res, next) => {
    try {
      const { id } = CompanyApplicationIdParamsSchema.parse(req.params);
      const input = CompanyApplicationDecisionSchema.parse(req.body);
      res.json(
        await decideCompanyApplication(
          id,
          input,
          req.auth!.id,
          String(req.id),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
