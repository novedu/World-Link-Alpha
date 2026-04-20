import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL 不能为空'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET 长度至少 16 位'),
    JWT_EXPIRES_IN: z.string().min(1).default('7d'),
    ALLOWED_ORIGINS: z.string().min(1, 'ALLOWED_ORIGINS 不能为空'),
    LOG_LEVEL: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.NODE_ENV === 'production' && data.JWT_SECRET.length < 32) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: '生产环境 JWT_SECRET 长度至少 32 位',
      });
    }
  });

function parseAllowedOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export interface RuntimeEnv {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  ALLOWED_ORIGINS: string;
  LOG_LEVEL?: string;
  allowedOrigins: string[];
}

export function validateRuntimeEnv(raw: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`环境变量校验失败\n- ${errors.join('\n- ')}`);
  }

  const allowedOrigins = parseAllowedOrigins(parsed.data.ALLOWED_ORIGINS);
  if (!allowedOrigins.length) {
    throw new Error('环境变量校验失败\n- ALLOWED_ORIGINS: 至少提供一个可用来源');
  }

  return {
    ...parsed.data,
    allowedOrigins,
  };
}

