import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { cacheService } from './cacheService';

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

function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('密码长度至少为8位');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  
  if (!/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }
  
  return errors;
}

function createAuthToken(payload: { userId: string; email: string; plan: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    jwtid: randomUUID(),
  });
}

export async function registerUser(input: RegisterInput): Promise<AuthResult> {
  logger.info('用户注册请求', { email: input.email });
  
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      logger.warn('邮箱已被注册', { email: input.email });
      throw new Error('邮箱已被注册');
    }

    // 验证密码强度
    const passwordErrors = validatePasswordStrength(input.password);
    if (passwordErrors.length > 0) {
      logger.warn('密码强度验证失败', { email: input.email, errors: passwordErrors });
      throw new Error(passwordErrors.join('; '));
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

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

    logger.info('用户注册成功', { userId: user.id, email: user.email });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      token,
    };
  } catch (error) {
    logger.error('用户注册失败', { email: input.email, error: (error as Error).message });
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<AuthResult> {
  logger.info('用户登录请求', { email: input.email });
  
  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      logger.warn('用户不存在', { email: input.email });
      throw new Error('邮箱或密码错误');
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValid) {
      logger.warn('密码错误', { email: input.email });
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

    logger.info('用户登录成功', { userId: user.id, email: user.email });
    
    return {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
      token,
    };
  } catch (error) {
    logger.error('用户登录失败', { email: input.email, error: (error as Error).message });
    throw error;
  }
}

export async function logoutUser(token: string): Promise<void> {
  logger.info('用户登出请求', { token: token.substring(0, 20) + '...' });
  
  try {
    const result = await prisma.session.deleteMany({
      where: { token },
    });
    
    logger.info('用户登出成功', { deletedCount: result.count });
  } catch (error) {
    logger.error('用户登出失败', { error: (error as Error).message });
    throw error;
  }
}

export async function validateToken(token: string) {
  logger.debug('令牌验证请求', { token: token.substring(0, 20) + '...' });
  
  const cacheKey = `token:${token}`;
  const cachedResult = cacheService.get(cacheKey);
  
  if (cachedResult) {
    logger.debug('令牌验证缓存命中');
    return cachedResult;
  }

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
      logger.warn('令牌无效或已过期', { userId: decoded.userId });
      // 缓存无效令牌，有效期5分钟
      cacheService.set(cacheKey, null, 300000);
      return null;
    }

    logger.debug('令牌验证成功', { userId: decoded.userId });
    // 缓存有效令牌，有效期10分钟
    cacheService.set(cacheKey, decoded, 600000);
    return decoded;
  } catch (error) {
    logger.warn('令牌验证失败', { error: (error as Error).message });
    // 缓存无效令牌，有效期5分钟
    cacheService.set(cacheKey, null, 300000);
    return null;
  }
}

export async function getUserById(userId: string) {
  logger.debug('获取用户信息请求', { userId });
  
  const cacheKey = `user:${userId}`;
  const cachedUser = cacheService.get(cacheKey);
  
  if (cachedUser) {
    logger.debug('用户信息缓存命中', { userId });
    return cachedUser;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan: true,
        createdAt: true,
      },
    });

    if (user) {
      logger.debug('获取用户信息成功', { userId, email: user.email });
      // 缓存用户信息，有效期10分钟
      cacheService.set(cacheKey, user, 600000);
    } else {
      logger.warn('用户不存在', { userId });
    }

    return user;
  } catch (error) {
    logger.error('获取用户信息失败', { userId, error: (error as Error).message });
    throw error;
  }
}
