# Release Checklist

## 发布前（必须全部通过）

1. 执行完整门禁

```bash
RUN_SOCKET_E2E=1 npm run verify
```

2. 执行核心链路 E2E smoke

```bash
RUN_SOCKET_E2E=1 npm run test:e2e
```

3. 执行一次数据库备份

```bash
node scripts/ops/backup-db.mjs pre-release
```

4. 验证回滚可用性

```bash
node scripts/release/verify-rollback-ready.mjs
```

5. 生成发布清单（含 commit、门禁状态、回滚入口）

```bash
node scripts/release/create-release-manifest.mjs
```

## 发布后（15 分钟内）

1. 观察接口错误率与响应耗时
2. 抽样验证登录、采集转设定、导出
3. 保留最新备份文件和 release manifest
