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

## 3.2 Sidepanel 推荐目录

```text
sidepanel/src
├── components/     # 展示组件（尽量无副作用）
├── hooks/          # useXxx 状态与副作用封装
├── services/       # chrome.runtime / export / auth 调用
├── constants/      # 类型映射、标签枚举、消息类型
├── utils/          # 纯函数工具（parse/filter/format）
└── App.jsx         # 页面编排容器，不承担细节实现
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

## 9. 下阶段拆分计划（建议）

1. `App.jsx` 仅保留路由式编排与回调绑定
2. 实体区动作回调继续收敛（减少 App 内联函数）
3. 组件层补齐无障碍与空态提示一致性
4. 统一移除 `App.jsx` 中剩余内联回调
5. 将 `npm run lint` 固化为提交流程门禁
