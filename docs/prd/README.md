# PRD 文档索引（唯一事实源）

> 本目录用于维护 World-Link Alpha 的“唯一事实源”产品文档，避免多份旧稿并存造成误导。自 `2026-04-21` 起，PRD 与设计文档统一收敛到 `docs/` 目录。

## 当前有效文档（Active）

- `docs/prd/World-Link-Alpha-PRD-overview.md`
  产品总览 PRD（范围、目标、对象模型、路线图、评分卡）
- `docs/prd/TODO.md`
  已完成 / 待开发 Backlog（按优先级持续维护）
- `docs/prd/frontend-architecture-messaging.md`
  前端消息协议与架构说明（以当前代码为准）
- `docs/prd/freemium-cloud-architecture.md`
  云端化与免费 / 收费分层方案
- `docs/prd/plugin-to-web-migration.md`
  插件升级到网页形态的分阶段迁移方案
- `docs/prd/web-admin-evolution-roadmap.md`
  Web/Admin 演进触发节点、Gate 门槛与回退策略
- `docs/prd/testing-strategy-and-release-gate.md`
  测试策略、分层职责与发布放行标准
- `docs/prd/e2e-acceptance-checklist.md`
  发版前端到端验收清单
- `docs/prd/testing-asset-register-template.md`
  测试资产台账模板
- `docs/prd/testing-asset-register-round1-2026-04-19.md`
  首轮测试资产台账执行版
- `docs/prd/score-90-execution-plan.md`
  90 分冲刺执行排期（W1-W3）与验收证据模板
- `docs/prd/score-90-w1-daily-plan.md`
  90 分冲刺 W1 日执行计划（D1-D7）与每日验收模板
- `docs/prd/score-90-w2-daily-plan.md`
  90 分冲刺 W2 日执行计划（D1-D7）与每日验收模板
- `docs/prd/score-90-w3-daily-plan.md`
  90 分冲刺 W3 日执行计划（D1-D7）与每日验收模板
- `docs/prd/score-90-weekly-review-template.md`
  90 分冲刺周复盘模板（W1-W3）
- `docs/prd/score-90-pre-scan-register-round1-2026-04-19.md`
  执行前扫描台账首轮执行版（先扫描后推进）
- `docs/prd/readany-overlap-analysis.md`
  ReadAny 重叠能力分析与差异化定位建议
- `docs/prd/development-guidelines.md`
  工程规范、模块边界与 PR 自检清单

## 历史文档（Deprecated）

- `docs/prd/subscription-product-strategy.md`
  已废弃。原文存在定价和能力假设，当前请以 `freemium-cloud-architecture.md` 与总 PRD 为准。

## 文档治理规则

1. 新增功能优先更新 `World-Link-Alpha-PRD-overview.md` 与 `TODO.md`。
2. 仅当存在长期独立价值时，才新增专题文档。
3. 专题内容若已并入总 PRD，原文档应标记 `deprecated` 或删除，避免双份口径。
4. UI/UX 规范以 `docs/design/` 目录最新文档为准，不在 `docs/prd/` 重复维护视觉细节。

## 文档元数据约定（建议）

为降低口径漂移，核心文档建议在顶部维护以下元数据：

- `Owner`：当前维护负责人（角色或人名）
- `Last Updated`：最后更新时间（YYYY-MM-DD）
- `Status`：`draft` / `active` / `deprecated`
- `Scope`：该文档负责回答的边界

## 发布记录维护位置

- 版本级变更口径：维护在 `docs/prd/World-Link-Alpha-PRD-overview.md`。
- 迭代执行与任务状态：维护在 `docs/prd/TODO.md`（按优先级与状态持续更新）。
- 若两者冲突，以总览 PRD 为准，并同步修正 TODO。

## 提交前检查

- 运行：`node scripts/check-docs-consistency.mjs`
