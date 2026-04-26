# 技术规范与开发指南

- Owner: 产品 / 前端 / 后端联合维护
- Last Updated: 2026-04-27
- Status: active
- Scope: 架构设计、模块化约束、开发流程、工程治理

## 1. 架构设计

### 1.1 整体架构

World-Link Alpha 目前是 **双入口、单写入通道、Repository 抽象层**：

1. 网页入口：`content.js` 负责采集弹窗交互
2. Sidepanel 入口：`sidepanel/src/App.jsx` 负责管理视图
3. 写入通道：统一由 `background.js` 执行存储写入
4. 数据层：`DataRepository`（内部支持 `local/cloud`，用户侧不暴露）

### 1.2 组件职责

#### background.js
- 右键菜单入口
- 打开网页采集弹窗
- 作为 `DataRepository` 网关（`LocalRepository` / `CloudRepository`）
- 运行时配置管理
- 登录与会话管理
- Entitlements 与配额门禁
- AI 能力路由（云端优先 + 本地兜底）
- 处理所有写入动作

#### content.js
- 接收 `OPEN_CAPTURE_PANEL`，渲染网页采集弹窗
- 采集表单校验与提交
- 通过 `SAVE_ENTITY` 提交到 background
- 页面级成功/错误 toast

#### sidepanel/src/App.jsx
- 作为页面编排容器，组合各业务 hooks
- 维护全局上下文（世界 / 书）与主 Tab
- 所有写入通过 `services/runtimeApi.sendRuntimeMessage` 交给 background

## 2. 模块化硬约束

### 2.1 文件规模阈值

- 单文件组件 > `400` 行：必须拆分
- 单业务组件 > `250` 行：必须拆分子组件或 hooks
- 单函数 > `60` 行：优先拆成纯函数 + 组合调用
- background.js > `500` 行：必须按消息域拆分 handler

### 2.2 Sidepanel 推荐目录

```text
sidepanel/src
├── components/     # 展示组件（尽量无副作用）
├── hooks/          # useXxx 状态与副作用封装
├── services/       # chrome.runtime / export / auth 调用
├── constants/      # 类型映射、标签枚举、消息类型
├── utils/          # 纯函数工具（parse/filter/format）
└── App.jsx         # 页面编排容器，不承担细节实现
```

### 2.3 App 容器职责边界

`App.jsx` 仅保留：
1. 全局编排（世界/书上下文、主 tab）
2. 跨模块状态协调
3. 顶层弹窗开关与页面级提示

## 3. 消息协议规范

### 3.1 关键消息类型

- `OPEN_CAPTURE_PANEL`：打开网页采集弹窗
- `SAVE_ENTITY`：网页采集保存实体
- `CREATE_WORLD` / `CREATE_BOOK`：创建世界/书籍
- `SAVE_ENTITY_FROM_SIDEPANEL`：从 Sidepanel 保存实体
- `AI_ENTITY_ASSIST`：AI 实体辅助（总结/扩写）
- `CHECK_ENTITY_CONFLICT`：冲突检测
- `REPORT_AI_FEEDBACK`：AI 反馈上报
- `PARSE_MANUSCRIPT`：书稿解析

### 3.2 标准响应结构

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

### 3.3 标准错误响应

```js
{
  success: false,
  error: string,
  errorType?: 'timeout' | 'network' | 'auth' | 'forbidden' | 'rate_limited' | 'server' | 'validation' | 'unknown',
  errorCode?: string,
  status?: number,
  retriable?: boolean,
  traceId?: string
}
```

## 4. 请求层规范

### 4.1 前端 HTTP 层

- **类型要求**：全部使用 axios 官方类型与泛型，禁止 `any`
- **配置文件**：`sidepanel/src/lib/http/config.ts`
- **环境分层**：支持 `VITE_API_BASE_URL` 覆盖
- **拦截器**：统一添加 `x-request-id` 追踪头
- **认证过期处理**：使用 `setOnAuthExpired(callback)` 机制注入回调

### 4.2 后端 API 协议

- **统一响应结构**：见 3.2
- **错误对象**：必须统一为对象结构，禁止混用 string
- **请求追踪**：支持并透传 `x-request-id` 头
- **验证错误**：使用 `getFieldErrors()` 统一格式化

## 5. UI/UX 实现规范

- 视觉规范唯一来源：`docs/design/ui-design-spec.md`
- 主题 token 文件：`sidepanel/src/styles/stylekit-theme-v1.css`
- 交互规范唯一来源：`docs/design/ux-spec.md`
- Sidepanel 约束：
  - 宽度适配 `320–400px` 优先
  - 禁止横向滚动条
  - 卡片间距遵循 `8/12/16/20` 间距体系

## 6. 工程治理

### 6.1 测试策略最小基线

每次涉及消息协议、存储写入、套餐门禁的改动，至少覆盖以下 4 类场景：
1. 实体保存链路
2. 导出授权门禁
3. 配额拒绝链路
4. AI 套餐门禁链路

### 6.2 验收命令

```bash
# 一键验收（推荐）
npm run verify

# 后端
cd backend && npm run build
cd backend && npm run typecheck
cd backend && npm run lint

# 前端
cd sidepanel && npm run lint
cd sidepanel && npm run build
cd sidepanel && npm test
```

### 6.3 PR 自检清单

1. 是否引入了重复文档或历史口径冲突？
2. 是否新增了超过阈值的大文件未拆分？
3. 是否在 `TODO.md` 标注了完成项或新增待办？
4. 是否执行了文档一致性检查？
5. UI 是否通过 `320px` 宽度下的无横向滚动验证？
6. 是否补充了测试执行记录？

## 7. 非 Demo 化约束

1. **Sidepanel 真实数据源优先**
   - 世界/书/设定/关系/灵感的读写默认走后端 API
   - 禁止新增仅写 `chrome.storage.local` 且不走后端的业务主链路

2. **认证失败处理统一**
   - 401 不再静默回退本地业务数据
   - 必须给出可操作引导

3. **写后可见**
   - 所有关键写操作完成后必须触发数据重拉

4. **关系数据持久化**
   - 设定关系必须走服务端持久化

5. **AI 链路后端化**
   - 设定 AI 能力必须走 `/api/ai/*`

6. **配额校验服务端化**
   - 世界/作品/设定/灵感创建必须在服务层执行配额校验

7. **导出先计量后下载**
   - 导出操作必须先调用 `/api/entitlements/exports/consume`

## 8. 质量评分卡

### 8.1 评分维度（每项 >= 90）

| 维度 | 达标定义（90分） | 当前策略 |
| --- | --- | --- |
| 构建与发布可靠性 | `lint + typecheck + test + build` 全绿，且 CI 持续复现 | 根脚本 `verify` + GitHub Actions `verify.yml` |
| React 规范与可维护性 | 页面按 Tab/模块拆分，关键容器职责清晰，大文件持续压降 | `App.jsx` 已接入模块化拆分 |
| 类型与接口一致性 | 关键链路去 `any`、前后端响应结构统一、错误对象标准化 | routes validation + `getFieldErrors` |
| 架构清晰度 | 请求层单一、遗弃路径清零、容器/视图/算法边界明确 | 双写入路径收敛 |
| 工程治理与文档 | 文档与实现一致，验收证据可追踪，变更有回填 | `prd`/`design` 同步更新 + `check:docs` |

### 8.2 评分执行规则

1. 每次迭代结束必须回填"评分表 + 证据命令输出"
2. 任一维度 < 90：禁止标记"可上线（稳定版）"
3. 连续两次 >= 90 后，进入 95 分冲刺

## 9. 文档治理规范

- 变更功能时，至少更新：
  - `docs/prd/World-Link-Alpha-PRD-overview.md`
  - `docs/prd/TODO.md`
- UI 或交互变化时，必须同步 `docs/design/` 规范
- 每次提交前运行：`node scripts/check-docs-consistency.mjs`
