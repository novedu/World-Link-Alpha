import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

function parseEnvFile(envPath) {
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const normalizedValue = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    result[key] = normalizedValue;
  }
  return result;
}

export function resolveDatabaseFile(rootDir) {
  const envPath = join(rootDir, 'backend', '.env');
  const envVars = parseEnvFile(envPath);
  const databaseUrl = process.env.DATABASE_URL || envVars.DATABASE_URL || '';

  if (!databaseUrl.startsWith('file:')) {
    throw new Error(`当前仅支持 sqlite file 数据源，收到 DATABASE_URL=${databaseUrl || '(empty)'}`);
  }

  const rawPath = databaseUrl.slice('file:'.length);
  const sqlitePath = rawPath.trim();
  if (!sqlitePath) {
    throw new Error('DATABASE_URL 缺少 sqlite 文件路径');
  }

  if (isAbsolute(sqlitePath)) {
    return sqlitePath;
  }

  const candidates = [
    resolve(rootDir, 'backend', 'prisma', sqlitePath),
    resolve(rootDir, 'backend', sqlitePath),
    resolve(rootDir, sqlitePath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export function ensureParentDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function formatTimestamp(date = new Date()) {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(readFileSync(filePath));
  return hash.digest('hex');
}

export function sqliteIntegrityCheck(filePath) {
  const output = execFileSync('sqlite3', [filePath, 'PRAGMA integrity_check;'], {
    encoding: 'utf8',
  }).trim();
  return output.toLowerCase() === 'ok';
}

function copyIfExists(srcPath, dstPath) {
  if (!existsSync(srcPath)) return false;
  ensureParentDir(dstPath);
  copyFileSync(srcPath, dstPath);
  return true;
}

export function createBackup(rootDir, { label = 'manual' } = {}) {
  const databaseFile = resolveDatabaseFile(rootDir);
  if (!existsSync(databaseFile)) {
    throw new Error(`数据库文件不存在：${databaseFile}`);
  }

  const backupDir = resolve(rootDir, 'backend', 'backups');
  mkdirSync(backupDir, { recursive: true });

  const timestamp = formatTimestamp();
  const baseName = basename(databaseFile);
  const backupBaseName = `${timestamp}-${label}-${baseName}`;
  const backupFile = resolve(backupDir, backupBaseName);

  copyFileSync(databaseFile, backupFile);

  const sidecars = ['-journal', '-shm', '-wal'];
  const copiedSidecars = [];
  for (const sidecar of sidecars) {
    const src = `${databaseFile}${sidecar}`;
    const dst = `${backupFile}${sidecar}`;
    if (copyIfExists(src, dst)) {
      copiedSidecars.push(dst);
    }
  }

  const backupSizeBytes = statSync(backupFile).size;
  const backupSha256 = sha256File(backupFile);

  return {
    databaseFile,
    backupFile,
    copiedSidecars,
    backupSizeBytes,
    backupSha256,
    createdAt: new Date().toISOString(),
  };
}
