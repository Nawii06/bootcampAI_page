import type { NextFunction, Request, Response } from "express";
import {
  AuthenticatedUserSchema,
  RoleCodeSchema,
  type AuthenticatedUser,
  type RoleCode,
} from "@workspace/api-zod";
import { ApiError } from "../lib/api-error";

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
    }
  }
}

function parseDevelopmentIdentity(req: Request): AuthenticatedUser | undefined {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ENABLE_MOCK_AUTH !== "true"
  ) {
    return undefined;
  }

  const id = req.header("x-mock-user-id");
  const rolesHeader = req.header("x-mock-roles");
  if (!id || !rolesHeader) {
    return undefined;
  }

  return AuthenticatedUserSchema.parse({
    id,
    loginId: req.header("x-mock-login-id") ?? id,
    displayName: req.header("x-mock-display-name") ?? "개발 사용자",
    roles: rolesHeader
      .split(",")
      .map((role) => RoleCodeSchema.parse(role.trim())),
  });
}

export function attachAuth(req: Request, _res: Response, next: NextFunction) {
  // 대학 SSO/session adapter가 연결되기 전까지 인증되지 않은 요청으로 처리한다.
  // 개발 mock은 명시적으로 활성화해야 하며 production에서는 항상 비활성이다.
  req.auth = parseDevelopmentIdentity(req);
  next();
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  if (!req.auth) {
    next(new ApiError(401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다."));
    return;
  }
  next();
}

export function requireRoles(...allowedRoles: RoleCode[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new ApiError(401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다."));
      return;
    }
    if (
      !req.auth.roles.includes("SYSTEM_ADMIN") &&
      !allowedRoles.some((role) => req.auth?.roles.includes(role))
    ) {
      next(new ApiError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다."));
      return;
    }
    next();
  };
}
