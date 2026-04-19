import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const JWT_EXPIRES_IN = '7d';

if (process.env.NODE_ENV === 'production') {
  const hasStrongSecret = Boolean(process.env.JWT_SECRET) && JWT_SECRET.length >= 32;
  if (!hasStrongSecret) {
    throw new Error('生产环境 JWT_SECRET 不能为空且长度至少 32 位');
  }
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    plan: string;
  };
  token: string;
}

function createAuthToken(payload: { userId: string; email: string; plan: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    jwtid: randomUUID(),
  });
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error('邮箱已被注册');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      plan: 'free',
    },
  });

  // 创建默认配额
  await prisma.entitlement.create({
    data: {
      userId: user.id,
      maxWorlds: 3,
      maxEntities: 100,
      maxCaptures: 50,
      canExport: false,
      canUseAI: false,
    },
  });

  const token = createAuthToken({ userId: user.id, email: user.email, plan: user.plan });

  // 保存会话
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
    },
    token,
  };
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error('邮箱或密码错误');
  }

  const isValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValid) {
    throw new Error('邮箱或密码错误');
  }

  const token = createAuthToken({ userId: user.id, email: user.email, plan: user.plan });

  // 保存会话
  await prisma.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      plan: user.plan,
    },
    token,
  };
}

export async function logoutUser(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function validateToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      plan: string;
    };

    // 检查会话是否存在
    const session = await prisma.session.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      plan: true,
      createdAt: true,
    },
  });
}
