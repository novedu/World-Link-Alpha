# Backup And Recovery

## 备份

手动备份：

```bash
node scripts/ops/backup-db.mjs manual
```

发布前备份：

```bash
node scripts/ops/backup-db.mjs pre-release
```

## 恢复验证（不改线上数据）

```bash
node scripts/ops/restore-db.mjs --from backend/backups/<backup-file>.db
```

## 执行恢复（会覆盖当前数据库）

```bash
node scripts/ops/restore-db.mjs --from backend/backups/<backup-file>.db --apply
```

## 演练

每周至少一次：

```bash
node scripts/ops/drill-backup-restore.mjs
```
