#!/usr/bin/env node

import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackup, sqliteIntegrityCheck } from './db-backup-utils.mjs';

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const label = process.argv[2] || 'scheduled';

const result = createBackup(rootDir, { label });
const isOk = sqliteIntegrityCheck(result.backupFile);
if (!isOk) {
  throw new Error(`备份完整性校验失败：${result.backupFile}`);
}

const backupLogPath = resolve(rootDir, 'backend', 'backups', 'backup-log.ndjson');
mkdirSync(dirname(backupLogPath), { recursive: true });
appendFileSync(backupLogPath, `${JSON.stringify(result)}\n`);

console.log('✅ 数据库备份完成');
console.log(`- 源文件: ${result.databaseFile}`);
console.log(`- 备份文件: ${result.backupFile}`);
console.log(`- SHA256: ${result.backupSha256}`);
console.log(`- 大小: ${result.backupSizeBytes} bytes`);
