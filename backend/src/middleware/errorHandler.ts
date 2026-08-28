import type { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../lib/errors";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  const anyErr = err as { name?: string; message?: string; status?: number };
  if (anyErr?.name === "MulterError") {
    return res.status(400).json({ error: anyErr.message, code: "UPLOAD_ERROR" });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
}

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      return next(
        new AppError(400, "Validation failed", "VALIDATION", parsed.error.flatten()),
      );
    }
    req[source] = parsed.data as typeof req[typeof source];
    next();
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Route not found", code: "NOT_FOUND" });
}
