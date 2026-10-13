# World-Link Alpha

![License](https://img.shields.io/badge/license-MIT-blue)
![Chrome](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4)
![CI](https://img.shields.io/badge/CI-4%20workflows-success)

> ⚠️ **AI 实现说明（如实披露）** 见下方 [AI 实现说明](#ai-实现说明如实披露)：
> AI 辅助端点为**本地启发式实现**，非模型调用。

> 给虚构世界观创作者的浏览器采集与管理工具。
> 在网页上划词右键，把「矿石 / 势力 / 地名 / 历史事件」直接变成结构化实体，
> 并在 Sidepanel 里持续管理你的世界资产。

Chrome Extension（Manifest V3）+ 全栈后端。

---

## 要解决的问题

虚构世界观创作者（网文 / 游戏 / 剧本）在浏览网页、写书和整理设定时，长期面临三个连续问题：

1. **灵感来源分散** —— 看到「矿石 / 势力 / 地名 / 历史事件」时，很难即时结构化收集
2. **无法表达复用关系** —— 世界观会跨多本书复用，但传统笔记工具只有扁平文本，
   表达不了「世界级资产」和「某本书实际用到的资产」之间的区别
3. **规模上来后失效** —— 实体数量增长后，纯文本整理迅速失去检索效率和复用效率

## 核心设计

### 双入口采集

| 入口 | 职责 |
|---|---|
| `content.js` | 网页内划词采集弹窗，右键把选中文本直接转成结构化实体 |
| `background.js` | 右键菜单入口、采集路径与存储协调 |
| `sidepanel` | 世界资产的持续管理界面 |

### BookEntityUsage：把「世界资产」和「书籍视图」解耦

这是整个项目最关键的数据模型设计。

世界观跨书复用时，如果直接让实体挂在书下面，同一份设定就会被复制多次，最终无法维护。
所以这里引入了 `BookEntityUsage` 映射层：

- **世界（World）** 持有唯一的实体资产
- **书项目（Book Project）** 通过 `BookEntityUsage` 引用它实际用到的实体子集
- 选定书项目后，实体列表可切换到「仅本书使用」视图——**同一份世界设定，服务多本书，互不污染**

## 技术架构

```text
┌──────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)              │
│  ├─ content.js      网页内采集弹窗            │
│  ├─ background.js   右键入口 / 路径协调       │
│  └─ sidepanel       React + daisyUI 管理台    │
└───────────────────────┬──────────────────────┘
                        │  runtimeApi
┌───────────────────────▼──────────────────────┐
│  Backend   Express + Prisma                  │
│  routes / services / middleware / schemas     │
│  observability / config                      │
│  JWT 鉴权 · bcrypt · helmet · zod · winston   │
└───────────────────────┬──────────────────────┘
                        │
              Prisma（SQLite 默认，可切 PostgreSQL）
```

### 技术栈

| 层 | 技术 |
|---|---|
| 扩展 | Manifest V3、Content Script、Side Panel API、contextMenus、scripting |
| 前端 | React、daisyUI、axios |
| 后端 | Node.js、Express、Prisma |
| 安全 | JWT、bcrypt、helmet、express-validator、zod |
| 观测 | winston + 日志按日轮转 |
| 交付 | Docker Compose |

## 工程实践

工程治理是这个项目刻意练习的部分：

### 4 条 CI 流水线

| Workflow | 触发 | 用途 |
|---|---|---|
| `ci.yml` | push / PR | 主流水线 |
| `verify.yml` | push / PR | 提交校验 |
| `security.yml` | PR / 定时 | 安全扫描 |
| `release-gate.yml` | 手动 | 发布门禁 |

### 13 个测试文件，分层覆盖

- **后端**：`contract`（接口契约）、`functional`（功能）、`e2e-core-flow`（核心链路）、
  `e2e-entitlement-guards`（权益边界）
- **前端**：工具函数 `entityUtils` / `captureUtils` / `conflictUtils` / `aiUtils` / `assistUtils`、
  组件 `WorldSummaryCard` / `PrimaryTabBar`、服务 `exportService` / `runtimeApi`

### 30 篇文档

含 PRD、竞品分析、测试策略、发布门禁、技术规范、演进路线图、指标口径字典。

### 文档一致性检查

`scripts/check-docs-consistency.mjs` 接入 CI，防止文档描述和代码实现脱节——
这个问题在长期项目里非常常见，所以做成了流水线门禁。

## AI 实现说明（如实披露）

本项目含 AI 相关功能，但**不是 LLM 应用**。为避免误读，这里写清实现方式。

### 6 个 AI 相关端点

| 端点 | 作用 |
|---|---|
| `POST /ai/entity-assist` | 实体文本总结 / 扩写 |
| `POST /ai/entity-conflict` | 检测设定冲突 |
| `POST /ai/parse-manuscript` | 从正文中抽取实体与关系候选 |
| `POST /ai/semantic-search` | 语义检索 |
| `POST /ai/report-feedback` | 反馈上报 |
| `POST /ai/generate-image` | 实体配图生成 |

### 实现方式

- **前 5 个走本地启发式算法**（`backend/src/services/aiService.ts`）：
  停用词表过滤 + 词频统计 + 置信度打分，属于**规则与统计方法，不调用大模型**
- 前端 provider 字段的实际取值为 **`local-heuristic`**，UI 中会如实显示
- **只有 `generate-image` 调用外部服务**：ByteDance `neeko-copilot` 文生图接口
- 后端依赖中**没有任何 AI SDK**（无 OpenAI / Anthropic / LangChain 等），
  全仓库 `fetch(` 在 AI 服务内出现 **0 处**

### 边界

- 前端已预留 `cloud-model` provider 选项与模型选择 UI，**但后端未实现真实模型接入**
- 因此本项目定位为 **AI 辅助的产品化探索**，而非 LLM 应用

---

## 快速开始

### 后端

```bash
cd backend
npm install
npm run db:generate
npm run db:migrate
npm run dev              # tsx watch src/index.ts
```

### Sidepanel

```bash
cd sidepanel
npm install
npm run dev
```

### 加载扩展

Chrome → `chrome://extensions` → 打开「开发者模式」→「加载已解压的扩展程序」→ 选择仓库根目录。

## 常用命令

```bash
# 后端
npm run test              # contract + e2e
npm run test:e2e
npm run typecheck
npm run lint
npm run db:studio         # Prisma Studio

# Sidepanel
npm run test
npm run check:docs        # 文档一致性检查
npm run typecheck
```

## 文档索引

| 文档 | 内容 |
|---|---|
| [产品总览 PRD](docs/prd/World-Link-Alpha-PRD-overview.md) | 范围、目标、对象模型、路线图、评分卡 |
| [测试策略](docs/prd/testing-strategy.md) | 分层测试、E2E 清单、发布门禁、测试台账 |
| [技术规范](docs/prd/technical-guidelines.md) | 架构、模块化、消息协议、工程治理 |
| [竞品分析](docs/prd/competitive-analysis.md) | 产品定位与 SWOT |
| [演进路线图](docs/prd/evolution-roadmap.md) | 插件 → Web/Admin 的分阶段迁移 |
| [免费/收费分层架构](docs/prd/freemium-cloud-architecture.md) | 云端化与权益分层方案 |
| [激活事件字典](docs/prd/activation-event-dictionary.md) | 北极星指标埋点口径 |

## 当前状态

Alpha 阶段。核心采集与管理链路已打通，工程治理（CI、测试、文档门禁）已建立。
最后更新：2026-04。

## 许可证

MIT
