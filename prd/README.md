# PRD 文档索引（唯一事实源）

> 本目录用于维护 World-Link Alpha 的“唯一事实源”产品文档，避免多份旧稿并存造成误导。

## 当前有效文档（Active）

- `prd/World-Link-Alpha-PRD-overview.md`  
  产品总览 PRD（范围、目标、数据模型、里程碑）
- `prd/TODO.md`  
  已完成/待开发 Backlog（按优先级持续维护）
- `prd/frontend-architecture-messaging.md`  
  前端消息协议与架构说明（以当前代码为准）
- `prd/freemium-cloud-architecture.md`  
  云端化与免费/收费分层方案
- `prd/development-guidelines.md`  
  前端工程规范、模块化边界与 PR 自检清单
- `prd/plugin-to-web-migration.md`  
  插件形态升级到网页形态的分阶段迁移方案（架构、风险、验收）
- `prd/web-admin-evolution-roadmap.md`
  Web/后台管理演进蓝图（非微前端策略、触发节点、阶段目标与验收门槛）
- `prd/e2e-acceptance-checklist.md`
  发版前端到端验收清单（云端/套餐/AI/时间轴/生图）
- `prd/testing-strategy-and-release-gate.md`
  测试策略与发布门禁（你 + Trae 协同分工、测试分层、Go/No-Go 标准）
- `prd/testing-asset-register-template.md`
  测试资产台账模板（Case ID、优先级、执行方式、阻断发布字段）
- `prd/testing-asset-register-round1-2026-04-19.md`
  首轮测试资产台账执行版（自动化基线结果、手工 E2E 待执行项、当前放行结论）
- `prd/readany-overlap-analysis.md`
  ReadAny 能力重叠分析与差异化定位建议

## 文档治理规则

1. 新增功能优先更新 `World-Link-Alpha-PRD-overview.md` 与 `TODO.md`。  
2. 仅当存在长期独立价值时，才新增专题文档。  
3. 专题内容若已并入总 PRD，原文档应立即删除，避免双份口径。  
4. UI/UX 规范以 `design/` 目录最新文档为准，不在 `prd/` 重复维护视觉细节。  

## 文档元数据约定（建议）

为降低口径漂移，核心文档建议在顶部维护以下元数据：

- `Owner`：当前维护负责人（角色或人名）
- `Last Updated`：最后更新时间（YYYY-MM-DD）
- `Status`：`draft` / `active` / `deprecated`
- `Scope`：该文档负责回答的边界

## 发布记录维护位置

- 版本级变更口径：维护在 `prd/World-Link-Alpha-PRD-overview.md` 的版本记录章节。  
- 迭代执行与任务状态：维护在 `prd/TODO.md`（按优先级与状态持续更新）。  
- 若两者冲突，以总览 PRD 的版本记录为准，并同步修正 TODO。

## 提交前检查

- 运行：`node scripts/check-docs-consistency.mjs`
