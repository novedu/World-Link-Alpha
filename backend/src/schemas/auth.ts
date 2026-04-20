import { z } from 'zod';

const emailSchema = z
  .string()
  .trim()
  .email('邮箱格式不正确');

const passwordSchema = z
  .string()
  .min(6, '密码至少 6 位')
  .max(72, '密码长度不能超过 72 位');

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '请输入密码'),
});
