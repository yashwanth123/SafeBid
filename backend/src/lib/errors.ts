export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = "APP_ERROR", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, "BAD_REQUEST", details);
export const unauthorized = (message = "Authentication required") =>
  new AppError(401, message, "UNAUTHORIZED");
export const forbidden = (message = "Not allowed") => new AppError(403, message, "FORBIDDEN");
export const notFound = (message = "Not found") => new AppError(404, message, "NOT_FOUND");
export const conflict = (message: string) => new AppError(409, message, "CONFLICT");
