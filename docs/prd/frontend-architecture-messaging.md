# 前端架构与消息交互（当前版本）

> 术语口径：本文保留技术命名（如 `Entity`），但用户界面文案统一为“设定 / 当前作品 / 灵感记录”。

## 1. 架构结论

World-Link Alpha 目前是 **双入口、单写入通道、Repository 抽象层**：

1. 网页入口：`content.js` 负责采集弹窗交互
2. Sidepanel 入口：`sidepanel/src/App.jsx` 负责管理视图
3. 写入通道：统一由 `background.js` 执行存储写入
4. 数据层：`DataRepository`（内部支持 `local/cloud`，用户侧不暴露）

这次重构后，Sidepanel 不再直接 `chrome.storage.local.set(...)`，而是走 background 消息 API，完成“双写入路径收敛”。

---

## 2. 组件职责

### `background.js`
- 右键菜单入口
- 打开网页采集弹窗
- 作为 `DataRepository` 网关（`LocalRepository` / `CloudRepository`）
- 运行时配置管理（`repositoryMode`、`cloudApiBaseUrl`、超时，主要用于内部环境）
- 登录与会话管理（本地会话 + 云端密码登录 + token 刷新）
- Entitlements 与配额门禁（Free/Pro）
- AI 能力路由（云端优先 + 本地兜底）：
  - `AI_ENTITY_ASSIST` → `/v1/ai/entity-assist`
  - `CHECK_ENTITY_CONFLICT` → `/v1/ai/entity-conflict`
  - `PARSE_MANUSCRIPT` → `/v1/ai/manuscript-parse`
  - `REPORT_AI_FEEDBACK` → `/v1/ai/feedback`
- 处理所有写入动作：
  - 创建世界
  - 创建书项目
  - 保存实体（网页采集）
  - 保存实体（Sidepanel 编辑）
  - 更新捕获状态（收件箱流转）
- 导出授权与使用计量（`REQUEST_EXPORT`）
- 写入：
  - `worlds`
  - `books`
  - `entities`
  - `bookEntityUsages`
  - `entityRelations`
  - `capturedList`

### `content.js`
- 接收 `OPEN_CAPTURE_PANEL`，渲染网页采集弹窗
- 采集表单校验与提交
- 通过 `SAVE_ENTITY` 提交到 background
- 页面级成功/错误 toast

### `sidepanel/src/App.jsx`
- 作为页面编排容器，组合各业务 hooks
- 维护全局上下文（世界 / 书）与主 Tab
- 维护实体/捕获/概览三大任务视图
- 在概览态计算 `worldQuickRows`（按关系/实体/书数量排序）并提供跨世界快速跳转动作
- 维护账号与套餐上下文（登录/退出、配额展示）
- 用户侧收敛为“登录即同步”，技术运行配置不直接暴露
- 所有写入通过 `services/runtimeApi.sendRuntimeMessage` 交给 background

### `sidepanel/src/constants/worldLink.js`
- 维护实体类型、标签、捕获状态等基础常量
- 作为 Sidepanel 与导出逻辑的统一字典源

### `sidepanel/src/utils/*`
- `entityUtils.parseTags`：标签标准化
- `captureUtils`：捕获状态/来源/时间过滤基础函数

### `sidepanel/src/hooks/*`
- `useEntityFilters`：世界/书上下文下的实体过滤、标签选项、分布统计
  - 关系维度扩展：
    - 当前上下文：`relationsInContext`、`relationCount`
    - 世界口径：`worldRelationRows`
    - 书项目口径：`bookRelationRows`
    - 书项目映射：`bookRelationRowsByBookId`
    - 图谱渲染：`relationGraphEdges`
- `useCaptureFilters`：捕获列表过滤与来源选项生成
- `useRuntimeContext`：账号会话、套餐同步、运行时配置与刷新动作
- `useActionDialogFlow`：创建世界/创建书/登录/迁移等弹窗流程
- `useEntityEditorFlow`：实体编辑器状态、字段更新、保存提交流程
  - AI 扩展：`AI_ENTITY_ASSIST` 调用、处理中状态、summary 回填
  - 冲突检测：`CHECK_ENTITY_CONFLICT` 调用、结果回填与提示展示
  - 质量联调反馈：`REPORT_AI_FEEDBACK` 上报“结果有帮助 / 需优化”与策略元信息
  - AI 元信息：记录最近操作来源（云端模型 / 本地兜底）、策略版本、质量标签与时间，用于编辑器内可视化反馈
  - 冲突联调元信息：记录 `conflictMeta + calibration + strategyVersion`，用于风险摘要与阈值快照展示
- `App.jsx`：实体页承接书稿解析 v1（粘贴文本、触发解析、候选设定回填 + 关系推断回填）
- `useCaptureInboxFlow`：捕获转实体与捕获状态流转
- `useManuscriptFlow`：书稿解析状态、关系推断结果、候选设定回填动作
- `useStorageSync`：storage 初始化加载、变更监听、捕获高亮提醒
- `useExportFlow`：导出鉴权、文件生成下载、导出后配额刷新
- `useOverviewStats`：概览统计卡片的数据组装
- `useAccountViewModel`：账号展示文案、套餐与配额展示字段收敛
- `useUiMessage`：全局提示消息显示/自动消失/关闭动作收敛
- `useSelectionState`：世界/书选择状态与切换动作收敛
- `useWorldBookMeta`：世界/书统计文案组装（Header 显示口径统一）
- `useWorldBookSelectionHandlers`：世界/书切换联动重置（编辑态与筛选态）收敛

### `sidepanel/src/components/*`
- `InlineMessage`：全局提示条渲染与关闭交互
- `EntitySection`：展示书稿解析关系推断结果，支持一键回填关系；展示 AI 来源、质量信息、阈值快照与最近操作时间
  - 支持 AI 结果反馈按钮（有帮助 / 需优化；检测准确 / 需校准）
- `EmptyStateCard`：统一空状态视觉与 CTA 按钮口径
  - 支持 `compact` 形态，用于概览与图谱区的高密度空态提示
- `RelationGraphPreviewCard`：概览页关系图谱交互预览（缩放/拖拽/节点高亮）
  - 支持世界图谱 / 本书图谱切换
  - 支持书图谱目标书下拉选择（不改全局上下文）
  - 内置力导向布局迭代，降低节点重叠
  - v4 进行中：布局缓存（LRU）+ 拖拽帧节流（RAF）+ 迭代提前收敛
  - 新增渲染模式（自动/标准/轻量），关系规模大时自动降级轻量渲染
  - 新增分批渲染控制（加载更多）与焦点关系方向过滤（全部/发出/指向）
- `WorldSummaryCard`：概览页聚合卡片
  - 跨世界快览 v1（世界摘要 + 搜索/排序/活跃分组 + 一键跳转）
  - 时间轴 v0（实体更新 + 捕获记录）

### `sidepanel/src/services/*`
- `runtimeApi`：消息发送、错误格式化、运行时上下文归一化
- `exportService`：导出文件命名、JSON/Markdown 生成与下载

---

## 3. 当前消息协议

## 3.1 Background → Content Script

### `OPEN_CAPTURE_PANEL`

```js
{
  type: 'OPEN_CAPTURE_PANEL',
  data: {
    selectedText: string,
    worlds: Array<World>,
    books: Array<Book>,
    lastUsedWorld: string,
    suggestedName: string,
    suggestedType: string,
    suggestedSummary: string,
    suggestedTags: string[]
  }
}
```

---

## 3.2 Content Script → Background

### `SAVE_ENTITY`（网页采集保存）

```js
{
  type: 'SAVE_ENTITY',
  data: {
    worldId: string,
    type: string,
    name: string,
    summary: string,
    tags: string[],
    sourceUrl: string,
    sourceTitle: string,
    selectedText: string,
    selectedBooks: string[]
  }
}
```

---

## 3.3 Sidepanel → Background

### `CREATE_WORLD`

```js
{
  type: 'CREATE_WORLD',
  data: { name: string }
}
```

### `CREATE_BOOK`

```js
{
  type: 'CREATE_BOOK',
  data: { worldId: string, title: string }
}
```

### `SAVE_ENTITY_FROM_SIDEPANEL`

```js
{
  type: 'SAVE_ENTITY_FROM_SIDEPANEL',
  data: {
    selectedBookId: string,
    entity: {
      id?: string,
      worldId: string,
      name: string,
      type: string,
      summary: string,
      tags: string[],
      relations?: Array<{
        id?: string,
        toEntityId: string,
        type: 'belongs_to' | 'hostile_to' | 'kinship' | 'uses' | 'originates_from' | 'related_to',
        note?: string
      }>,
      sourceUrl?: string,
      sourceTitle?: string,
      usedInCurrentBook?: boolean
    }
  }
}
```

### `AI_ENTITY_ASSIST`

```js
{
  type: 'AI_ENTITY_ASSIST',
  data: {
    mode: 'summarize' | 'expand',
    text: string,
    entityId?: string,
    worldId?: string,
    assistProfile?: {
      style?: 'concise' | 'balanced' | 'detailed',
      targetLength?: 'short' | 'medium' | 'long'
    }
  }
}
```

响应关键字段（当前实现）：

```js
{
  success: true,
  mode: 'summarize' | 'expand',
  text: string,
  provider: 'cloud-model' | 'local-fallback' | 'local-heuristic',
  model?: string,
  strategyVersion?: string,
  assistProfile?: {
    style: 'concise' | 'balanced' | 'detailed',
    targetLength: 'short' | 'medium' | 'long'
  },
  qualityScore?: number, // 0~1（支持后端传 0~100 自动归一）
  qualityTier?: 'high' | 'medium' | 'low',
  qualityLabel?: string,
  fallbackReason?: string,
  fallbackType?: string,
  fallbackStatus?: number,
  fallbackRetriable?: boolean,
  fallbackTraceId?: string
}
```

说明：
- 当前前端允许用户在 Sidepanel 选择“文案风格 + 长度策略”，并通过 `assistProfile` 下发。
- 云端不可用时，本地兜底也会按同一 `assistProfile` 生成，保证体验一致性。
- 前端可直接消费 `qualityScore/qualityTier/qualityLabel` 显示文案质量信息；若后端暂未返回，UI 自动降级为不展示。
- `strategyVersion` 用于标记当前云端提示词/策略版本，便于 A/B 或灰度联调排查。

### `CHECK_ENTITY_CONFLICT`

```js
{
  type: 'CHECK_ENTITY_CONFLICT',
  data: {
    worldId: string,
    draftEntity: {
      id?: string,
      name: string,
      type?: string,
      summary?: string
    }
  }
}
```

响应关键字段（当前实现）：

```js
{
  success: true,
  hasConflict: boolean,
  strategyVersion?: string,
  conflictMeta?: {
    total: number,
    high: number,
    medium: number,
    low: number
  },
  calibration?: {
    similarity: { name: number, summary: number },
    risk: { high: number, medium: number },
    rowLimit: number
  },
  conflicts: Array<{
    entityId: string,
    name: string,
    type: string,
    confidence: number, // 0~0.99
    reason: string,
    reasonCode?: 'exact_type_mismatch' | 'exact_name_duplicate' | 'life_status_conflict' | 'name_and_summary_similar' | 'name_similar' | 'summary_similar' | 'potential_conflict',
    signals?: {
      exactName: boolean,
      typeMismatch: boolean,
      lifeConflict: boolean,
      nameSimilarity: number,
      summarySimilarity: number
    }
  }>,
  provider: 'cloud-model' | 'local-fallback' | 'local-heuristic',
  fallbackReason?: string,
  fallbackType?: string,
  fallbackStatus?: number,
  fallbackRetriable?: boolean,
  fallbackTraceId?: string
}
```

说明：
- 前端可按 `confidence` 做高/中/低风险分层展示（当前实现：`>=0.9` 高风险，`>=0.75` 中风险，其他低风险）。
- `strategyVersion` 用于前后端联调时确认冲突策略版本，便于排查阈值差异。
- `conflictMeta` 提供风险分布统计，可直接用于“高/中/低风险”摘要展示。
- `calibration` 提供本次冲突策略阈值快照（名称/描述相似度、风险阈值、返回行数上限），用于前后端阈值联调可视化。
- 建议优先使用 `reasonCode` 渲染统一解释文案，`reason` 作为兼容兜底。
- 前端已基于 `reasonCode` 增加处理建议模板（如重命名、合并、核对时间线），用于缩短人工决策路径。

### `REPORT_AI_FEEDBACK`

```js
{
  type: 'REPORT_AI_FEEDBACK',
  data: {
    scope: 'assist' | 'conflict',
    decision: 'positive' | 'negative',
    provider?: string,
    model?: string,
    strategyVersion?: string,
    traceId?: string,
    worldId?: string,
    bookId?: string,
    entityId?: string,
    mode?: 'summarize' | 'expand',
    assistProfile?: {
      style?: 'concise' | 'balanced' | 'detailed',
      targetLength?: 'short' | 'medium' | 'long'
    },
    qualityScore?: number,
    qualityTier?: 'high' | 'medium' | 'low',
    qualityLabel?: string,
    conflictCount?: number,
    conflictMeta?: { total: number, high: number, medium: number, low: number },
    feedbackAt?: number
  }
}
```

响应关键字段（当前实现）：

```js
{
  success: true,
  recorded: boolean, // true=云端已记录；false=仅本地接收（云端不可用）
  scope: 'assist' | 'conflict',
  decision: 'positive' | 'negative',
  provider: 'cloud-model' | 'local-only' | 'local-fallback',
  ticketId?: string,
  message?: string,
  fallbackReason?: string,
  fallbackType?: string,
  fallbackStatus?: number,
  fallbackRetriable?: boolean,
  fallbackTraceId?: string
}
```

说明：
- 该协议用于 Task 05/06 的质量联调闭环：前端可直接上报“有帮助/需优化”。
- `recorded=false` 时不视为业务失败，UI 应提示“反馈已接收，云端稍后同步/重试”。

### `PARSE_MANUSCRIPT`

```js
{
  type: 'PARSE_MANUSCRIPT',
  data: {
    worldId: string,
    bookId?: string,
    text: string
  }
}
```

响应关键字段（当前实现）：

```js
{
  success: true,
  suggestions: Array<{
    name: string,
    type: string,
    summary: string,
    frequency: number,
    confidence: number,
    tags: string[]
  }>,
  relationSuggestions: Array<{
    fromName: string,
    toName: string,
    type: 'belongs_to' | 'hostile_to' | 'kinship' | 'uses' | 'originates_from' | 'related_to',
    confidence: number,
    count: number,
    evidence?: string
  }>,
  provider: 'cloud-model' | 'local-fallback' | 'local-heuristic',
  fallbackReason?: string,
  fallbackType?: string,
  fallbackStatus?: number,
  fallbackRetriable?: boolean,
  fallbackTraceId?: string
}
```

说明：
- 当 `provider = 'local-fallback'` 时，前端应优先使用 `fallbackType` 渲染友好提示文案（超时/网络/鉴权/限流/服务异常）。
- `fallbackReason` 仅作为兜底补充文本，不建议直接原样外显给用户。

### `UPDATE_CAPTURE_STATUS`

```js
{
  type: 'UPDATE_CAPTURE_STATUS',
  data: {
    text: string,
    timestamp?: number,
    status: 'inbox' | 'organized' | 'converted'
  }
}
```

### `GET_RUNTIME_CONTEXT`

```js
{
  type: 'GET_RUNTIME_CONTEXT'
}
```

### `GET_AUTH_SESSION`

```js
{
  type: 'GET_AUTH_SESSION'
}
```

### `SET_AUTH_SESSION`

```js
{
  type: 'SET_AUTH_SESSION',
  data: {
    email: string,
    plan?: 'free' | 'pro',
    userId?: string,
    provider?: string,
    accessToken?: string,
    refreshToken?: string,
    tokenType?: string,
    expiresAt?: number
  }
}
```

### `SIGN_IN_WITH_PASSWORD`

```js
{
  type: 'SIGN_IN_WITH_PASSWORD',
  data: {
    email: string,
    password: string
  }
}
```

### `CLEAR_AUTH_SESSION`

```js
{
  type: 'CLEAR_AUTH_SESSION'
}
```

### `GET_RUNTIME_CONFIG`

```js
{
  type: 'GET_RUNTIME_CONFIG'
}
```

### `SET_RUNTIME_CONFIG`

```js
{
  type: 'SET_RUNTIME_CONFIG',
  data: {
    repositoryMode?: 'local' | 'cloud',
    cloudApiBaseUrl?: string,
    cloudTimeoutMs?: number
  }
}
```

### `GET_ENTITLEMENTS` / `REFRESH_ENTITLEMENTS`

```js
{
  type: 'GET_ENTITLEMENTS' | 'REFRESH_ENTITLEMENTS'
}
```

### `REQUEST_EXPORT`

```js
{
  type: 'REQUEST_EXPORT',
  data: {
    format: 'markdown' | 'json'
  }
}
```

### `MIGRATE_LOCAL_TO_CLOUD`

```js
{
  type: 'MIGRATE_LOCAL_TO_CLOUD',
  data?: {
    strategy?: 'merge' | 'overwrite',
    clearLocalAfterImport?: boolean
  }
}
```

## 3.4 标准错误响应（新增）

当后台抛出云端请求错误时，统一返回：

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

> 说明：`traceId` 用于联调排障，Sidepanel 可在提示文案里透传。

## 3.6 运行配置归一化约束（新增）

`SET_RUNTIME_CONFIG`、`GET_RUNTIME_CONTEXT` 相关链路统一使用同一套归一化口径：

- `repositoryMode`：仅允许 `local | cloud`，其余值回退到可用模式
- `cloudApiBaseUrl`：统一 `trim` 并去除尾部斜杠
- `cloudTimeoutMs`：统一裁剪到 `3000 ~ 60000`（毫秒）

> 说明：Sidepanel 入口链路不再注入 `mock://local` 默认回填，避免隐藏配置问题。

---

## 3.7 服务端 API 契约最小集（新增）

### `POST /v1/auth/login`

- 认证要求：否（匿名可调用）
- 用途：账号密码登录，返回访问令牌与刷新令牌

成功响应（示例）：

```js
{
  success: true,
  data: {
    userId: string,
    email: string,
    plan: 'free' | 'pro',
    accessToken: string,
    refreshToken: string,
    tokenType: string,
    expiresAt: number
  }
}
```

失败响应（映射）：
- 401 → `errorType: 'auth'`
- 429 → `errorType: 'rate_limited'`
- 500+ → `errorType: 'server'`
- 网络超时/断连 → `errorType: 'timeout' | 'network'`

### `POST /v1/auth/refresh`

- 认证要求：是（需携带 refresh token）
- 用途：访问令牌续期

成功响应（示例）：

```js
{
  success: true,
  data: {
    accessToken: string,
    refreshToken?: string,
    tokenType: string,
    expiresAt: number
  }
}
```

失败响应（映射）：
- 401 → `errorType: 'auth'`（需重新登录）
- 429 → `errorType: 'rate_limited'`
- 500+ → `errorType: 'server'`
- 网络超时/断连 → `errorType: 'timeout' | 'network'`

### `POST /v1/store`

- 认证要求：是（access token）
- 用途：世界/书/实体/捕获/使用关系的统一读写

成功响应（示例）：

```js
{
  success: true,
  data: {
    worlds?: World[],
    books?: Book[],
    entities?: Entity[],
    capturedList?: CapturedItem[],
    bookEntityUsages?: BookEntityUsage[]
  }
}
```

失败响应（映射）：
- 401 → `errorType: 'auth'`
- 403 → `errorType: 'forbidden'`
- 422 → `errorType: 'validation'`
- 429 → `errorType: 'rate_limited'`
- 500+ → `errorType: 'server'`
- 网络超时/断连 → `errorType: 'timeout' | 'network'`

### `GET /v1/entitlements`

- 认证要求：是（access token）
- 用途：获取套餐能力与配额上限

成功响应（示例）：

```js
{
  success: true,
  data: {
    plan: 'free' | 'pro',
    source: string,
    updatedAt: number,
    features: Record<string, boolean>,
    limits: Record<string, number | null>
  }
}
```

失败响应（映射）：
- 401 → `errorType: 'auth'`
- 403 → `errorType: 'forbidden'`
- 429 → `errorType: 'rate_limited'`
- 500+ → `errorType: 'server'`
- 网络超时/断连 → `errorType: 'timeout' | 'network'`

---

## 4. 数据模型

```ts
type World = { id: string; name: string; description?: string; createdAt: number };
type Book = { id: string; worldId: string; title: string; description?: string; createdAt: number };
type Entity = {
  id: string;
  worldId: string;
  type: string;
  name: string;
  summary?: string;
  tags: string[];
  sourceUrl?: string;
  sourceTitle?: string;
  selectedText?: string;
  createdAt: number;
  updatedAt?: number;
};
type BookEntityUsage = { id: string; bookId: string; entityId: string; note?: string; createdAt: number };
type AuthSession = {
  userId: string;
  email: string;
  plan: 'free' | 'pro';
  provider?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number | null;
  createdAt: number;
  updatedAt: number;
};
type CapturedItem = {
  text: string;
  timestamp: number;
  sourceUrl?: string;
  sourceTitle?: string;
  count: number;
  isPinned: boolean;
  status?: 'inbox' | 'organized' | 'converted';
  statusUpdatedAt?: number;
  organizedAt?: number;
  convertedAt?: number;
};
type RuntimeConfig = {
  repositoryMode: 'local' | 'cloud';
  cloudApiBaseUrl: string;
  cloudTimeoutMs: number;
};
type Entitlements = {
  plan: 'free' | 'pro';
  source: string;
  updatedAt: number;
  features: {
    exportMarkdown: boolean;
    exportJson: boolean;
    aiSummary: boolean;
    conflictCheck: boolean;
    graphEditor: boolean;
  };
  limits: {
    maxWorlds: number | null;
    maxBooksPerWorld: number | null;
    maxEntities: number | null;
    maxCapturesPerDay: number | null;
    maxMarkdownExportsPerDay: number | null;
  };
};
type CloudDiagnostics = {
  lastRequest: {
    at: number;
    endpoint: string;
    method: string;
    traceId: string;
    requestId?: string;
    mode: string;
    status: number;
    durationMs: number;
    attempt: number;
  } | null;
  lastSuccess: {
    at: number;
    endpoint: string;
    method: string;
    traceId: string;
    requestId?: string;
    mode: string;
    status: number;
    durationMs: number;
    attempt: number;
  } | null;
  lastError: {
    at: number;
    name: string;
    message: string;
    status: number;
    type: string;
    code: string;
    retriable: boolean;
    requestId?: string;
    traceId: string;
    endpoint: string;
    method: string;
  } | null;
};
```

---

## 5. 当前状态与后续

### 已完成
- 删除历史废弃消息协议与对应文档描述
- Sidepanel 写入统一收敛到 background
- 保留 storage 监听驱动 UI 实时同步
- `background.js` 已落地 `CloudRepository`（`/v1/store`）与运行时切换
- 捕获收件箱状态流转（`inbox / organized / converted`）已接入消息协议
- 本地数据迁移已补齐（历史 `tags` 字段标准化为数组）
- 账号接口已接入（`GET/SET/CLEAR_AUTH_SESSION` + `SIGN_IN_WITH_PASSWORD`）
- 云端 401 自动 refresh token 续期已接入
- Free/Pro 门禁已接入（创建额度 + 导出权限 + 每日计量）
- 本机→云端数据迁移通道已接入（按钮触发 + 后台迁移消息）

### 下一步建议
1. 给消息协议补一层 `message type` 常量定义，避免魔法字符串
2. 与真实云端接口联调（`/v1/auth/*`、`/v1/store`、`/v1/entitlements`）
3. 增加最小化回归测试（至少覆盖实体保存、导出授权、配额拒绝）
4. 把订阅状态回写到 `entitlements`，实现服务端强校验
