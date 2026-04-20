# 测试资产台账（Round 1）

- Owner: 产品负责人
- Last Updated: 2026-04-19
- Status: active
- Scope: 首轮测试资产盘点与放行结论（对照模板执行）

## 1. 执行摘要

- 轮次：Round 1
- 时间：2026-04-19
- 自动化基线：部分通过（构建/单测已跑，API smoke 待补齐）
- 手工 E2E：待执行
- 当前放行结论：No-Go（仍有 P0 必过项未闭环）

## 2. 资产台账

| Case ID | 模块 | 场景 | Priority | 执行方式 | Blocking | Owner | 最近执行 | 结果 | Evidence | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1-001 | Core Flow | 采集→设定→绑定作品 | P0 | 手工 | yes | 产品负责人 | - | todo | - | 必过项 |
| R1-002 | Cloud | 跨设备同步一致性 | P0 | 手工 | yes | 后端负责人 | - | todo | - | 必过项 |
| R1-003 | Entitlements | Free/Pro 门禁正确性 | P0 | 手工 + 自动 | yes | 后端负责人 | - | todo | - | 必过项 |
| R1-004 | Export | 导出权限与计量 | P0 | 手工 + 自动 | yes | 前端负责人 | - | todo | - | 必过项 |
| R1-005 | AI Assist | 云端优先 + 本地兜底 | P1 | 手工 | no | 前端负责人 | - | todo | - | 需联调 |
| R1-006 | Conflict Check | 风险分级与建议文案 | P1 | 手工 | no | 前后端联调 | - | todo | - | 需标定 |
| R1-007 | Timeline | 事件维护与关系回填 | P1 | 手工 | no | 前端负责人 | - | todo | - | 复杂交互 |
| R1-008 | Image Gen v0 | 生图触发与失败重试 | P2 | 手工 | no | 前后端联调 | - | todo | - | 可延后 |

## 3. 阻断项

1. P0 手工 E2E 尚未完整执行。
2. API 契约 smoke 自动化待补齐。
3. RC 放行模板尚未完成首版落地。

## 4. 下一步

1. 按 `docs/prd/e2e-acceptance-checklist.md` 完成 P0 必过项并补证据。
2. 完成 `auth/entitlements/timeline` smoke 自动化。
3. 更新本台账为 Round 1 完整执行结论（Go / No-Go）。
