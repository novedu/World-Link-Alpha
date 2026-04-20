export class AppError extends Error {
  statusCode: number;
  code: string;
  details: Record<string, unknown>;
  fieldErrors: Record<string, string>;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details: Record<string, unknown> = {},
    fieldErrors: Record<string, string> = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
