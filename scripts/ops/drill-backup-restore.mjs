#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackup, resolveDatabaseFile, sqliteIntegrityCheck } from './db-backup-utils.mjs';

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const drillBackup = createBackup(rootDir, { label: 'drill' });
const backupOk = sqliteIntegrityCheck(drillBackup.backupFile);
const databaseFile = resolveDatabaseFile(rootDir);

const report = {
  createdAt: new Date().toISOString(),
  type: 'backup_restore_drill',
  databaseFile,
  drillBackupFile: drillBackup.backupFile,
  backupIntegrityOk: backupOk,
  status: backupOk ? 'pass' : 'fail',
};

const reportPath = resolve(
  rootDir,
  'backend',
  'backups',
  `drill-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
);
writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

if (!backupOk) {
  throw new Error(`演练失败：备份文件完整性异常，报告=${reportPath}`);
}

console.log('✅ 备份恢复演练通过');
console.log(`- 报告: ${reportPath}`);
console.log(`- 备份: ${drillBackup.backupFile}`);
