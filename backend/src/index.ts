import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS 配置
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 解析 JSON
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/worlds', worldRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/captures', captureRoutes);
app.use('/api/entitlements', entitlementRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// 404 处理
app.use(notFoundHandler);

// 错误处理
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  console.log(`[Server] World Link API running on port ${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;