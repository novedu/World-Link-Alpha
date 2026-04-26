# 测试策略与发布管理

- Owner: 产品 / 技术负责人
- Last Updated: 2026-04-27
- Status: active
- Scope: 测试分层、E2E 验收、发布门禁、测试资产台账

## 1. 测试策略

### 1.1 测试目标

1. 主链路稳定：采集、整理、绑定、导出持续可用
2. 商业化正确：Entitlements 与配额限制判定一致
3. AI 可回退：云端失败时本地兜底可用且提示可理解
4. 可追踪：关键失败可通过 `traceId` 快速定位

### 1.2 测试分层

| 层级 | 目标 | 典型范围 | 执行方式 | 频率 |
| --- | --- | --- | --- | --- |
| L1 单元测试 | 函数和工具逻辑正确 | utils、格式转换、过滤函数 | 自动化 | 每次提交 |
| L2 服务层 smoke | API 协议和关键服务可用 | auth、entitlements、timeline | 自动化 | 每日 + 发版前 |
| L3 手工 E2E | 真实用户路径可完成 | 采集、编辑、导出、升级、回退 | 手工 | 每次 RC |
| L4 回归抽检 | 历史高风险回归 | AI、图谱、时间轴、迁移 | 自动化 + 手工 | 每周 |

### 1.3 角色分工

| 角色 | 主要职责 |
| --- | --- |
| 产品负责人 | 维护 E2E 必过项、做最终 Go/No-Go 判断 |
| 前端负责人 | 维护 UI 与消息层 smoke、修复回归缺陷 |
| 后端负责人 | 维护 API 合同、错误口径、traceId 追踪能力 |
| Trae（自动化协同） | 跑自动化 smoke 与回归基线并产出报告 |

### 1.4 覆盖率阈值策略

1. 前端 Sidepanel 在 `sidepanel/vitest.config.js` 启用覆盖率门禁：
   - `statements >= 10`
   - `branches >= 10`
   - `functions >= 10`
   - `lines >= 10`
2. CI 的 `frontend` Job 使用 `npm --prefix sidepanel test -- --coverage`，未达到阈值直接失败
3. 阈值收敛策略：以当前基线先"锁底线"，每两周按 `+5%` 递增，直至达到目标线（>= 50%）
4. 后端当前阶段采用"关键链路 smoke + E2E 必过"作为主门禁，覆盖率数值门禁在下一阶段补齐

## 2. E2E 发版验收清单

### 2.1 执行规则

1. 每次 RC 必须完整执行本清单
2. `Priority = P0` 任一失败，阻断发布
3. 结果必须补证据链接（截图、日志、录屏或报告）

### 2.2 验收清单

| Case ID | Priority | Coverage | 场景 | 验收标准 | Status | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| E2E-01 | P0 | 手工 | 网页划词采集 | 30 秒内完成"选中 → 右键 → 保存设定" | todo | 待补录屏 |
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

### 2.3 自动化快照（2026-04-21）

- 命令：`npm run verify`
- 结果：通过（`lint + typecheck + check:docs + test + build` 全绿）
- 覆盖说明：
  - 已自动化覆盖核心链路：`auth -> capture -> entity -> bind -> entitlement`
  - 已新增 `e2e-entitlement-guards`：覆盖 world 配额、导出计量门禁、Free/Pro AI 开关
  - AI 路由级门禁需要端口监听能力；本地受限环境可 `skip`，CI 通过 `RUN_SOCKET_E2E=1` 强制执行
  - AI 冲突/时间轴/生图仍需补齐专项自动化 / 手工 E2E

## 3. 发布门禁

### 3.1 必过项

1. 自动化 smoke 全绿（L1 + L2）
2. 手工 E2E 必过项全绿（见 E2E 验收清单）
3. P0/P1 缺陷清零
4. 关键接口错误响应结构一致（含 `errorType` 与 `traceId`）

### 3.2 阻断条件

1. 任一必过项失败
2. 任一 P0 缺陷未修复
3. 任一"订阅鉴权错误"缺陷未关闭

### 3.3 RC 放行模板（Go/No-Go）

| 字段 | 说明 |
| --- | --- |
| RC 版本 | 本次候选版本号 |
| 执行日期 | YYYY-MM-DD |
| 自动化结果 | 通过 / 失败（附报告链接） |
| 手工 E2E 结果 | 通过 / 失败（附证据链接） |
| 阻断缺陷 | P0/P1 数量与状态 |
| 放行结论 | Go / No-Go |
| 负责人签字 | 产品 + 技术负责人 |

## 4. 测试资产台账

### 4.1 使用说明

1. 每条 Case 必须有唯一 `Case ID`
2. `Priority` 仅允许 `P0/P1/P2`
3. `Blocking` 为 `yes` 的 Case 失败时必须阻断发布
4. `Evidence` 必须填写可访问证据路径

### 4.2 台账模板

| Case ID | 模块 | 场景 | Priority | 执行方式（自动/手工） | Blocking（yes/no） | Owner | 最近执行 | 结果（pass/fail） | Evidence | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TPL-001 | 示例 | 示例场景 | P0 | 手工 | yes | 待分配 | YYYY-MM-DD | pass | 链接 | 示例 |

### 4.3 维护节奏

1. 每次 RC 前更新 `最近执行` 与 `结果`
2. 每次缺陷复测后更新 `Evidence`
3. 每周例会检查 P0/P1 覆盖率

## 5. 自动化执行参数

1. 后端 `AI 路由门禁` E2E 依赖本地监听端口，默认通过 `RUN_SOCKET_E2E=1` 启用
2. 本地受限环境（无法监听端口）可不设置该变量，相关用例会标记为 `skip`
3. CI / Release Gate 必须设置 `RUN_SOCKET_E2E=1`，保证路由级门禁在流水线中真实执行

## 6. 参考文档

- World-Link Alpha PRD: `docs/prd/World-Link-Alpha-PRD-overview.md`
