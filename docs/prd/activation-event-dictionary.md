# Activation Event Dictionary（SCORE-01）

- Owner: 产品 / 前端
- Last Updated: 2026-04-19
- Status: active

## 1. 目标

用于统一新手激活任务流与分步引导 Tour 的埋点口径，确保 `SCORE-01` 可量化评估。

## 2. 事件列表

| 事件名 | 触发时机 | 关键字段 |
| --- | --- | --- |
| `activation_session_start` | 登录后进入 Sidepanel，激活指标会话初始化完成 | `sessionId` `completedCount` `totalCount` |
| `activation_step_completed` | 激活任务某一步 `done: false -> true` | `sessionId` `stepId` `stepTitle` `stepIndex` `completedCount` `totalCount` |
| `activation_completed` | 激活任务五步全部完成（单会话只记一次） | `sessionId` `completedCount` `totalCount` |
| `tour_opened` | 用户打开分步引导 Tour | `sessionId` `stepId` `stepIndex` |
| `tour_closed` | 用户关闭分步引导 Tour | `sessionId` `stepId` `stepIndex` |
| `tour_step_viewed` | Tour 当前步骤发生变化并被展示 | `sessionId` `stepId` `stepTitle` `stepIndex` `done` |
| `tour_step_action` | 用户点击当前步骤动作按钮 | `sessionId` `stepId` `stepTitle` `stepIndex` |
| `tour_next` | 用户手动点击“下一步” | `sessionId` `fromStepId` `fromStepIndex` `toStepId` `toStepIndex` |
| `tour_prev` | 用户手动点击“上一步” | `sessionId` `fromStepId` `fromStepIndex` `toStepId` `toStepIndex` |
| `tour_auto_advance` | 当前步骤完成后系统自动跳到下一未完成步骤 / 自动收尾关闭 | `sessionId` `fromStepId` `fromStepIndex` `toStepId` `toStepIndex` `reason` |

## 3. 存储策略

- 存储介质：`chrome.storage.local`
- 存储键：`activationAnalyticsEvents`
- Ring Buffer：最多保留最近 `500` 条事件
- 容错策略：非扩展环境下自动降级为空操作，不阻断主流程

## 4. 数据消费建议

1. 每周汇总 `activation_session_start -> activation_completed` 漏斗，追踪 D1 激活率。
2. 对 `tour_step_viewed` 与 `tour_step_action` 做步骤转化率分析，识别高流失步骤。
3. 对 `tour_auto_advance` 的 `reason` 做分层统计，验证自动推进是否有效降低卡顿。
