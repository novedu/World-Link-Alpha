type ValidationErrorInput = {
  path?: string | number | Array<string | number>;
  param?: string;
  msg?: unknown;
  message?: unknown;
};

export function getFieldErrors(errors: ValidationErrorInput[] = []): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const error of errors) {
    const rawPath = error.path ?? error.param ?? 'unknown';
    const field = Array.isArray(rawPath) ? rawPath.join('.') : String(rawPath);
    const message = String(error.msg ?? error.message ?? '参数校验失败');

    if (!fieldErrors[field]) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}
