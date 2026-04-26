#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(scriptDir, '..')

const requiredFiles = [
  'docs/prd/README.md',
  'docs/prd/World-Link-Alpha-PRD-overview.md',
  'docs/prd/TODO.md',
  'docs/prd/freemium-cloud-architecture.md',
  'docs/prd/competitive-analysis.md',
  'docs/prd/technical-guidelines.md',
  'docs/prd/testing-strategy.md',
  'docs/prd/evolution-roadmap.md',
  'docs/prd/marketing-plan.md',
  'docs/prd/activation-event-dictionary.md',
  'docs/design/README.md',
  'docs/design/ux-spec.md',
  'docs/design/ui-design-spec.md'
]

const forbiddenFiles = [
  'docs/prd/feature-book-import.md',
  'docs/prd/feature-selection-capture.md',
  'docs/prd/subscription-product-strategy.md',
  'docs/prd/score-90-execution-plan.md',
  'docs/prd/score-90-w1-daily-plan.md',
  'docs/prd/score-90-w2-daily-plan.md',
  'docs/prd/score-90-w3-daily-plan.md',
  'docs/prd/score-90-weekly-review-template.md',
  'docs/prd/score-90-pre-scan-register-round1-2026-04-19.md',
  'docs/prd/testing-asset-register-round1-2026-04-19.md',
  'docs/prd/readany-overlap-analysis.md',
  'docs/prd/cubox-overlap-analysis.md',
  'docs/prd/product-performance-score-analysis.md',
  'docs/prd/testing-strategy-and-release-gate.md',
  'docs/prd/e2e-acceptance-checklist.md',
  'docs/prd/testing-asset-register-template.md',
  'docs/prd/development-guidelines.md',
  'docs/prd/frontend-architecture-messaging.md',
  'docs/prd/web-admin-evolution-roadmap.md',
  'docs/prd/plugin-to-web-migration.md',
  'docs/design/06-ux-spec.md',
  'docs/design/07-ui-design-spec.md',
  'docs/DEPLOYMENT.md',
  'docs/EVALUATION_AND_OPTIMIZATION_PLAN.md',
  'docs/TESTING_SUMMARY.md',
  'docs/api-documentation.md',
  'docs/database-performance-analysis.md'
]

const forbiddenRefs = [...forbiddenFiles]
const requiredReadmeHints = [
  'docs/design/ux-spec.md',
  'docs/design/ui-design-spec.md',
  'docs/prd/World-Link-Alpha-PRD-overview.md',
  'docs/prd/TODO.md',
  'docs/prd/freemium-cloud-architecture.md',
  'docs/prd/competitive-analysis.md',
  'docs/prd/technical-guidelines.md',
  'docs/prd/testing-strategy.md',
  'docs/prd/evolution-roadmap.md',
  'docs/prd/marketing-plan.md',
  'docs/prd/activation-event-dictionary.md'
]
const contentSentinels = {
  'docs/design/ui-design-spec.md': '# UI Design Spec: World-Link Alpha',
  'docs/design/ux-spec.md': '# UX Spec: World-Link Alpha',
  'docs/prd/World-Link-Alpha-PRD-overview.md': '# World-Link Alpha PRD'
}
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.claude', '.codex'])
const allowedReferenceFiles = new Set(['docs/prd/TODO.md'])

function extractDeclaredDocPaths(content) {
  const regex = /`([^`]+)`/g
  const declared = new Set()
  let match
  while ((match = regex.exec(content)) !== null) {
    const value = String(match[1] || '').trim()
    if (!value) continue
    if (value.startsWith('docs/prd/') || value.startsWith('docs/design/')) {
      declared.add(value.replace(/\/+$/g, ''))
    }
  }
  return [...declared]
}

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

const prdReadme = path.join(rootDir, 'docs/prd/README.md')
if (existsSync(prdReadme)) {
  const content = readFileSync(prdReadme, 'utf8')
  for (const hint of requiredReadmeHints.filter((item) => item.startsWith('docs/prd/'))) {
    if (!content.includes(hint)) {
      errors.push(`docs/prd/README.md 未声明关键文档：${hint}`)
    }
  }
  const declaredDocs = extractDeclaredDocPaths(content)
  for (const declaredDoc of declaredDocs) {
    if (!existsSync(path.join(rootDir, declaredDoc))) {
      errors.push(`docs/prd/README.md 声明的文档不存在：${declaredDoc}`)
    }
  }
}

const designReadme = path.join(rootDir, 'docs/design/README.md')
if (existsSync(designReadme)) {
  const content = readFileSync(designReadme, 'utf8')
  for (const hint of requiredReadmeHints.filter((item) => item.startsWith('docs/design/'))) {
    if (!content.includes(hint)) {
      errors.push(`docs/design/README.md 未声明关键文档：${hint}`)
    }
  }
  const declaredDocs = extractDeclaredDocPaths(content)
  for (const declaredDoc of declaredDocs) {
    if (!existsSync(path.join(rootDir, declaredDoc))) {
      errors.push(`docs/design/README.md 声明的文档不存在：${declaredDoc}`)
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
