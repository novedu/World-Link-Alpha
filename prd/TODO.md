# World-Link Alpha TODO / Backlog

> 记录当前产品已完成能力、下一阶段优先级，以及明确的设计 / 体验债务。

## 任务治理字段约定（新增）

- `Owner`：该事项当前直接负责人（角色或人名）
- `Due`：目标完成日期（YYYY-MM-DD）
- `Status`：`todo` / `in_progress` / `blocked` / `done`

> 约束：P0 未完成事项必须补齐 Owner 与 Due；若延期，需同步更新 Due 与阻塞原因。

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

- [ ] Empty State 细化
  - 不同场景下给出更明确的下一步建议

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

- [x] 开发规范文档（模块化与UI落地约束）
  - 新增：`prd/development-guidelines.md`
  - 明确：`App.jsx` 规模阈值、组件职责边界、PR 自检清单

- [ ] App.jsx 模块化 v2（降复杂度）
  - Owner: 前端负责人
  - Due: 2026-04-26
  - Status: in_progress
  - 当前进展：
    - 已完成：`useEntityFilters`
    - 已完成：`useCaptureFilters`
    - 已完成：`services/runtimeApi`
    - 已完成：`services/exportService`
    - `App.jsx` 行数：`1147 → 938`
  - 待完成：
    - `useRuntimeContext`（账号/套餐/同步上下文）
    - `useActionDialogFlow`（创建世界/创建书/登录/迁移动作）

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

- [ ] 云端主存储上线
  - Owner: 后端负责人
  - Due: 2026-05-05
  - Status: todo
  - 已完成插件侧 CloudRepository CRUD 接口接入（`/v1/store`）
  - 世界 / 书 / 实体 / 捕获 / 使用关系已具备云端读写路径
  - 已支持本机数据迁移到云端（`MIGRATE_LOCAL_TO_CLOUD`）
  - 已支持云端请求错误分层与 traceId 透传（便于联调）
  - 待完成：服务端接口落地与稳定性联调后再切默认云端

- [ ] 订阅与 Entitlements
  - Owner: 后端负责人
  - Due: 2026-05-10
  - Status: todo
  - 已完成 Free/Pro 客户端门禁：
    - 世界/书/实体/捕获额度限制
    - 导出授权（JSON Pro、Markdown 日限额）
    - 导出动作计量（usage meter）
  - 待完成：服务端配额与订阅状态强校验

---

- [ ] 插件→网页迁移方案落地（分阶段）
  - Owner: 产品负责人
  - Due: 2026-05-20
  - Status: todo
  - 基线文档：`prd/plugin-to-web-migration.md`
  - 待完成：
    - 固化双端共用 API 契约
    - 完成网页 Alpha 的世界/书/实体闭环
    - 双端 Entitlements 判定一致性回归

---

## P2：关系与图谱

- [ ] 实体关系边 v1
  - 支持建立实体之间的关系
  - 如：
    - 所属
    - 敌对
    - 亲属
    - 使用
    - 起源于

- [ ] 世界级图谱 v1
  - 展示当前世界的实体关系网络

- [ ] 书级图谱 v1
  - 仅展示当前书使用的实体及其关系

---

## P2：AI 能力

- [ ] AI 总结 / 扩写
  - 对捕获内容或实体描述进行摘要与扩写

- [ ] AI 查重 / 冲突提醒
  - 对新设定和旧设定做语义冲突检测

- [ ] 书稿自动解析
  - 在用户授权前提下，从书稿中识别实体与书级使用关系

---

## P3：更远期能力

- [ ] 时间轴视图
  - 人物 / 势力状态变化

- [ ] 生图能力
  - 为人物 / 地点 / 物品生成代表图

- [ ] 团队协作与权限
  - 支持多人共建同一世界

- [ ] 世界模板 / 设定市场
  - 支持导入导出模板与设定包

---

## 当前设计债务

- [ ] Sidepanel 仍有局部样式不够统一的问题
- [ ] 需要持续检查横向滚动与卡片间距
- [ ] 需要逐步减少页面中的 emoji 式图标表达
- [ ] 需要把组件职责继续从 `App.jsx` 往外拆
