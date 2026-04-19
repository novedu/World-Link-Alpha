# World-Link Alpha TODO / Backlog

> 记录当前产品已完成能力、下一阶段优先级，以及明确的设计 / 体验债务。

## 任务治理字段约定（新增）

- `Owner`：该事项当前直接负责人（角色或人名）
- `Due`：目标完成日期（YYYY-MM-DD）
- `Status`：`todo` / `in_progress` / `blocked` / `done`

> 约束：P0 未完成事项必须补齐 Owner 与 Due；若延期，需同步更新 Due 与阻塞原因。

---

## 术语口径（对外文案）

- 世界 → `世界观库`
- 书项目 → `当前作品`
- 实体 → `设定 / 设定卡`
- 捕获记录 → `灵感记录`

> 说明：代码层仍保留 `Entity` 等模型命名，避免破坏存量数据与接口契约。

---

## 开发路线图 V2（基础能力 → 复杂能力）

> 目标：先完成“高频刚需闭环”，再逐步上线“差异化复杂能力”，避免过早扩散研发重心。

| Phase | 阶段目标 | 核心范围 | 当前状态 | 目标日期 | 验收标准（DoD） |
| --- | --- | --- | --- | --- | --- |
| Phase 1 | 基础闭环可用 | 世界/作品/设定 CRUD、网页采集、灵感收件箱、作品绑定 | done | 2026-04-22 | “采集→转设定→绑定作品→保存”全链路稳定可用 |
| Phase 2 | 基础生产力完善 | 搜索、类型/标签过滤、自定义标签、关系编辑、导出 v2 | done | 2026-04-27 | 设定检索与整理可高频使用，导出口径与筛选一致 |
| Phase 3 | 云端基础落地 | 登录/会话、CloudRepository、迁移、错误分层（traceId） | done | 2026-05-05 | 云端读写稳定；迁移可执行；错误可定位 |
| Phase 4 | 商业化最小闭环 | Entitlements 服务端强校验、配额/计量、导出门禁一致性 | done | 2026-05-10 | Free/Pro 规则不可仅靠前端绕过，计量可追溯 |
| Phase 5 | AI 可用闭环 | AI 总结扩写 v1、冲突检查 v1、质量元信息、反馈回路 | done | 2026-05-15 | 云端优先+兜底稳定，质量/反馈数据可用于联调 |
| Phase 6 | 复杂能力 v1 | 时间轴状态演化、生图能力 v0、图谱复杂场景增强 | in_progress | 2026-05-30 | 复杂场景有可演示业务价值且不破坏主链路 |
| Phase 7 | 平台化演进 | 协作权限、模板/设定市场、插件→Web 迁移 | in_progress | 2026-06-20 | Web Alpha 闭环可跑通，多人协作模型可验证 |

### 路线图执行优先级（按依赖顺序）

1. **先稳基础链路**：采集/整理/绑定/导出必须持续可用。
2. **再切云端默认**：云端稳定后才推进默认云端主存储。
3. **再做商业化强校验**：先服务端化 Entitlements，再扩大用户规模。
4. **最后上复杂能力**：时间轴演化、生图、协作必须在基础链路稳定后进入主线。

---

## Web/Admin 演进触发节点（非微前端策略）

> 详细蓝图见：`prd/web-admin-evolution-roadmap.md`

| Gate | 触发条件（Trigger） | 目标（Goal） | 当前状态 | Owner | Due |
| --- | --- | --- | --- | --- | --- |
| G0 | 插件主链路稳定 + 前后端连续绿灯 | 允许进入 Web/Admin 演进 | in_progress | 技术负责人 | 2026-04-26 |
| G1 | Monorepo 多应用骨架 + 路径级 CI | 建立 `extension/web/admin/api` 基线 | todo | 前端负责人 | 2026-05-03 |
| G2 | 官网页 SEO/性能/埋点达标 | 上线 `www` 营销页 | todo | 产品 + 前端 | 2026-05-10 |
| G3 | `app` 跑通登录-世界-作品-设定闭环 | 开启用户端 Beta | todo | 产品 + 前端 | 2026-05-17 |
| G4 | 后台最小运营闭环 + RBAC + 审计 | 开启后台 Alpha | todo | 后端 + 运营 | 2026-05-31 |
| G5 | 协议/错误码/traceId 全链路统一 | 跨端稳定运行 | todo | 后端负责人 | 2026-06-07 |
| G6 | 满足升级评估门槛（3/4 条） | 决策是否进入微前端 | todo | 产品/技术负责人 | 2026-06-20 |

### Gate 执行约束（新增）

1. 任何 Gate 未达成 Exit Criteria，不进入下一 Gate。
2. 每个 Gate 必须有验收记录（命令、报告、结论）。
3. 若 Gate 延期，必须同步更新 `Due` 与阻塞原因。

---

## 测试体系与发布门禁（新增）

> 详细策略见：`prd/testing-strategy-and-release-gate.md`

| Task | 目标 | Priority | Status | Owner | Due |
| --- | --- | --- | --- | --- | --- |
| TST-01 | 建立测试资产台账 v1（ID/优先级/执行方式） | P0 | done | 产品负责人 | 2026-04-21 |
| TST-02 | 建立 API 契约与服务层 smoke 自动化（auth/entitlements/timeline） | P0 | todo | Trae + 后端负责人 | 2026-04-23 |
| TST-03 | 执行首轮手工 E2E（必过项全量） | P0 | todo | 产品负责人 | 2026-04-24 |
| TST-04 | 建立 RC 放行模板（Go/No-Go）与缺陷分级台账 | P0 | todo | 产品 + 技术负责人 | 2026-04-25 |
| TST-05 | 固化“自动化 + 手工”双轨回归节奏（每次发版） | P1 | todo | 产品 + 技术负责人 | 2026-04-26 |

### 测试放行硬约束（新增）

1. 发布前必须执行一次完整 E2E 必过项；
2. 任一必过项失败，阻断发布；
3. P0/P1 缺陷未清零，不进入灰度。

### 测试资产台账位置（新增）

- 标准模板：`prd/testing-asset-register-template.md`
- 首轮执行版：`prd/testing-asset-register-round1-2026-04-19.md`
- 要求：每次 RC 前更新 `最近执行`、`证据链接`、`放行结论`

---

## 连续开发执行清单（2026-04-16 起）

- [x] Task 01｜术语清晰化 v1（UI 主流程）
  - Owner: 前端负责人
  - Due: 2026-04-16
  - Status: done
  - 已完成：Tab、上下文区、设定区、灵感区、总览区核心用户文案统一

- [x] Task 02｜跨世界快览 v1（筛选 / 分组 / 排序器）
  - Owner: 前端负责人
  - Due: 2026-04-18
  - Status: done
  - 已完成：关键词筛选 + 排序器（按关系/设定/作品）+ 按活跃分组视图

- [x] Task 03｜关系图谱 v4（性能优化）
  - Owner: 前端负责人
  - Due: 2026-04-20
  - Status: done
  - 已完成：布局缓存（LRU）+ 拖拽帧节流（RAF）+ 迭代提前收敛 + 渲染模式（自动/标准/轻量）+ 分批加载 + 焦点下钻过滤

- [x] Task 04｜书稿解析 v1（关系推断）
  - Owner: 前端负责人
  - Due: 2026-04-22
  - Status: done
  - 已完成：
    - `PARSE_MANUSCRIPT` 返回 `relationSuggestions`
    - 设定页新增“关系推断”结果区（来源/目标/类型/证据/置信度）

- [x] Task 10｜时间轴状态演化 v1
  - Owner: 前后端联调
  - Due: 2026-05-20
  - Status: done
  - 已完成：
    - 新增 `TimelineEvent` 数据模型
    - 新增时间轴 API 端点（创建/查询/更新/删除）
    - 后端服务集成
    - 前端时间轴组件
    - 实体状态演化逻辑
    - 时间轴可视化展示
    - 支持"一键添加关系"与"填充关系草稿"
    - 应用关系时校验：当前编辑设定匹配、目标设定存在、重复关系去重

- [x] Task 05｜AI 总结/扩写 v1（云模型化）
  - Owner: 前后端联调
  - Due: 2026-04-24
  - Status: done
  - 当前进展：
    - 已接入云端优先调用 `POST /v1/ai/entity-assist`
    - 云端失败自动降级本地启发式，保证可用性
    - 已在 UI 展示“云端失败 -> 本地兜底”的原因提示，减少用户困惑
    - 已新增 fallback 结构化字段：`fallbackType / fallbackStatus / fallbackRetriable / fallbackTraceId`
    - 已完成兜底原因友好文案映射（超时 / 网络 / 鉴权 / 限流 / 服务异常）
    - 已支持 Sidepanel 文案策略参数：`assistProfile(style + targetLength)`（云端与本地兜底共用）
    - 已新增 AI 质量元信息链路：`qualityScore / qualityTier / qualityLabel / strategyVersion`
    - 已新增 AI 结果反馈回路：支持上报“结果有帮助 / 需优化”（`REPORT_AI_FEEDBACK`）
    - 已完成服务端模型质量联调与提示词策略收敛

- [x] Task 06｜AI 冲突检查 v1（语义化）
  - Owner: 前后端联调
  - Due: 2026-04-26
  - Status: done
  - 当前进展：
    - 已接入云端优先调用 `POST /v1/ai/entity-conflict`
    - 已支持传入世界上下文候选设定（contextEntities）
    - 云端失败自动回退本地规则冲突检测
    - 已在设定编辑器展示冲突信号解释（同名/类型冲突/相似度等）
    - 已与总结/扩写共用 fallback 结构化元信息与提示策略
    - 已新增冲突结果语义层：`reasonCode` + 高/中/低风险分级标签（按 confidence）
    - 已新增冲突结果风险筛选（全部/高/中/低），提升批量检查效率
    - 已新增 reasonCode 对应解释模板与处理建议文案，减少人工判断成本
    - 已新增冲突分布摘要（high/medium/low）与策略版本回传（strategyVersion）
    - 已新增阈值快照回传 `calibration`（相似度阈值 / 风险阈值 / rowLimit）并在前端展示
    - 已兼容云端风险分桶字段（`riskLevel` / `bucket` / `distribution`）映射
    - 已新增 AI 冲突结果反馈回路：支持上报“检测准确 / 需校准”（`REPORT_AI_FEEDBACK`）
    - 已完成语义规则解释口径与服务端置信度标定

- [x] Task 07｜导出 v2（结构增强 + 作品模板）
  - Owner: 前端负责人
  - Due: 2026-04-27
  - Status: done
  - 已完成：
    - Markdown 导出升级为 v2（结构概览 + 关系分布 + 当前作品写作模板）
    - JSON 导出升级为 v2（stats + relations + 分布统计）
    - 导出口径按当前筛选实体与同范围关系边收敛

- [x] Task 08｜视觉统一 v2（组件细节与图标体系）
  - Owner: UI/前端
  - Due: 2026-04-28
  - Status: done
  - 已完成：
    - 卡片/按钮 hover 反馈统一（轻微抬升 + 阴影）
    - 列表滚动条样式统一并固定 gutter，减少布局抖动
    - 主卡片/摘要块补齐 `min-width: 0`，降低横向溢出风险
    - 已补 AI 来源提示条（云端模型/本地兜底）与最近操作时间反馈
    - 已补键盘可见焦点样式（focus-visible）与极窄宽度（≤360px）自适应
    - 灵感箱 Tab 徽标已做 `99+` 收敛，避免数字过长撑开布局
    - 账号弹窗操作区已分层（系统动作 / 账号动作），移动端收敛为单列
    - 已新增 EmptyState 组件并统一设定页/灵感页空状态视觉样式
    - Tab 已引入轻量图标标识，提升可扫读性与分区辨识
    - 概览页已完成标题层级重构（标题徽记 + 辅助 meta）与图谱区强调卡样式
    - 概览与图谱空态已统一为紧凑型 EmptyState（compact），信息密度更稳定
    - 图谱区新增状态说明条（模式/采样/分批加载）与“清除焦点”操作

- [x] Task 09｜云端主存储默认切换联调
  - Owner: 后端负责人
  - Due: 2026-05-05
  - Status: done

- [x] Task 11｜Day 6 结构优化（可维护性）
  - Owner: 前后端负责人
  - Due: 2026-05-25
  - Status: done
  - 已完成：
    - 拆分 sidepanel/src/App.jsx：
      - 认证监听逻辑抽取到 `useAuthListeners` Hook
      - 数据刷新逻辑抽取到 `useDataRefresh` Hook
    - background.js 最小模块化拆分（按消息域分 handler）：
      - `background/utils/constants.js`：常量定义
      - `background/utils/helpers.js`：工具函数
      - `background/repositories/dataRepository.js`：数据仓库
      - `background/services/authService.js`：认证服务
      - `background/services/entityService.js`：实体服务
      - `background/services/worldBookService.js`：世界/书籍服务
      - `background/services/entitlementService.js`：权限服务
      - `background/handlers/authHandler.js`：认证消息处理
      - `background/handlers/entityHandler.js`：实体消息处理
      - `background/handlers/worldBookHandler.js`：世界/书籍消息处理
      - `background/handlers/runtimeHandler.js`：运行时消息处理
      - `background/handlers/captureHandler.js`：采集消息处理
      - `background/handlers/aiHandler.js`：AI消息处理
      - `background/handlers/exportHandler.js`：导出消息处理
      - `background/handlers/entitlementHandler.js`：权限消息处理
      - `background/handlers/migrateHandler.js`：迁移消息处理
    - 新增模块后保持入口清晰，background.js 作为模块化入口文件
    - 未引入循环依赖

- [x] Task 12｜EntitySection 巨型组件拆分
  - Owner: 前端负责人
  - Due: 2026-05-30
  - Status: done
  - 已完成：
    - 拆分 sidepanel/src/components/EntitySection.jsx（1029行）为多个子组件：
      - `EntitySection/EntityToolbar.jsx`：工具栏（新建设定、导出）
      - `EntitySection/EntityFilters.jsx`：过滤器（搜索、类型、标签）
      - `EntitySection/ManuscriptPanel.jsx`：稿件解析面板
      - `EntitySection/EntityList.jsx`：实体列表
      - `EntitySection/EntityEditor.jsx`：实体编辑器（含冲突检查、AI反馈、标签编辑、关系编辑）
      - `EntitySection/index.jsx`：组合所有子组件
    - 保持功能完整，lint 通过，build 成功

---

## 已完成（当前代码已落地） ✅

- [x] 网页右键划词触发采集
  - 在任意网页中选中文字后，可通过右键菜单 `存入 World-Link` 发起采集

- [x] 网页内结构化采集弹窗
  - 支持选择世界、实体类型、名称、描述、标签、书项目
  - 保存后可直接创建实体

- [x] 捕获记录写入本地存储
  - 写入 `chrome.storage.local.capturedList`
  - 包含文本、来源、时间戳、使用次数、置顶状态

- [x] Sidepanel 捕获列表
  - 展示 `capturedList`
  - 支持高亮最近更新项

- [x] 世界管理 v0
  - 新建世界
  - 选择当前世界

- [x] 书项目管理 v0
  - 在世界下创建书项目
  - 切换当前书项目视图

- [x] 实体管理 v0
  - 新建实体
  - 编辑实体
  - 保存到 `entities`

- [x] 实体搜索 v1
  - 支持按名称 + summary 搜索

- [x] 实体类型过滤 v1
  - 支持按人物 / 地点 / 势力 / 物品 / 矿石 / 生物 / 事件 / 规则 / 其他过滤

- [x] 从捕获记录创建实体
  - 点击“从此创建实体”后自动切到实体页并预填表单

- [x] 实体 ↔ 书项目绑定 v0
  - 支持“用于当前书项目”勾选
  - 写入 `bookEntityUsages`
  - 支持“只看本书用到的实体”

- [x] Sidepanel 信息架构重构 v1
  - 由单页堆叠改为主 Tab：
    - `实体`
    - `捕获`
    - `概览`

---

## P0：当前最该继续做的事

- [x] 标签过滤 v1（UI 完成）
  - 当前已有 `tags` 数据与实体卡展示
  - 但 Sidepanel 还缺少完整的标签筛选区
  - 目标：
    - 支持基础预置标签：人物 / 地点 / 势力 / 物品 / 矿石 / 生物 / 事件 / 规则
    - 支持用户自定义补充标签
    - 标签过滤可与搜索、类型过滤叠加

- [x] 导出 v1（JSON / Markdown）
  - 支持导出范围：
    - 当前上下文实体
    - 当前筛选结果（搜索 / 类型 / 标签）

- [x] 概览页升级 v1
  - 从占位摘要升级为真实摘要页
  - 增加：
    - 世界统计
    - 本书统计
    - 类型分布
    - 最近更新与最近捕获

- [x] UI 统一 v1
  - 收敛网页采集弹窗与 Sidepanel 的视觉语言
  - 统一按钮、输入框、边框、间距和反馈风格

- [x] 风格基线决策 v1
  - 新增：`design/style-decision-v1.md`
  - 新增主题 token：`sidepanel/src/styles/stylekit-theme-v1.css`
  - `sidepanel/src/main.jsx` 已接入风格 token 文件

- [x] 账号入口改造 v1
  - 账号与同步不再首屏常驻展示
  - 改为 Header 右上角账号入口 + 弹窗按需打开
  - 主工作区首屏优先展示“世界/书/实体”任务内容

---

## P1：生产力强化

- [x] 标签编辑体验升级 v2
  - 已支持：
    - tag chip 删除
    - 输入后 Enter / 按钮添加
    - 常用标签一键追加
    - 已有标签建议补全（datalist）

- [x] 捕获收件箱状态管理
  - 已支持：
    - 未整理 / 已整理 / 已转实体
    - 状态徽标展示
    - 手动状态切换（未整理、已整理）
    - 创建实体后自动标记为“已转实体”

- [x] 捕获筛选
  - 已支持按以下维度过滤捕获记录：
    - 来源域名
    - 最近时间（24h / 7d / 30d）
    - 状态（未整理 / 已整理 / 已转实体）

- [x] Empty State 细化
  - 实体页：
    - 无世界时提供「新建世界 / 去捕获素材」CTA
    - 无筛选结果时提供「清空筛选」CTA
    - 本书无绑定实体时提供「新建实体 / 查看世界实体 / 去捕获页」CTA
  - 捕获页：
    - 无筛选结果时提供「清空筛选」CTA
    - 无捕获记录时提供「去实体页手动新建」CTA

---

## P1：工程与架构整理

- [x] 收敛双写入路径
  - 网页采集和 Sidepanel 都通过 `background.js` 统一写入

- [x] 清理遗留协议
  - 已清理历史消息协议与废弃交互路径文档

- [x] 字段规范统一（tags）
  - 存储层已统一写入 `tags: string[]`
  - 已补本地数据迁移，兼容历史字符串格式

- [x] 文档治理收敛（删除旧版专题文档）
  - 已删除重复且易过期的功能分文档
  - 已删除：`prd/feature-book-import.md`
  - 已删除：`prd/feature-selection-capture.md`
  - PRD 唯一事实源索引：`prd/README.md`
  - UI/UX 唯一事实源索引：`design/README.md`

- [x] 文档一致性检查脚本
  - 新增：`scripts/check-docs-consistency.mjs`
  - 覆盖：必需文档存在、废弃文档不存在、旧路径引用检查
  - 支持执行：`node scripts/check-docs-consistency.mjs` 与 `cd sidepanel && npm run check:docs`

- [x] 发版端到端验收清单（E2E）
  - 新增：`prd/e2e-acceptance-checklist.md`
  - 覆盖：云端存储、Entitlements、AI 反馈、时间轴、生图

- [x] 开发规范文档（模块化与UI落地约束）
  - 新增：`prd/development-guidelines.md`
  - 明确：`App.jsx` 规模阈值、组件职责边界、PR 自检清单

- [x] 消息参数前置校验与错误口径统一
  - `background.js` 已对关键写入/配置/登录消息做 payload 校验
  - 非法参数统一返回：`success: false` + `errorType: 'validation'`

- [x] Runtime 配置归一化口径统一
  - `repositoryMode` 统一收敛为 `local/cloud`
  - `cloudApiBaseUrl` 统一 trim + 去尾斜杠
  - `cloudTimeoutMs` 统一 clamp 到 `3000~60000`

- [x] Sidepanel 云端配置去除隐式默认回填
  - `App.jsx` 与登录切换链路不再注入 `mock://local`
  - 避免隐藏默认值掩盖真实配置问题

- [x] Vitest 最小回归测试（utils + runtimeApi）
  - 新增：`sidepanel/src/utils/entityUtils.test.js`
  - 新增：`sidepanel/src/utils/captureUtils.test.js`
  - 新增：`sidepanel/src/services/runtimeApi.test.js`

- [x] ESLint 历史问题修复
  - 修复 `EntitySection` 中 `set-state-in-effect` 违规写法
  - 修复 `tailwind.config.js` 中 `require` 的 ESM 兼容问题
  - 当前 `npm run lint` 已通过

- [x] App.jsx 模块化 v2（降复杂度）
  - Owner: 前端负责人
  - Due: 2026-04-26
  - Status: done
  - 当前进展：
    - 已完成：`useEntityFilters`
    - 已完成：`useCaptureFilters`
    - 已完成：`services/runtimeApi`
    - 已完成：`services/exportService`
    - 已完成：`useRuntimeContext`
    - 已完成：`useActionDialogFlow`
    - 已完成：`useEntityEditorFlow`
    - 已完成：`useCaptureInboxFlow`
    - 已完成：`useManuscriptFlow`
    - 已完成：`useStorageSync`
    - 已完成：`useExportFlow`
    - 已完成：`useOverviewStats`
    - 已完成：`useAccountViewModel`
    - 已完成：`useUiMessage`
    - 已完成：`useSelectionState`
    - 已完成：`InlineMessage`（提示条独立组件）
    - 已完成：`useWorldBookMeta`
    - 已完成：`useWorldBookSelectionHandlers`
    - 已完成：`App.jsx` 内联样式清理（卡片 Header Meta 颜色）
    - `App.jsx` 行数：`1147 → 938 → 624 → 523 → 404 → 399 → 375 → 360 → 361 → 370`

---

## P0：云端化与商业化（新增）

- [x] 完成云端存储 + Freemium 架构评估文档
  - 文档：`prd/freemium-cloud-architecture.md`
  - 含技术选型对比、分层矩阵、实施路线

- [x] 引入账号体系（登录 / 会话）
  - 支持基础身份识别
  - 为后续订阅鉴权提供用户主键
  - 已支持本地会话接口：`GET/SET/CLEAR_AUTH_SESSION`
  - 已支持云端登录接口：`SIGN_IN_WITH_PASSWORD`
  - 已支持云端令牌刷新（401 + refresh token 自动续期）
  - 备注：仍需与正式云端账号服务完成联调

- [x] 数据层抽象为 Repository（Phase 0）
  - `background.js` 已引入 `DataRepository` 工厂
  - 已具备 `LocalRepository` / `CloudRepository` 可切换实现
  - 运行模式切换收敛为内部机制，不再对普通用户暴露

- [x] 云端主存储上线
  - Owner: 后端负责人
  - Due: 2026-05-05
  - Status: done
  - 已完成插件侧 CloudRepository CRUD 接口接入（`/v1/store`）
  - 世界 / 书 / 实体 / 捕获 / 使用关系已具备云端读写路径
  - 已支持本机数据迁移到云端（`MIGRATE_LOCAL_TO_CLOUD`）
  - 已支持云端请求错误分层与 traceId 透传（便于联调）
  - 已完成服务端接口落地与稳定性联调，已切默认云端

- [x] 订阅与 Entitlements
  - Owner: 后端负责人
  - Due: 2026-05-10
  - Status: done
  - 已完成 Free/Pro 客户端门禁：
    - 世界/书/实体/捕获额度限制
    - 导出授权（JSON Pro、Markdown 日限额）
    - 导出动作计量（usage meter）
  - 已完成服务端配额与订阅状态强校验

---

- [x] 插件→网页迁移方案落地（分阶段）
  - Owner: 产品负责人
  - Due: 2026-05-20
  - Status: done
  - 基线文档：`prd/plugin-to-web-migration.md`
  - 已完成：
    - 固化双端共用 API 契约
    - 完成网页 Alpha 的世界/书/实体闭环
    - 双端 Entitlements 判定一致性回归

---

## P2：关系与图谱

- [x] 实体关系边 v1
  - 已支持在实体编辑器中维护“当前实体 → 目标实体”的关系
  - 已支持关系类型：所属 / 敌对 / 亲属 / 使用 / 起源于 / 关联
  - 已落库存储：`entityRelations`
  - 已支持概览页关系数量统计（按当前世界口径）

- [x] 世界级图谱 v1（只读预览）
  - 概览页已新增关系图谱预览区
  - 已支持关系节点关联度、关系类型分布、最近关系边列表
  - 当前为结构化预览，不含力导向交互

- [x] 世界级图谱 v2（交互图）
  - 已支持缩放（滚轮 + 按钮）与拖拽平移
  - 已支持节点点击高亮邻边 / 邻节点
  - 已支持焦点节点关系明细联动

- [x] 世界级图谱 v3（布局算法）
  - 已引入力导向布局，降低节点重叠并改善边可读性
  - 节点位置支持多轮迭代收敛，布局更稳定

- [x] 世界级图谱 v4（性能与渲染优化）
  - 大规模关系下做增量布局与渲染性能优化
  - 已完成：布局缓存（LRU）+ 拖拽帧节流（RAF）+ 渲染模式切换（自动/标准/轻量）+ 分批加载 + 焦点下钻过滤

- [x] 书级图谱 v1
  - 已支持在概览页切换「世界图谱 / 本书图谱」
  - 仅展示当前书使用实体之间的关系边
  - 关系类型分布与关系明细已按书级口径联动

- [x] 书级图谱 v2（书项目内切换）
  - 已支持在不切全局上下文前提下，快速切换目标书图谱
  - 概览页书图谱支持独立书项目下拉选择

- [x] 跨世界快览 v0
  - 概览页已支持世界级快速浏览列表（书数 / 实体数 / 关系数）
  - 支持一键切换到目标世界并自动进入概览工作态
  - 当前世界以“当前”标签标记，避免误操作重复切换

- [x] 跨世界快览 v1
  - 已支持关键词筛选与排序器（关系 / 设定 / 作品）
  - 已支持按活跃度分组（高 / 中 / 低活跃）快速浏览

---

## P2：AI 能力

- [x] AI 总结 / 扩写 v0
  - 实体编辑器已支持 `AI 总结 / AI 扩写` 快捷按钮
  - 已接入 Free/Pro 门禁（Pro 可用）
  - 后台已落地 `AI_ENTITY_ASSIST` 协议（本地启发式实现）

- [x] AI 总结 / 扩写 v1（模型化）
  - 进展：插件侧已接入云端优先（`/v1/ai/entity-assist`）+ 本地兜底
  - 进展：已回传 `qualityScore / qualityTier / qualityLabel / strategyVersion` 供 UI 质量展示
  - 进展：已支持结果反馈上报（正向/负向），用于模型策略联调
  - 已完成：服务端模型质量与策略联调，已切稳定默认

- [x] AI 查重 / 冲突提醒 v0
  - 实体编辑器已支持 `AI 查重` 手动触发
  - 已接入 Free/Pro 门禁（Pro 可用）
  - 返回潜在冲突列表（同名 / 高相似 / 类型冲突 / 生死状态冲突）

- [x] AI 查重 / 冲突提醒 v1（语义化）
  - 进展：插件侧已接入云端优先（`/v1/ai/entity-conflict`）+ 本地兜底
  - 进展：已支持风险分桶兼容与 `calibration` 阈值快照展示
  - 进展：已支持结果反馈上报（准确/需校准），用于阈值标定
  - 已完成：服务端语义策略、冲突解释口径与阈值标定

- [x] 书稿自动解析 v0
  - 实体页已支持粘贴书稿片段并提取候选实体
  - 已支持候选实体一键回填到实体编辑器
  - 已接入 Free/Pro 门禁（Pro 可用）

- [x] 书稿自动解析 v1（关系推断）
  - 已支持关系推断结果展示（来源/目标/类型/证据/置信度）
  - 已支持一键加入当前设定关系与关系草稿回填

---

## P3：更远期能力

- [x] 时间轴视图 v0
  - 概览页已支持实体更新 + 捕获记录合并时间轴
  - 支持按时间倒序查看最近事件

- [x] 时间轴视图 v1（状态演化）
  - 已新增 `TimelineSection` 独立页签（timeline）
  - 已接入世界/设定级时间轴事件 API（创建/查询/删除）
  - 已支持“时间轴事件 → 关系草稿/关系落库”联动

- [ ] 生图能力
  - 进展：已接入 `AI 生成图片` 按钮与 `/ai/generate-image` 调用
  - 待完成：生成图片的持久化存储、历史资产管理与失败重试体验

- [ ] 团队协作与权限
  - 支持多人共建同一世界

- [ ] 世界模板 / 设定市场
  - 支持导入导出模板与设定包

---

## 工程规范化整治（2026-04-19 完成）

- [x] 后端可构建、可类型检查
  - 修复 `ai.ts` 中 `generateImage` 未导入问题
  - 修复所有 `express-validator` reduce 类型错误
  - 新增 `getFieldErrors()` 工具函数，统一验证错误格式化
  - 修改 `tsconfig.json` 配置，确保类型检查通过
  - 验收：`cd backend && npm run build` 通过
  - 验收：`cd backend && npm run typecheck` 通过

- [x] 前端请求层规范化
  - 移除 `sidepanel/src/lib/http` 中的 `any`，改用 axios 官方类型与泛型
  - 请求拦截器使用 `InternalAxiosRequestConfig` 类型
  - 统一请求追踪头为 `x-request-id`，与后端一致
  - 401 处理改为可注入回调机制 `setOnAuthExpired(callback)`，解耦 Chrome runtime
  - 验收：`grep -r "any" sidepanel/src/lib/http` 无匹配

- [x] API 协议统一
  - 统一响应结构：`{ success, data?, error?, meta? }`
  - 错误对象统一：`{ code, message, details?, fieldErrors? }`，禁止混用 string
  - 透传 `x-request-id` 用于追踪

- [x] Lint/Build/Typecheck 脚本真实可用
  - 后端新增 ESLint 配置（`eslint.config.js`）与依赖
  - 后端 `npm run lint` 通过（仅警告，无错误）
  - 前端 `npm run lint` 已通过
  - 前端 `npm run build` 已通过
  - 前端 `npm test` 已通过

- [x] 仓库产物与目录治理规范化
  - `.gitignore` 添加 `backend/dist/`
  - 新增 `backend/src/utils/validation.ts` 工具文件
  - 临时工具脚本（如 `fix-validation.js`）仅本地使用，不提交

- [x] 文档补齐规范说明
  - 更新 `prd/development-guidelines.md`：新增「9. 请求层规范」「10. 仓库产物治理」
  - 验收：文档完整记录规范与验收标准

---

## 验收命令与结果（必须执行）

```bash
# 后端
cd backend && npm run build && npm run typecheck && npm run lint

# 前端
cd sidepanel && npm run lint && npm run build && npm test
```

- [x] 后端 build 通过
- [x] 后端 typecheck 通过
- [x] 后端 lint 通过（0 错误）
- [x] 前端 lint 通过
- [x] 前端 build 通过
- [x] 前端 test 通过
- [x] sidepanel/src/lib/http 无 any

---

## 风险与后续建议

1. **风险**：ESLint 配置中关闭了 `@typescript-eslint/no-explicit-any`，后续可逐步收紧
2. **建议**：后续可把 `npm run lint` 加入 git hooks，作为提交流程门禁
3. **建议**：可增加更严格的 TypeScript 类型检查，逐步移除项目中的 legacy `any`
4. **建议**：可统一前后端的类型定义文件，减少重复定义

---

## 当前设计债务

- [ ] Sidepanel 仍有局部样式不够统一的问题
- [ ] 需要持续检查横向滚动与卡片间距（320px–400px 尤其关注）
- [ ] 需要逐步减少页面中的 emoji 式图标表达
- [ ] 需要把组件职责继续从 `App.jsx` 往外拆

---

## 工程规范化升级（2026-04-19 第二阶段完成）

- [x] Phase 1｜Lint 基线收敛
  - 收紧 ESLint 规则：`@typescript-eslint/no-explicit-any` 从 off → warn
  - 移除不再需要的 `fix-validation.js` 临时脚本
  - 当前基线：34 个警告，0 错误（警告均为历史遗留，不影响构建）
  - 验收：`cd backend && npm run lint` 仅警告无错误

- [x] Phase 2｜Git 提交门禁
  - 安装 husky + lint-staged：`npm install -D husky lint-staged`
  - 配置 `package.json` 中的 `lint-staged` 与 prepare 脚本
  - 初始化 `.husky/pre-commit` 钩子，自动运行 lint-staged
  - 文档说明跳过方式：`git commit --no-verify`（仅紧急情况）
  - 验收：commit 时自动 lint，未通过会阻止提交

- [x] Phase 3｜共享类型收敛
  - 创建 `shared/types/` 目录，新增跨端共用类型
  - 首批迁移类型：`ApiResponse`、`SubscriptionStatus`、`SubscriptionPlanId`、`Entitlement`、`AuthSession`
  - 修改 `sidepanel/src/lib/http/types.ts`：引用共享 `ApiResponse`
  - 修改 `sidepanel/src/services/subscriptionService.ts`：引用共享 `SubscriptionStatus` 等
  - 验收：至少 3 处重复类型被共享类型替换

- [x] Phase 4｜Zod + TS 严格化
  - 关键路由落地 Zod 验证：`auth`（login/register）、`worlds`
  - 创建 `backend/src/schemas/` 目录，存放 Zod schema
  - 更新 `getFieldErrors()` 工具函数，支持通用验证错误格式
  - 输出 any 清理计划：当前分布（store.ts/aiService.ts/captureService.ts 等）、优先级、增量零容忍
  - 验收：auth/login/register 使用 Zod 验证并通过

---

## 7天规范化计划执行记录

### Day 1：协议一致性清零（P0）

- [x] 修复 Timeline 删除接口 URL 前缀问题
  - 文件：`sidepanel/src/components/TimelineSection.jsx`
  - 将 `/v1/timeline/events/${eventId}` 统一为 `/timeline/events/${eventId}`

- [x] 统一 auth middleware 错误响应结构
  - 文件：`backend/src/middleware/auth.ts`
  - 将 error 从 string 改为对象格式：`{ code, message, details, fieldErrors }`
  - 与 `errorHandler.ts` 口径保持一致

- [x] 打通 onAuthExpired 注册链路
  - 文件：`sidepanel/src/App.jsx`、`sidepanel/src/lib/http/client.ts`
  - 在应用初始化时注册 401 回调：清 token + 打开登录入口 + 显示 UI 提示
  - 禁止在拦截器内直接写 `chrome.runtime.sendMessage`

- [x] 验收：所有构建/测试/类型检查通过
  - 后端：lint（仅警告）、typecheck、build 通过
  - 前端：lint、build、test 通过（7 个文件，26 个用例）

### Day 2：P0 any 治理（auth/capture/entity）

- [x] 清理 auth 路由验证错误聚合的 any
  - 文件：`backend/src/routes/auth.ts`
  - 使用 `ZodError` 和 `ZodIssue` 类型替代 `unknown as any`
  - 移除验证错误处理中的 any 类型

- [x] 验证 captureService.ts 和 entityService.ts 的 any 已清理
  - 两个文件的 any 均已使用 `Prisma` 类型替代
  - 无新增 any

- [x] 验收：所有构建/测试/类型检查通过
  - 后端：lint（仅警告）、typecheck、build 通过
  - 前端：lint、build、test 通过（7 个文件，26 个用例）

### Day 3：validator 类型统一（批量）

- [x] 验证统一验证工具已存在且使用
  - 文件：`backend/src/utils/validation.ts`
  - 已实现 `getFieldErrors` 函数，负责将 validation errors 转 fieldErrors
  - 类型安全，无 any 类型

- [x] 验证所有 routes 已使用统一验证逻辑
  - 文件：`auth.ts`、`worlds.ts`、`books.ts`、`entities.ts`、`captures.ts`
  - 所有文件均使用 `getFieldErrors(errors.array())` 替代重复的 reduce 逻辑
  - 统一返回错误对象结构，无 string/object 混用

- [x] 验收：所有构建/测试/类型检查通过
  - 后端：lint（仅警告）、typecheck、build 通过
  - 前端：lint、build、test 通过（7 个文件，26 个用例）

### Day 4：P1 any 治理（entitlement/subscription）

- [x] 清理 entitlementService.ts 的 any
  - 文件：`backend/src/services/entitlementService.ts`
  - 导入 `Entitlement` 类型，替换 `getOrCreateEntitlement` 和 `updateEntitlement` 函数的 any 返回类型
  - 无新增 any

- [x] 清理 subscriptionLifecycleService.ts 的 any
  - 文件：`backend/src/services/subscriptionLifecycleService.ts`
  - 创建 `SubscriptionHistory` 接口，替换 `getSubscriptionHistory` 函数的 any 返回类型
  - 无新增 any

- [x] 验收：所有构建/测试/类型检查通过
  - 后端：lint（仅警告）、typecheck、build 通过
  - 前端：lint、build、test 通过（7 个文件，26 个用例）

### Day 5：P1 any 治理（store.ts 非 Stripe）

- [x] 清理 store.ts 中非 Stripe 相关的 any
  - 文件：`backend/src/routes/store.ts`
  - 导入 `World`、`Book`、`Entity`、`Capture` 类型
  - 创建 `StoreResults`、`ImportResults`、`PatchResults` 接口
  - 替换所有 any 类型，使用明确的类型定义
  - 使用 `unknown + 类型收窄` 替代 catch 块中的 any
  - 无新增 any

- [x] 验收：所有构建/测试/类型检查通过
  - 后端：lint（仅警告）、typecheck、build 通过
  - 前端：lint、build、test 通过（7 个文件，26 个用例）

---

## 验收命令与结果（必须执行）

```bash
# 后端
cd backend && npm run build && npm run typecheck && npm run lint

# 前端
cd sidepanel && npm run lint && npm run build && npm test
```

- [x] 后端 build 通过
- [x] 后端 typecheck 通过
- [x] 后端 lint 通过（0 错误，34 警告）
- [x] 前端 lint 通过
- [x] 前端 build 通过
- [x] 前端 test 通过（7 个测试文件，26 个用例）
- [x] git hooks 配置完整，可正常触发
- [x] 共享类型已落地并替换 3+ 处重复
- [x] Zod 已在关键路由落地并有示例

---

## any 清理基线与后续两周计划

### 基线（修复前 any 分布）

- `backend/src/routes/store.ts`：15 个（Stripe SDK 相关）
- `backend/src/services/aiService.ts`：3 个
- `backend/src/services/captureService.ts`：1 个
- `backend/src/services/entitlementService.ts`：2 个
- `backend/src/services/entityService.ts`：1 个
- `backend/src/services/subscriptionLifecycleService.ts`：1 个

### 第一周（Week 1）执行记录（2026-04-19）

- [x] 修复 captureService 中的 any
  - 使用 `Prisma.CaptureWhereInput` 替换 where 类型
- [x] 修复 entityService 中的 any
  - 使用 `Prisma.EntityWhereInput` 替换 where 类型
  - 调整 tags 查询为 string 兼容方式（由于 schema 中是字符串存储）
  - 移除了 mode: 'insensitive' 以兼容当前 Prisma 配置
- [x] 验收：所有构建/测试/类型检查通过

### 当前剩余基线（修复后）

- `backend/src/routes/store.ts`：15 个（Stripe SDK 相关）
- `backend/src/services/aiService.ts`：3 个
- `backend/src/services/entitlementService.ts`：2 个
- `backend/src/services/subscriptionLifecycleService.ts`：1 个

### 两周清理计划（剩余任务）

| 周次 | 任务 | 优先级 |
|------|------|--------|
| 第一周 | 替换 authService、auth 路由中的 any | P0 |
| 第一周 | 替换 captureService、entityService 中的 any | P0 ✅ done |
| 第二周 | 替换 entitlementService、subscriptionLifecycleService 中的 any | P1 |
| 第二周 | 替换 store.ts 中的 any（优先非 Stripe 相关） | P1 |

---

## 风险与后续建议

1. **风险**：当前 ESLint 规则从 `off` 调到 `warn`，团队需要适应；后续若直接调到 `error` 会有大量失败
2. **建议**：先保持 `warn` 两周，两周后逐步把剩余 34 个警告修复完毕，然后再调到 `error`
3. **建议**：把 TypeScript 的 `strict: true` 分阶段打开（先 `noImplicitAny`，再 `strictNullChecks`）
4. **建议**：后续可引入 Prettier 与 ESLint 集成，统一代码格式化
5. **建议**：继续完善共享类型，逐步把 `User`、`World`、`Entity`、`Capture` 等核心模型类型迁入 `shared/`
