import { Router, type IRouter } from "express";
import {
  ContentDecisionSchema,
  ContentIdParamsSchema,
  ContentItemInputSchema,
  PublicContentQuerySchema,
} from "@workspace/api-zod";
import { requireAuth, requireRoles } from "../../middleware/auth";
import {
  createContent,
  listPublicContent,
  transitionContent,
} from "./service";

const router: IRouter = Router();

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
    res.json(await transitionContent(id, input, req.auth!.id, String(req.id)));
  } catch (error) { next(error); }
});

export default router;
