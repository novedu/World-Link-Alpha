# Rollback Playbook

## 触发条件（任一满足立即回滚）

1. 登录主链路不可用超过 5 分钟
2. 核心写入接口 5xx 持续高于 2%
3. 数据迁移/计费对账出现不可恢复异常

## 回滚步骤

1. 冻结发布流量，停止新版本继续扩散
2. 定位最近可用备份文件（`backend/backups/*.db`）
3. 先做 dry-run 校验

```bash
node scripts/ops/restore-db.mjs --from backend/backups/<backup-file>.db
```

4. 执行正式恢复

```bash
node scripts/ops/restore-db.mjs --from backend/backups/<backup-file>.db --apply
```

5. 重新执行核心链路 smoke（登录 / 采集转设定 / 导出）
6. 记录回滚事件：时间、原因、影响范围、处理人、恢复时间

## 回滚后复盘要求

1. 24 小时内输出根因分析（RCA）
2. 为根因补自动化测试或门禁规则
3. 更新 `ops/release/release-checklist.md` 防止复发
