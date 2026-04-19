import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import type { Server } from 'node:http';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestContextMiddleware } from './middleware/requestContext';
import { requestMetricsMiddleware } from './middleware/requestMetrics';
import { createRateLimiter } from './middleware/rateLimit';
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

dotenv.config();

const PORT = process.env.PORT || 3001;

export function createApp() {
  const app = express();

  // 安全中间件
  app.use(helmet());

  // CORS 配置
  const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
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
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer(PORT);
}

export default app;
