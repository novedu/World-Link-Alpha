# 前端架构与消息交互（当前版本）

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
  - `capturedList`

### `content.js`
- 接收 `OPEN_CAPTURE_PANEL`，渲染网页采集弹窗
- 采集表单校验与提交
- 通过 `SAVE_ENTITY` 提交到 background
- 页面级成功/错误 toast

### `sidepanel/src/App.jsx`
- 读取并监听 storage 变化
- 维护全局上下文（世界 / 书）
- 维护实体/捕获/概览三大任务视图
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
- `useCaptureFilters`：捕获列表过滤与来源选项生成

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
      sourceUrl?: string,
      sourceTitle?: string,
      usedInCurrentBook?: boolean
    }
  }
}
```

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

## 3.5 服务端 API 契约最小集（新增）

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
