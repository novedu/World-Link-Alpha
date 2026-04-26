# PRD 文档索引（唯一事实源）

> 本目录用于维护 World-Link Alpha 的“唯一事实源”产品文档，避免多份旧稿并存造成误导。自 `2026-04-21` 起，PRD 与设计文档统一收敛到 `docs/` 目录。

## 当前有效文档（Active）

- `docs/prd/World-Link-Alpha-PRD-overview.md`
  产品总览 PRD（范围、目标、对象模型、路线图、评分卡）
- `docs/prd/TODO.md`
  已完成 / 待开发 Backlog（按优先级持续维护）
- `docs/prd/freemium-cloud-architecture.md`
  云端化与免费 / 收费分层方案
- `docs/prd/competitive-analysis.md`
  竞品分析与产品定位（ReadAny/Cubox Pro 对比、评分、SWOT）
- `docs/prd/technical-guidelines.md`
  技术规范与开发指南（架构、模块化、消息协议、工程治理）
- `docs/prd/testing-strategy.md`
  测试策略与发布管理（分层测试、E2E 清单、发布门禁、测试台账）
- `docs/prd/evolution-roadmap.md`
  产品演进路线图（插件到 Web/Admin 的分阶段迁移、Gate 管理）
- `docs/prd/marketing-plan.md`
  市场推广计划（产品定位、场景示例、用户社区）
- `docs/prd/activation-event-dictionary.md`
  用户激活事件字典（用于北极星指标统计）

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
