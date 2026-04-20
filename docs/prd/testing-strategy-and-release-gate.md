# 测试策略与发布门禁

- Owner: 产品 / 技术负责人
- Last Updated: 2026-04-21
- Status: active
- Scope: 定义 World-Link Alpha 的测试分层、角色分工、发布门禁与 Go/No-Go 机制

## 1. 测试目标

1. 主链路稳定：采集、整理、绑定、导出持续可用。
2. 商业化正确：Entitlements 与配额限制判定一致。
3. AI 可回退：云端失败时本地兜底可用且提示可理解。
4. 可追踪：关键失败可通过 `traceId` 快速定位。

## 2. 测试分层

| 层级 | 目标 | 典型范围 | 执行方式 | 频率 |
| --- | --- | --- | --- | --- |
| L1 单元测试 | 函数和工具逻辑正确 | utils、格式转换、过滤函数 | 自动化 | 每次提交 |
| L2 服务层 smoke | API 协议和关键服务可用 | auth、entitlements、timeline | 自动化 | 每日 + 发版前 |
| L3 手工 E2E | 真实用户路径可完成 | 采集、编辑、导出、升级、回退 | 手工 | 每次 RC |
| L4 回归抽检 | 历史高风险回归 | AI、图谱、时间轴、迁移 | 自动化 + 手工 | 每周 |

## 3. 角色分工

| 角色 | 主要职责 |
| --- | --- |
| 产品负责人 | 维护 E2E 必过项、做最终 Go/No-Go 判断 |
| 前端负责人 | 维护 UI 与消息层 smoke、修复回归缺陷 |
| 后端负责人 | 维护 API 合同、错误口径、traceId 追踪能力 |
| Trae（自动化协同） | 跑自动化 smoke 与回归基线并产出报告 |

## 4. 发布门禁（Release Gate）

### 4.1 必过项

1. 自动化 smoke 全绿（L1 + L2）。
2. 手工 E2E 必过项全绿（见 `docs/prd/e2e-acceptance-checklist.md`）。
3. P0/P1 缺陷清零。
4. 关键接口错误响应结构一致（含 `errorType` 与 `traceId`）。

### 4.2 阻断条件

1. 任一必过项失败。
2. 任一 P0 缺陷未修复。
3. 任一“订阅鉴权错误”缺陷未关闭。

## 5. RC 放行模板（Go/No-Go）

| 字段 | 说明 |
| --- | --- |
| RC 版本 | 本次候选版本号 |
| 执行日期 | YYYY-MM-DD |
| 自动化结果 | 通过 / 失败（附报告链接） |
| 手工 E2E 结果 | 通过 / 失败（附证据链接） |
| 阻断缺陷 | P0/P1 数量与状态 |
| 放行结论 | Go / No-Go |
| 负责人签字 | 产品 + 技术负责人 |

## 6. 文档联动

- 测试资产台账模板：`docs/prd/testing-asset-register-template.md`
- 首轮执行版：`docs/prd/testing-asset-register-round1-2026-04-19.md`
- E2E 清单：`docs/prd/e2e-acceptance-checklist.md`

每次 RC 前必须更新上述 3 份文档中的执行状态与证据链接。

## 7. 自动化执行参数（新增）

1. 后端 `AI 路由门禁` E2E 依赖本地监听端口，默认通过 `RUN_SOCKET_E2E=1` 启用。
2. 本地受限环境（无法监听端口）可不设置该变量，相关用例会标记为 `skip`。
3. CI / Release Gate 必须设置 `RUN_SOCKET_E2E=1`，保证路由级门禁在流水线中真实执行。

## 8. 覆盖率阈值策略（D4）

1. 前端 Sidepanel 在 `sidepanel/vitest.config.js` 启用覆盖率门禁（global thresholds）：
   - `statements >= 10`
   - `branches >= 10`
   - `functions >= 10`
   - `lines >= 10`
2. CI 的 `frontend` Job 使用 `npm --prefix sidepanel test -- --coverage`，未达到阈值直接失败。
3. 阈值收敛策略：以当前基线先“锁底线”，每两周按 `+5%` 递增，直至达到目标线（>= 50%）。
4. 后端当前阶段采用“关键链路 smoke + E2E 必过”作为主门禁，覆盖率数值门禁在下一阶段补齐。
