# 插件到网页形态迁移方案（World-Link Alpha）

- Owner: 产品 / 前端 / 后端联合维护
- Last Updated: 2026-04-16
- Status: active
- Scope: 定义从 Chrome 插件主形态升级到网页主形态的目标架构、阶段路线、风险与验收标准

---

## 1. 背景与目标

World-Link Alpha 当前以 Chrome 插件为主（网页划词采集 + Sidepanel 管理）。
后续目标是升级为网页主工作台，同时保留插件作为高频采集入口。

迁移原则：

1. 先保持插件持续可用，不做一次性重构；
2. 后端能力先统一，再扩展网页前端；
3. 数据模型与权限口径保持单一事实源；
4. AI 能力放在云端编排层，不在插件端做重逻辑。

---

## 2. 目标形态（End State）

## 2.1 产品形态分工

- 插件端：网页内容采集、轻量编辑、上下文快捷操作
- 网页端：完整资产管理、批量编辑、图谱与高级分析工作台
- 云端后端：身份、存储、授权、计量、智能编排统一入口

## 2.2 架构目标

```text
Chrome Content/Sidepanel
        ↓
   background.js
        ↓
    Cloud API
        ↓
DataRepository + Entitlements + Agent Orchestrator
        ↓
   Store / Auth / Billing / Logs

Web App
  ↓ same Cloud API ↓
```

关键点：插件与网页共享同一套 API、同一套数据模型、同一套授权策略。

---

## 3. 分阶段路线

## Phase 0（当前阶段，插件优先）

目标：稳定插件工作流，完成云端基础能力可用。

- 保持当前消息总线：Sidepanel/Content → background
- 持续使用统一写入通道（background 网关）
- 完成云端联调与 entitlements 强校验

交付门槛：
- `/v1/store`、`/v1/auth/*`、`/v1/entitlements` 稳定
- Free/Pro 门禁误判率可控

## Phase 1（后端先行，Web 复用基础）

目标：建立“插件与网页共用”的后端能力层。

- 抽象并冻结核心 API 契约（世界/书/实体/捕获/导出/授权）
- 增加审计与计量字段（traceId、requestId、usage）
- 新增智能接口（建议）`/v1/agent/draft-entity`

交付门槛：
- 插件端不改功能即可切换到稳定 API 版本
- API 文档与消息协议文档同步更新

## Phase 2（网页 Alpha）

目标：上线网页端基础管理能力，不替代插件采集。

- 提供网页登录与会话管理
- 实现网页端世界/书/实体/捕获读写
- 导出、搜索、过滤能力与插件保持口径一致

交付门槛：
- 网页端可独立完成“管理与编辑”闭环
- 与插件对同一账号的数据保持实时一致

## Phase 3（网页主工作台）

目标：网页成为主工作界面，插件聚焦采集入口。

- 图谱、冲突检查、批量操作优先在网页落地
- 插件端保留采集与轻编辑，不承载重型视图
- 统一运营入口（订阅、配额、升级引导）

交付门槛：
- 多端一致性稳定
- 网页端承担主要活跃编辑会话

---

## 4. 数据与权限一致性要求

1. 数据模型统一：`World` / `Book` / `Entity` / `CapturedItem` / `BookEntityUsage`
2. 写入规则统一：所有写入经过服务端鉴权与配额校验
3. 订阅与门禁统一：由服务端 entitlements 裁决，前端只做展示
4. 计量统一：导出、AI 调用、关键写入都要进入 usage logs

---

## 5. 与现有代码/文档的衔接

- 消息协议基线：`prd/frontend-architecture-messaging.md`
- 云端与商业化基线：`prd/freemium-cloud-architecture.md`
- 工程约束基线：`prd/development-guidelines.md`
- 总体产品边界：`prd/World-Link-Alpha-PRD-overview.md`

约定：本迁移文档只描述“阶段策略与架构方向”，具体功能变更仍回写总 PRD 与 TODO。

---

## 6. 关键风险与应对

1. 风险：插件与网页能力口径分叉
   - 应对：以服务端 API 契约为唯一事实源，双端共同消费

2. 风险：迁移期用户感知到行为不一致
   - 应对：先保证数据与授权一致，再迭代交互差异

3. 风险：AI 能力成本失控
   - 应对：Agent 能力统一走服务端计量与限流，不直连前端

4. 风险：历史本地数据迁移失败
   - 应对：保留迁移校验与重试机制，提供失败可见反馈

---

## 7. 验收清单（迁移阶段通用）

- [ ] 插件与网页访问同一账号时，核心对象读写一致
- [ ] Free/Pro 门禁在双端判定一致
- [ ] 关键动作均有 traceId 与可追踪日志
- [ ] 文档（PRD/TODO/消息协议）已同步更新
- [ ] `node scripts/check-docs-consistency.mjs` 通过

---

## 8. 接口清单附录（Web 首批必需 API）

> 目标：网页 Alpha 阶段与插件共享同一后端契约，避免双端口径分叉。

## 8.1 鉴权与会话

### `POST /v1/auth/login`
- 用途：邮箱密码登录
- 认证：无需 access token
- 请求体（示例）：`{ email, password }`
- 成功响应：`{ success: true, data: { userId, email, plan, accessToken, refreshToken, tokenType, expiresAt } }`

### `POST /v1/auth/refresh`
- 用途：刷新 access token
- 认证：refresh token（请求体或安全 Cookie，按服务端最终方案）
- 请求体（示例）：`{ refreshToken }`
- 成功响应：`{ success: true, data: { accessToken, refreshToken?, tokenType, expiresAt } }`

### `POST /v1/auth/logout`
- 用途：登出并使当前会话失效
- 认证：access token
- 成功响应：`{ success: true }`

## 8.2 用户上下文与授权

### `GET /v1/me`
- 用途：返回当前登录用户信息与基础资料
- 认证：access token
- 成功响应：`{ success: true, data: { userId, email, plan } }`

### `GET /v1/entitlements`
- 用途：返回功能开关与配额上限
- 认证：access token
- 成功响应：`{ success: true, data: { plan, source, updatedAt, features, limits } }`

## 8.3 核心业务数据

### `POST /v1/store`
- 用途：世界/书/实体/捕获/使用关系统一读写
- 认证：access token
- 说明：维持与插件端一致的存储网关语义，避免网页侧单独分叉实现
- 成功响应：`{ success: true, data: { worlds?, books?, entities?, capturedList?, bookEntityUsages? } }`

### `POST /v1/export`
- 用途：按筛选上下文导出数据（`markdown` / `json`）
- 认证：access token
- 请求体（示例）：`{ format, worldId, bookId?, filters? }`
- 成功响应：`{ success: true, data: { downloadUrl? | content?, usage } }`

## 8.4 智能能力（建议）

### `POST /v1/agent/draft-entity`
- 用途：根据捕获内容生成实体草案（类型/名称/摘要/标签）
- 认证：access token（并受 entitlements 与 usage 限制）
- 请求体（示例）：`{ worldId, selectedText, sourceUrl?, sourceTitle?, preferredType? }`
- 成功响应：`{ success: true, data: { draft: { type, name, summary, tags }, traceId } }`
- 约束：默认仅返回草案，不直接落库；最终保存仍走业务写入接口

## 8.5 统一错误响应（双端共用）

```json
{
  "success": false,
  "error": "string",
  "errorType": "timeout | network | auth | forbidden | rate_limited | server | validation | unknown",
  "errorCode": "string",
  "status": 401,
  "retriable": false,
  "traceId": "string"
}
```

错误映射基线：
- `401` → `auth`
- `403` → `forbidden`
- `422` → `validation`
- `429` → `rate_limited`
- `5xx` → `server`
- 网络异常/超时 → `network` / `timeout`

## 8.6 Web Alpha 接口验收口径

- [ ] 网页端登录后可完整拉取 `me + entitlements + store` 初始化数据
- [ ] 导出接口在 Free/Pro 下判定与插件一致
- [ ] `draft-entity` 在额度触顶时返回可读错误（含 `errorType` 与 `traceId`）
- [ ] 所有失败响应遵守统一错误结构，便于前端统一提示与埋点

