#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')

const requiredFiles = [
  'prd/README.md',
  'prd/World-Link-Alpha-PRD-overview.md',
  'prd/TODO.md',
  'prd/frontend-architecture-messaging.md',
  'prd/freemium-cloud-architecture.md',
  'prd/plugin-to-web-migration.md',
  'design/README.md',
  'design/ux-spec.md',
  'design/ui-design-spec.md'
]

const forbiddenFiles = [
  'prd/feature-book-import.md',
  'prd/feature-selection-capture.md',
  'design/06-ux-spec.md',
  'design/07-ui-design-spec.md'
]

const forbiddenRefs = [...forbiddenFiles]
const requiredReadmeHints = [
  'design/ux-spec.md',
  'design/ui-design-spec.md',
  'prd/World-Link-Alpha-PRD-overview.md',
  'prd/TODO.md'
]
const contentSentinels = {
  'design/ui-design-spec.md': '# UI Design Spec: World-Link Alpha',
  'design/ux-spec.md': '# UX Spec: World-Link Alpha',
  'prd/World-Link-Alpha-PRD-overview.md': '# World-Link Alpha PRD'
}
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.claude', '.codex'])
const allowedReferenceFiles = new Set(['prd/TODO.md'])

function walkFiles(dir, ext = '.md') {
  if (!existsSync(dir)) return []
  const queue = [dir]
  const result = []
  while (queue.length) {
    const current = queue.pop()
    const entries = readdirSync(current)
    for (const entry of entries) {
      const full = path.join(current, entry)
      const stats = statSync(full)
      if (stats.isDirectory()) {
        if (!ignoreDirs.has(entry)) {
          queue.push(full)
        }
      } else if (stats.isFile() && full.endsWith(ext)) {
        result.push(full)
      }
    }
  }
  return result
}

const errors = []

for (const file of requiredFiles) {
  if (!existsSync(path.join(rootDir, file))) {
    errors.push(`缺少必需文档：${file}`)
  }
}

for (const file of forbiddenFiles) {
  if (existsSync(path.join(rootDir, file))) {
    errors.push(`发现已废弃文档仍存在：${file}`)
  }
}

const markdownFiles = walkFiles(path.join(rootDir))
for (const filePath of markdownFiles) {
  const normalizedPath = path.relative(rootDir, filePath).replaceAll('\\', '/')
  const content = readFileSync(filePath, 'utf8')
  if (allowedReferenceFiles.has(normalizedPath)) {
    continue
  }
  for (const forbidden of forbiddenRefs) {
    if (content.includes(forbidden)) {
      errors.push(`文档仍引用了已废弃路径：${forbidden}（文件：${normalizedPath}）`)
    }
  }
}

const prdReadme = path.join(rootDir, 'prd/README.md')
if (existsSync(prdReadme)) {
  const content = readFileSync(prdReadme, 'utf8')
  for (const hint of requiredReadmeHints.filter((item) => item.startsWith('prd/'))) {
    if (!content.includes(hint)) {
      errors.push(`prd/README.md 未声明关键文档：${hint}`)
    }
  }
}

const designReadme = path.join(rootDir, 'design/README.md')
if (existsSync(designReadme)) {
  const content = readFileSync(designReadme, 'utf8')
  for (const hint of requiredReadmeHints.filter((item) => item.startsWith('design/'))) {
    if (!content.includes(hint)) {
      errors.push(`design/README.md 未声明关键文档：${hint}`)
    }
  }
}

for (const [file, sentinel] of Object.entries(contentSentinels)) {
  const fullPath = path.join(rootDir, file)
  if (!existsSync(fullPath)) {
    continue
  }
  const content = readFileSync(fullPath, 'utf8')
  if (!content.includes(sentinel)) {
    errors.push(`文档缺少内容哨兵：${file} 应包含 "${sentinel}"`)
  }
}

if (errors.length) {
  console.error('❌ 文档一致性检查失败：')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('✅ 文档一致性检查通过')
