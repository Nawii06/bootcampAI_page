import { Router, type IRouter } from "express";
import {
  CompanyApplicationDecisionSchema,
  CompanyApplicationIdParamsSchema,
  CompanyApplicationInputSchema,
  CompanyParticipationInputSchema,
  CompanyParticipationQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  decideCompanyApplication,
  createCompanyParticipation,
  submitCompanyApplication,
} from "./service";
import {
  findCompanyForUser,
  listCompanies,
  listCompanyParticipations,
  listConsentedProjectPortfolios,
  listPublicCompanies,
} from "./repository";
import { ApiError } from "../../lib/api-error";

const router: IRouter = Router();

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
