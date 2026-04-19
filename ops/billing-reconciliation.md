# Billing Reconciliation

## 目标

确保三份状态一致：

1. `users.plan`
2. `subscriptions` 当前有效订阅
3. `entitlements` 实际权益限制

## 对账命令

仅检查并输出报告：

```bash
npm run billing:reconcile
```

检查并自动修复：

```bash
npm run billing:reconcile:fix
```

## 报告位置

默认输出到：

```text
backend/audit/billing-reconcile-<timestamp>.json
```

## 执行频率建议

1. 每日一次自动检查
2. 每次计费规则变更后立即执行一次
3. 每次发布前执行一次检查模式
