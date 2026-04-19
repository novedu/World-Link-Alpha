# World-Link Alpha 开发规范（Engineering Guidelines）

> 目标：减少实现混乱、避免 `App.jsx` 持续膨胀、让产品/UX/研发在同一约束下迭代。

## 1. 适用范围

- 前端插件代码：`sidepanel/`、`content.js`、`background.js`
- 产品文档：`prd/`、`design/`

## 2. 当前基线（2026-04-16）

- `sidepanel/src/App.jsx`：约 `370` 行（已进入阈值范围）
- 已完成拆分：
  - 视图组件：`BrandHeader`、`InlineMessage`、`AccountSyncModal`、`ActionDialog`、`EntitySection`、`CaptureSection`
  - 数据模块：`constants/worldLink.js`、`utils/*`、`hooks/useEntityFilters`、`hooks/useCaptureFilters`
  - 流程模块：`hooks/useRuntimeContext`、`hooks/useActionDialogFlow`、`hooks/useEntityEditorFlow`、`hooks/useCaptureInboxFlow`、`hooks/useStorageSync`、`hooks/useExportFlow`、`hooks/useOverviewStats`、`hooks/useAccountViewModel`、`hooks/useUiMessage`、`hooks/useSelectionState`、`hooks/useWorldBookMeta`、`hooks/useWorldBookSelectionHandlers`
  - 服务模块：`services/runtimeApi.js`、`services/exportService.js`
- 下一阶段目标：继续保持 `App.jsx <= 400` 行，并把 lint 校验纳入提交门禁

## 3. 模块化硬约束

## 3.1 文件规模阈值

- 单文件组件 > `400` 行：必须拆分
- 单业务组件 > `250` 行：必须拆分子组件或 hooks
- 单函数 > `60` 行：优先拆成纯函数 + 组合调用
- background.js > `500` 行：必须按消息域拆分 handler

## 3.2 Sidepanel 推荐目录

```text
sidepanel/src
├── components/     # 展示组件（尽量无副作用）
│   ├── EntitySection/   # 实体管理模块（巨型组件拆分示例）
│   │   ├── EntityToolbar.jsx      # 工具栏（新建设定、导出）
│   │   ├── EntityFilters.jsx     # 过滤器（搜索、类型、标签）
│   │   ├── ManuscriptPanel.jsx    # 稿件解析面板
│   │   ├── EntityList.jsx        # 实体列表
│   │   ├── EntityEditor.jsx      # 实体编辑器（含冲突检查、AI反馈、标签、关系）
│   │   └── index.jsx             # 组合所有子组件
│   └── ...其他组件
├── hooks/          # useXxx 状态与副作用封装
├── services/       # chrome.runtime / export / auth 调用
├── constants/      # 类型映射、标签枚举、消息类型
├── utils/          # 纯函数工具（parse/filter/format）
└── App.jsx         # 页面编排容器，不承担细节实现
```

## 3.2.1 Background 推荐目录（模块化拆分后）

```text
background/
├── utils/
│   ├── constants.js    # 常量定义（API URL、Storage Keys、状态枚举等）
│   └── helpers.js       # 纯函数工具（数据规范化、ID生成等）
├── repositories/
│   └── dataRepository.js   # 数据仓库（封装 chrome.storage 读写）
├── services/
│   ├── authService.js           # 认证服务（登录/注册/会话管理）
│   ├── entityService.js          # 实体服务（实体CRUD/冲突检查）
│   ├── worldBookService.js       # 世界/书籍服务（世界/书籍CRUD）
│   └── entitlementService.js     # 权限服务（套餐/配额管理）
├── handlers/
│   ├── authHandler.js           # 认证消息处理（SIGN_IN/REGISTER/GET_AUTH_SESSION等）
│   ├── entityHandler.js          # 实体消息处理（SAVE_ENTITY/CHECK_CONFLICT等）
│   ├── worldBookHandler.js       # 世界/书籍消息处理（CREATE_WORLD/CREATE_BOOK等）
│   ├── runtimeHandler.js        # 运行时消息处理（REFRESH_DATA/GET_RUNTIME_CONFIG等）
│   ├── captureHandler.js         # 采集消息处理（UPDATE_CAPTURE_STATUS等）
│   ├── aiHandler.js              # AI消息处理（AI_ENTITY_ASSIST/REPORT_AI_FEEDBACK等）
│   ├── exportHandler.js          # 导出消息处理（REQUEST_EXPORT等）
│   ├── entitlementHandler.js    # 权限消息处理（GET_ENTITLEMENTS/REFRESH_ENTITLEMENTS等）
│   └── migrateHandler.js         # 迁移消息处理（MIGRATE_LOCAL_TO_CLOUD等）
└── background.js                # 入口文件（初始化 + 消息路由分发）
```

## 3.3 App 容器职责边界

`App.jsx` 仅保留：

1. 全局编排（世界/书上下文、主 tab）
2. 跨模块状态协调
3. 顶层弹窗开关与页面级提示

`App.jsx` 不应继续承载：

- 大段实体筛选与格式化逻辑（应迁入 `utils/`）
- 消息协议细节（应迁入 `services/runtimeApi.js`）
- 复杂导出拼装逻辑（应迁入 `services/exportService.js`）

## 4. 消息协议规范

- 消息类型常量化：禁止在多个文件散落硬编码字符串
- 统一响应结构：`{ success, error?, traceId?, data? }`
- 新增消息协议时，必须同步更新：
  - `prd/frontend-architecture-messaging.md`
  - 调用方（sidepanel/content）
  - `background.js` 处理器

## 5. UI/UX 实现规范

- 视觉规范唯一来源：`design/ui-design-spec.md`
- 风格决策基线：`design/style-decision-v1.md`
- 主题 token 文件：`sidepanel/src/styles/stylekit-theme-v1.css`
- 交互规范唯一来源：`design/ux-spec.md`
- Sidepanel 约束：
  - 宽度适配 `320–400px` 优先
  - 禁止横向滚动条
  - 卡片间距遵循 `8/12/16/20` 间距体系
- 样式实现：
  - 优先使用 CSS Variables + 统一 class
  - 禁止新增“临时 inline 样式”破坏主题一致性

## 6. 文档治理规范

- 变更功能时，至少更新：
  - `prd/World-Link-Alpha-PRD-overview.md`
  - `prd/TODO.md`
- UI 或交互变化时，必须同步 `design/` 规范
- 每次提交前运行：
  - `node scripts/check-docs-consistency.mjs`

## 7. 测试策略最小基线（新增）

### 7.1 冒烟场景最小集

每次涉及消息协议、存储写入、套餐门禁的改动，至少覆盖以下 3 类场景：

1. 实体保存链路
   - 网页采集 `SAVE_ENTITY` 成功写入
   - Sidepanel 编辑 `SAVE_ENTITY_FROM_SIDEPANEL` 成功写入
2. 导出授权门禁
   - Free 用户导出 JSON 被拒绝
   - Pro 用户导出 JSON 通过
3. 配额拒绝链路
   - 达到世界/书/实体/捕获阈值后收到明确拒绝与可读错误提示

### 7.2 执行与记录要求

- PR 描述必须包含“测试执行记录”（至少含命令、场景、结果）
- 若仅做文档改动，可标注“仅文档变更，无业务回归影响”
- 若存在未覆盖项，必须在 PR 中写明风险与补测计划

## 8. PR 自检清单（必须）

1. 是否引入了重复文档或历史口径冲突？
2. 是否新增了超过阈值的大文件未拆分？
3. 是否在 `TODO.md` 标注了完成项或新增待办？
4. 是否执行了文档一致性检查？
5. UI 是否通过 `320px` 宽度下的无横向滚动验证？
6. 是否补充了测试执行记录（命令、场景、结果）？

## 9. 请求层规范（新增）

### 9.1 前端 HTTP 层

- **类型要求**：全部使用 axios 官方类型与泛型，禁止 `any`
- **配置文件**：`sidepanel/src/lib/http/config.ts`，支持 `VITE_API_BASE_URL` 覆盖
- **拦截器**：统一添加 `x-request-id` 追踪头
- **认证过期处理**：使用 `setOnAuthExpired(callback)` 机制注入回调，不直接依赖 Chrome runtime
- **URL 约定**：路径无 `/v1` 前缀，由后端统一处理

### 9.2 后端 API 协议

- **统一响应结构**：
  ```typescript
  {
    success: boolean;
    data?: T;
    error?: {
      code: string;
      message: string;
      details?: Record<string, unknown>;
      fieldErrors?: Record<string, string>;
    };
    meta?: {
      requestId?: string;
      timestamp?: string;
    };
  }
  ```
- **错误对象**：必须统一为对象结构，禁止混用 string
- **请求追踪**：支持并透传 `x-request-id` 头
- **验证错误**：使用 `getFieldErrors()` 统一格式化，类型安全
- **验证工具使用**：所有 routes 必须使用 `getFieldErrors(errors.array())` 替代重复的 reduce 逻辑，保持验证错误处理的一致性

## 10. 仓库产物治理（新增）

- **构建产物**：
  - `backend/dist/`：后端编译输出，已加入 `.gitignore`
  - `sidepanel/dist/`：前端编译输出，已加入 `.gitignore`
- **构建脚本**：
  - 后端：`cd backend && npm run build`、`npm run typecheck`、`npm run lint`
  - 前端：`cd sidepanel && npm run build`、`npm run lint`、`npm test`
- **验收标准**：所有 lint/typecheck/build 脚本必须通过才能提交
- **临时文件**：`fix-validation.js` 等临时工具脚本仅本地使用，不提交

## 11. 下阶段拆分计划（建议）

1. `App.jsx` 仅保留路由式编排与回调绑定
2. 实体区动作回调继续收敛（减少 App 内联函数）
3. 组件层补齐无障碍与空态提示一致性
4. 统一移除 `App.jsx` 中剩余内联回调
5. 将 `npm run lint` 固化为提交流程门禁

## 12. 工程规范化升级（新增）

### 12.1 Lint 基线收敛（Phase 1）

- ESLint 配置：`backend/eslint.config.js`（flat config）、`sidepanel/.eslintrc.cjs`
- 规则设置：
  - `@typescript-eslint/no-explicit-any`：从 off 调整为 warn
  - `@typescript-eslint/no-unused-vars`：warn（忽略 _ 开头变量）
  - 保持向后兼容，不一次性拉满
- 当前基线：34 个警告，0 错误

### 12.2 Git 提交门禁（Phase 2）

- 使用 husky + lint-staged：
  - `npm install -D husky lint-staged`
  - `npx husky init`
  - `.husky/pre-commit`：运行 `npx lint-staged`
  - `package.json` 新增 lint-staged 配置，分前后端文件范围自动 lint
- 跳过紧急提交：`git commit --no-verify`（仅允许紧急修复）

### 12.3 共享类型收敛（Phase 3）

- 新增共享类型目录：`shared/types/`
- 首批迁移类型：`ApiResponse`、`SubscriptionStatus`、`SubscriptionPlanId`、`Entitlement` 等
- 跨端引用：
  - 前端：`import type { ApiResponse } from '../../../shared/types';`
  - 后端：`import type { ApiResponse } from '../../shared/types';`
- 约束：仅类型共享，避免引入复杂 monorepo 工具

### 12.4 Zod + TS 严格化（Phase 4）

- 关键路由落地 Zod 验证：`auth`、`worlds`
- schema 存放：`backend/src/schemas/`
- 验证工具：`getFieldErrors()` 支持通用验证错误格式
- **any 清理计划**：
  - 当前 any 分布：主要在 `aiService.ts` 等
  - 已清理：`auth.ts`、`captureService.ts`、`entityService.ts`、`entitlementService.ts`、`subscriptionLifecycleService.ts`、`store.ts`（非 Stripe 相关）
  - 优先级：先替换关键路由的 any，逐步收敛
  - 增量零容忍：新增代码禁止引入 any

## 13. 验收命令

```bash
# 后端
cd backend && npm run build
cd backend && npm run typecheck
cd backend && npm run lint

# 前端
cd sidepanel && npm run lint
cd sidepanel && npm run build
cd sidepanel && npm test
```
