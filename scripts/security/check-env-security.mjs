#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function parseEnv(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^"(.*)"$/, '$1');
    result[key] = value;
  }
  return result;
}

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const envPath = resolve(rootDir, 'backend', '.env');
const envExamplePath = resolve(rootDir, 'backend', '.env.example');
const env = parseEnv(envPath);
const envExample = parseEnv(envExamplePath);

const issues = [];

const jwtSecret = String(env.JWT_SECRET || '');
if (!jwtSecret) {
  issues.push('backend/.env 缺少 JWT_SECRET');
} else if (jwtSecret.length < 16) {
  issues.push('backend/.env 的 JWT_SECRET 长度过短（建议 >= 32）');
}

if (String(envExample.JWT_SECRET || '').includes('change-this-in-production') === false) {
  issues.push('backend/.env.example 未包含明确的生产替换提示');
}

if (issues.length > 0) {
  console.error('❌ 环境安全检查失败');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('✅ 环境安全检查通过');
