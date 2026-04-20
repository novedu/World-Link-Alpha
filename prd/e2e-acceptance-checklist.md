# E2E 发版验收清单

- Owner: 产品负责人
- Last Updated: 2026-04-19
- Status: active
- Scope: 发版前必须执行的端到端验收场景与通过标准

## 1. 执行规则

1. 每次 RC 必须完整执行本清单。
2. `Priority = P0` 任一失败，阻断发布。
3. 结果必须补证据链接（截图、日志、录屏或报告）。

## 2. 验收清单

| Case ID | Priority | Coverage | 场景 | 验收标准 | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-01 | P0 | 手工 | 网页划词采集 | 30 秒内完成“选中 → 右键 → 保存设定” | todo | 待补录屏 |
| E2E-02 | P0 | 自动化 + 手工 | 设定创建与作品绑定 | 设定创建成功，`BookEntityUsage` 正确写入 | in_progress | `backend/test/e2e-core-flow.test.ts` |
| E2E-03 | P0 | 手工 | 本书过滤准确性 | 选择当前作品后仅展示已绑定设定 | todo | 待补截图 |
| E2E-04 | P0 | 手工 | 灵感回填设定 | 从灵感箱一键回填，预填字段正确 | todo | 待补截图 |
| E2E-05 | P0 | 手工 | 云端同步 | 跨设备登录同账号后数据一致 | todo | 待补双端录屏 |
| E2E-06 | P0 | 自动化 + 手工 | Entitlements 门禁 | Free/Pro 下功能限制与配额判定一致 | in_progress | `backend/test/e2e-entitlement-guards.test.ts` |
| E2E-07 | P0 | 自动化 + 手工 | 导出门禁与计量 | 导出权限正确，`/exports/consume` 计量可追踪 | in_progress | `backend/test/e2e-entitlement-guards.test.ts` |
| E2E-08 | P1 | 手工 | AI 总结/扩写 | 云端可用，失败提示清晰、错误码可读 | todo | 待补日志与截图 |
| E2E-09 | P1 | 手工 | AI 冲突检查 | 风险分级、reasonCode、筛选行为正确 | todo | 待补截图 |
| E2E-10 | P1 | 手工 | 时间轴事件流 | 事件创建/删除可用，关系回填可用 | todo | 待补录屏 |
| E2E-11 | P2 | 手工 | 生图能力 v0 | 请求触发成功，失败可提示并可重试 | in_progress | 已完成代码闭环，待补录屏 |
| E2E-12 | P1 | 自动化 + 手工 | AI 套餐门禁 | Free 禁用 AI、Pro 开启 AI | in_progress | `backend/test/e2e-entitlement-guards.test.ts` |

## 3. 自动化快照（2026-04-19）

- 命令：`npm run verify`
- 结果：通过（`lint + typecheck + check:docs + test + build` 全绿）
- 覆盖说明：
  - 已自动化覆盖核心链路：`auth -> capture -> entity -> bind -> entitlement`
  - 已新增 `e2e-entitlement-guards`：覆盖 world 配额、导出计量门禁、Free/Pro AI 开关
  - AI 路由级门禁已覆盖；AI 冲突/时间轴/生图仍需补齐专项自动化 / 手工 E2E

## 4. 执行结论

- 本轮执行日期：2026-04-19（自动化快照）
- 当前结论：No-Go（P0 手工项未完成）
- 阻断项：
  1. E2E-01 / E2E-03 / E2E-05 尚未补齐手工证据
  2. AI 冲突、时间轴、生图仍缺专项回归报告
