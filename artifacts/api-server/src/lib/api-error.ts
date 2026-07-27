import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Array<{
      field: string;
      code: string;
      message: string;
    }>,
  ) {
    super(message);
  }
}

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(new ApiError(404, "NOT_FOUND", `Route not found: ${req.method}`));
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof multer.MulterError) {
    const fileTooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(fileTooLarge ? 413 : 400).json({
      error: {
        code: fileTooLarge ? "FILE_SIZE_EXCEEDED" : "MULTIPART_ERROR",
        message: fileTooLarge
          ? "업로드 파일의 허용 용량을 초과했습니다."
          : "파일 업로드 요청 형식이 올바르지 않습니다.",
        requestId: req.id,
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "요청값이 올바르지 않습니다.",
        requestId: req.id,
        fieldErrors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          code: issue.code,
          message: issue.message,
        })),
      },
    });
    return;
  }

  const apiError =
    error instanceof ApiError
      ? error
      : new ApiError(500, "INTERNAL_ERROR", "서버 오류가 발생했습니다.");

  if (!(error instanceof ApiError)) {
    req.log.error({ err: error }, "Unhandled API error");
  }

  res.status(apiError.status).json({
    error: {
      code: apiError.code,
      message: apiError.message,
      requestId: req.id,
      ...(apiError.fieldErrors
        ? { fieldErrors: apiError.fieldErrors }
        : {}),
    },
  });
}
