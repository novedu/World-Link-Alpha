# ADR-001: 架构决策记录

## 1. 技术栈选择

### 前端
- **框架**: React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide Icons
- **构建工具**: Vite

### 后端
- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: SQLite (使用 Prisma ORM)
- **鉴权**: JWT (JSON Web Tokens)

### 浏览器插件
- **类型**: Chrome Extension (Manifest V3)
- **组件**: Content Script, Background Service Worker, Sidepanel

## 2. 架构设计

### 前端架构
- **组件分层**: 展示组件、容器组件、业务组件
- **状态管理**: React Hooks + Chrome Storage
- **数据获取**: 统一的 HTTP 服务层
- **代码组织**:
  - `components/`: UI 组件
  - `hooks/`: 自定义 Hooks
  - `services/`: API 服务
  - `lib/`: 工具库
  - `constants/`: 常量定义
  - `utils/`: 工具函数

### 后端架构
- **路由组织**: RESTful API 设计
- **中间件**: 认证、错误处理、日志
- **数据模型**: Prisma Schema
- **代码组织**:
  - `src/routes/`: API 路由
  - `src/middleware/`: 中间件
  - `src/services/`: 业务逻辑
  - `src/models/`: 数据模型

## 3. 关键决策

### 3.1 数据库选择
- **选择**: SQLite + Prisma
- **原因**: 
  - 轻量级，适合独立开发者
  - 不需要额外的数据库服务
  - Prisma 提供类型安全的 ORM
  - 便于本地开发和测试
- **放弃的方案**: PostgreSQL
  - 原因: 用户环境中没有可用的 PostgreSQL 数据库
- **未来迁移**: 可通过 Prisma 无缝迁移到 PostgreSQL

### 3.2 前端请求层
- **选择**: Axios + 统一封装
- **原因**:
  - 企业级请求层规范要求
  - 支持拦截器、错误处理、超时配置
  - 类型安全的响应处理
  - 统一的环境配置管理
- **实现**: 
  - `src/lib/http/`: HTTP 客户端封装
  - `src/services/`: 业务服务层

### 3.3 鉴权方案
- **选择**: JWT
- **原因**:
  - 无状态认证，便于水平扩展
  - 适合浏览器插件环境
  - 成熟的鉴权方案
- **实现**:
  - Token 存储在 Chrome Storage
  - 自动刷新机制
  - 401 错误处理

### 3.4 浏览器插件架构
- **职责边界**:
  - Content Script: 页面交互、DOM 采集
  - Background Service Worker: 消息分发、权限调用
  - Sidepanel: 管理界面与用户操作
- **消息通信**: chrome.runtime.sendMessage
- **存储**: chrome.storage.local

## 4. 环境配置

- **环境**: local, development, test, staging, production
- **配置管理**: .env 文件 + 配置读取层
- **API 地址**: 从环境变量读取，禁止硬编码

## 5. 测试策略

- **单元测试**: Vitest + Testing Library
- **类型校验**: TypeScript strict mode
- **代码质量**: ESLint
- **构建检查**: npm run build

## 6. 部署与运维

- **前端**: 静态文件部署
- **后端**: 轻量服务器部署
- **数据库**: SQLite 文件存储
- **最小运维**: 无需复杂的基础设施

## 7. 未来演进

- **数据库**: 可迁移到 PostgreSQL 以支持多用户
- **后端**: 可迁移到 Next.js API Routes
- **前端**: 可添加 Web 版本作为展示端
- **功能**: 可添加更多高级功能如 AI 辅助创作

## 8. 风险与限制

- **SQLite**: 不适合高并发场景
- **JWT**: 需要注意 token 安全和过期处理
- **浏览器插件**: 受限于浏览器权限和 API
- **独立开发**: 需平衡功能复杂度和维护成本

## 9. 结论

本架构设计采用了成熟、稳定、低复杂度的技术栈，适合独立开发者快速交付生产级别的浏览器插件产品。通过统一的请求层、清晰的代码组织和完善的错误处理，确保了项目的可维护性和可扩展性。