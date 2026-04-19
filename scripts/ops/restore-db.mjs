#!/usr/bin/env node

import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackup, resolveDatabaseFile, sqliteIntegrityCheck } from './db-backup-utils.mjs';

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const backupFileInput = readArg('--from');
const applyRestore = process.argv.includes('--apply');

if (!backupFileInput) {
  throw new Error('请提供 --from <backup-file> 参数');
}

const backupFile = resolve(process.cwd(), backupFileInput);
if (!existsSync(backupFile)) {
  throw new Error(`备份文件不存在：${backupFile}`);
}

if (!sqliteIntegrityCheck(backupFile)) {
  throw new Error(`备份文件完整性校验失败：${backupFile}`);
}

const databaseFile = resolveDatabaseFile(rootDir);

if (!applyRestore) {
  console.log('✅ 备份文件可用于恢复（dry-run）');
  console.log(`- 备份文件: ${backupFile}`);
  console.log(`- 目标数据库: ${databaseFile}`);
  console.log('如需执行恢复，请追加 --apply');
  process.exit(0);
}

const preRestoreBackup = createBackup(rootDir, { label: 'pre-restore' });
copyFileSync(backupFile, databaseFile);

if (!sqliteIntegrityCheck(databaseFile)) {
  throw new Error(`恢复后数据库校验失败：${databaseFile}`);
}

console.log('✅ 数据库恢复完成');
console.log(`- 恢复源: ${backupFile}`);
console.log(`- 目标库: ${databaseFile}`);
console.log(`- 恢复前备份: ${preRestoreBackup.backupFile}`);
