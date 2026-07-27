import { Router, type IRouter } from "express";
import {
  ContentDecisionSchema,
  ContentIdParamsSchema,
  ContentItemInputSchema,
  ContentItemUpdateSchema,
  PublicContentQuerySchema,
  InternalContentQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { ApiError } from "../../lib/api-error";
import {
  createContent,
  listPublicContent,
  transitionContent,
  listInternalContent,
  listContentVersions,
  updateContent,
} from "./service";

const router: IRouter = Router();

router.get("/v1/content", requireAuth, requireRoles("CONTENT_EDITOR", "REVIEWER", "AUDITOR"), async (req, res, next) => {
  try {
    const query = InternalContentQuerySchema.parse(req.query);
    res.json(await listInternalContent(query));
  } catch (error) { return next(error); }
});

router.get("/v1/public/content", async (req, res, next) => {
  try {
    const query = PublicContentQuerySchema.parse(req.query);
    res.json(await listPublicContent(query.contentType, query.page, query.pageSize));
  } catch (error) { next(error); }
});

router.post("/v1/content", requireAuth, requireRoles("CONTENT_EDITOR"), async (req, res, next) => {
  try {
    const input = ContentItemInputSchema.parse(req.body);
    res.status(201).json(await createContent(input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.post("/v1/content/:id/transition", requireAuth, requireRoles("CONTENT_EDITOR", "REVIEWER"), async (req, res, next) => {
  try {
    const { id } = ContentIdParamsSchema.parse(req.params);
    const input = ContentDecisionSchema.parse(req.body);
    const roles = req.auth!.roles;
    const allowed =
      roles.includes("SYSTEM_ADMIN") ||
      (input.action === "SUBMIT_REVIEW" && roles.includes("CONTENT_EDITOR")) ||
      (input.action === "APPROVE" && roles.includes("REVIEWER")) ||
      (input.action === "PUBLISH" && roles.includes("CONTENT_EDITOR")) ||
      (input.action === "ARCHIVE" && roles.some((role) => ["CONTENT_EDITOR", "REVIEWER"].includes(role)));
    if (!allowed) {
      throw new ApiError(403, "FORBIDDEN", "해당 콘텐츠 상태변경 권한이 없습니다.");
    }
    return res.json(await transitionContent(id, input, req.auth!.id, String(req.id)));
  } catch (error) { return next(error); }
});

router.patch("/v1/content/:id", requireAuth, requireRoles("CONTENT_EDITOR"), async (req, res, next) => {
  try {
    const { id } = ContentIdParamsSchema.parse(req.params);
    res.json(await updateContent(id, ContentItemUpdateSchema.parse(req.body), req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

router.get("/v1/content/:id/versions", requireAuth, requireRoles("CONTENT_EDITOR", "REVIEWER", "AUDITOR"), async (req, res, next) => {
  try {
    const { id } = ContentIdParamsSchema.parse(req.params);
    res.json({ data: await listContentVersions(id) });
  } catch (error) { next(error); }
});

export default router;
