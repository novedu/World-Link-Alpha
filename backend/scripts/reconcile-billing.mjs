#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const prisma = new PrismaClient();

const PLAN_RULES = {
  free: {
    maxWorlds: 2,
    maxEntities: 100,
    maxCaptures: 10,
    canExport: true,
    canUseAI: false,
  },
  pro: {
    maxWorlds: 99999,
    maxEntities: 1000,
    maxCaptures: 100,
    canExport: true,
    canUseAI: true,
  },
  team: {
    maxWorlds: 99999,
    maxEntities: 5000,
    maxCaptures: 500,
    canExport: true,
    canUseAI: true,
  },
};

function parseArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index < 0 || index + 1 >= process.argv.length) return '';
  return process.argv[index + 1];
}

function resolveExpectedPlan(subscription) {
  if (!subscription) return 'free';
  const isActive = subscription.status === 'active' && subscription.endDate >= new Date();
  if (!isActive) return 'free';
  const planId = String(subscription.planId || 'free').toLowerCase();
  if (!PLAN_RULES[planId]) return 'free';
  return planId;
}

async function run() {
  const shouldFix = process.argv.includes('--fix');
  const outArg = parseArg('--out');
  const outPath =
    outArg ||
    resolve(
      process.cwd(),
      'backend',
      'audit',
      `billing-reconcile-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );

  const users = await prisma.user.findMany({
    include: {
      subscription: true,
      entitlements: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const mismatches = [];
  let fixedUsers = 0;

  for (const user of users) {
    const expectedPlan = resolveExpectedPlan(user.subscription);
    const expected = PLAN_RULES[expectedPlan];
    const entitlement = user.entitlements;

    const mismatch = {
      userId: user.id,
      email: user.email,
      expectedPlan,
      actualPlan: user.plan,
      planMismatch: user.plan !== expectedPlan,
      entitlementMissing: !entitlement,
      entitlementMismatch: false,
      entitlementDiff: {},
    };

    if (entitlement) {
      const diff = {};
      if (entitlement.maxWorlds !== expected.maxWorlds) diff.maxWorlds = [entitlement.maxWorlds, expected.maxWorlds];
      if (entitlement.maxEntities !== expected.maxEntities) diff.maxEntities = [entitlement.maxEntities, expected.maxEntities];
      if (entitlement.maxCaptures !== expected.maxCaptures) diff.maxCaptures = [entitlement.maxCaptures, expected.maxCaptures];
      if (entitlement.canExport !== expected.canExport) diff.canExport = [entitlement.canExport, expected.canExport];
      if (entitlement.canUseAI !== expected.canUseAI) diff.canUseAI = [entitlement.canUseAI, expected.canUseAI];
      mismatch.entitlementDiff = diff;
      mismatch.entitlementMismatch = Object.keys(diff).length > 0;
    }

    if (mismatch.planMismatch || mismatch.entitlementMissing || mismatch.entitlementMismatch) {
      mismatches.push(mismatch);

      if (shouldFix) {
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: expectedPlan, updatedAt: new Date() },
        });
        await prisma.entitlement.upsert({
          where: { userId: user.id },
          update: {
            maxWorlds: expected.maxWorlds,
            maxEntities: expected.maxEntities,
            maxCaptures: expected.maxCaptures,
            canExport: expected.canExport,
            canUseAI: expected.canUseAI,
            updatedAt: new Date(),
          },
          create: {
            userId: user.id,
            maxWorlds: expected.maxWorlds,
            maxEntities: expected.maxEntities,
            maxCaptures: expected.maxCaptures,
            canExport: expected.canExport,
            canUseAI: expected.canUseAI,
          },
        });
        fixedUsers += 1;
      }
    }
  }

  const report = {
    createdAt: new Date().toISOString(),
    mode: shouldFix ? 'fix' : 'check',
    summary: {
      totalUsers: users.length,
      mismatchUsers: mismatches.length,
      fixedUsers,
    },
    mismatches,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('✅ 计费对账完成');
  console.log(`- 模式: ${report.mode}`);
  console.log(`- 用户总数: ${report.summary.totalUsers}`);
  console.log(`- 异常用户: ${report.summary.mismatchUsers}`);
  console.log(`- 已修复: ${report.summary.fixedUsers}`);
  console.log(`- 报告: ${outPath}`);
}

run()
  .catch((error) => {
    console.error('❌ 计费对账失败:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
