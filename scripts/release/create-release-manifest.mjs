#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatTimestamp } from '../ops/db-backup-utils.mjs';

function safeExec(command, cwd) {
  try {
    return execSync(command, { cwd, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const runVerify = process.argv.includes('--verify');

if (runVerify) {
  execSync('npm run verify', { cwd: rootDir, stdio: 'inherit' });
}

const releaseId = `rel-${formatTimestamp()}`;
const releaseDir = resolve(rootDir, 'artifacts', 'releases', releaseId);
mkdirSync(releaseDir, { recursive: true });

const manifest = {
  releaseId,
  createdAt: new Date().toISOString(),
  git: {
    commit: safeExec('git rev-parse HEAD', rootDir),
    shortCommit: safeExec('git rev-parse --short HEAD', rootDir),
    branch: safeExec('git rev-parse --abbrev-ref HEAD', rootDir),
    statusSummary: safeExec('git status --short', rootDir),
  },
  verify: {
    runByScript: runVerify,
    requiredCommand: 'npm run verify',
  },
  gates: [
    'lint',
    'typecheck',
    'docs-consistency',
    'backend-contract-tests',
    'backend-e2e-smoke',
    'sidepanel-tests',
    'build',
  ],
  rollback: {
    playbook: 'docs/ops/release/rollback-playbook.md',
    restoreCommand: 'node scripts/ops/restore-db.mjs --from <backup-file> --apply',
  },
};

const manifestPath = resolve(releaseDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

console.log('✅ 发布清单已生成');
console.log(`- releaseId: ${releaseId}`);
console.log(`- manifest: ${manifestPath}`);
