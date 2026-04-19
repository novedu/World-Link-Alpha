#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sqliteIntegrityCheck } from '../ops/db-backup-utils.mjs';

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const backupDir = resolve(rootDir, 'backend', 'backups');

if (!existsSync(backupDir)) {
  throw new Error(`未找到备份目录：${backupDir}`);
}

const backupFiles = readdirSync(backupDir)
  .filter((name) => name.endsWith('.db'))
  .map((name) => ({
    name,
    path: resolve(backupDir, name),
    mtimeMs: statSync(resolve(backupDir, name)).mtimeMs,
  }))
  .sort((a, b) => b.mtimeMs - a.mtimeMs);

if (backupFiles.length === 0) {
  throw new Error('未找到可用的数据库备份文件（.db）');
}

const latest = backupFiles[0];
const integrityOk = sqliteIntegrityCheck(latest.path);
if (!integrityOk) {
  throw new Error(`最新备份完整性异常：${latest.path}`);
}

console.log('✅ 回滚准备检查通过');
console.log(`- 最新备份: ${latest.path}`);
console.log(`- 最近修改: ${new Date(latest.mtimeMs).toISOString()}`);
