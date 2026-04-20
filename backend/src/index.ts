import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import type { Server } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestContextMiddleware } from './middleware/requestContext';
import { requestMetricsMiddleware } from './middleware/requestMetrics';
import { createRateLimiter } from './middleware/rateLimit';
import { validateRuntimeEnv } from './config/env';
import authRoutes from './routes/auth';
import worldRoutes from './routes/worlds';
import bookRoutes from './routes/books';
import entityRoutes from './routes/entities';
import captureRoutes from './routes/captures';
import entitlementRoutes from './routes/entitlements';
import aiRoutes from './routes/ai';
import storeRoutes from './routes/store';
import timelineRoutes from './routes/timeline';
import subscriptionRoutes from './routes/subscriptions';
import observabilityRoutes from './routes/observability';

function resolveEnvCandidates(nodeEnv: string): string[] {
  if (nodeEnv === 'production') {
    return ['.env.production', '.env'];
  }
  if (nodeEnv === 'test') {
    return ['.env.test', '.env'];
  }
  return ['.env.development', '.env'];
}

function loadEnvironmentConfig(): string {
  const nodeEnv = String(process.env.NODE_ENV || 'development').trim() || 'development';
  const candidates = resolveEnvCandidates(nodeEnv);

  for (const envFile of candidates) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (existsSync(fullPath)) {
      dotenv.config({ path: fullPath });
      return envFile;
    }
  }

  dotenv.config();
  return '.env';
}

const loadedEnvFile = loadEnvironmentConfig();
const env = validateRuntimeEnv();

// 后端环境变量来源：backend/.env（本地）或部署平台注入（生产）。
// - 开发：NODE_ENV=development（默认）
// - 生产：NODE_ENV=production（建议配合 npm run build && npm run start）
const PORT = env.PORT;

export function createApp() {
  const app = express();

  // 安全中间件
  app.use(helmet());

  // CORS 配置
  const corsOptions = {
    origin: env.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  };
  app.use(cors(corsOptions));

  // 解析 JSON
  app.use(express.json());

  // 请求上下文与可观测性
  app.use(requestContextMiddleware);
  app.use(requestMetricsMiddleware);

  const defaultLimiter = createRateLimiter({
    name: 'default',
    windowMs: 60_000,
    maxRequests: 300,
  });
  const authLimiter = createRateLimiter({
    name: 'auth',
    windowMs: 5 * 60_000,
    maxRequests: 60,
  });
  const aiLimiter = createRateLimiter({
    name: 'ai',
    windowMs: 60_000,
    maxRequests: 80,
  });

  app.use(defaultLimiter);

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API 路由
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/worlds', worldRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/entities', entityRoutes);
  app.use('/api/captures', captureRoutes);
  app.use('/api/entitlements', entitlementRoutes);
  app.use('/api/ai', aiLimiter, aiRoutes);
  app.use('/api/store', storeRoutes);
  app.use('/api/timeline', timelineRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/observability', observabilityRoutes);

  // 404 处理
  app.use(notFoundHandler);

  // 错误处理
  app.use(errorHandler);

  return app;
}

const app = createApp();

export function startServer(port: string | number = PORT): Server {
  return app.listen(port, () => {
    console.log(`[Server] World Link API running on port ${port}`);
    console.log(`[Server] Environment: ${env.NODE_ENV}`);
    console.log(`[Server] Env file: ${loadedEnvFile}`);
  });
}

if (env.NODE_ENV !== 'test') {
  startServer(PORT);
}

export default app;
