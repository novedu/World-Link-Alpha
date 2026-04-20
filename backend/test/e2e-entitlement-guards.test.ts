import assert from 'node:assert/strict';
import test from 'node:test';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { prisma } from '../src/config/database';
import { registerUser } from '../src/services/authService';
import { createWorld } from '../src/services/worldService';
import {
  checkFeatureAccess,
  consumeExport,
  getEntitlementWithUsage,
} from '../src/services/entitlementService';
import { createSubscription } from '../src/services/subscriptionService';
import { createApp } from '../src/index';

function getErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  return String((error as { code?: unknown }).code || '').trim();
}

async function expectErrorCode(
  action: () => Promise<unknown>,
  expectedCode: string
) {
  try {
    await action();
    assert.fail(`expected error code: ${expectedCode}`);
  } catch (error) {
    assert.equal(getErrorCode(error), expectedCode);
  }
}

async function startTestServer() {
  const app = createApp();
  const server = await new Promise<Server>((resolve) => {
    const listeningServer = app.listen(0, () => resolve(listeningServer));
  });
  const address = server.address() as AddressInfo | null;
  const port = Number(address?.port || 0);
  if (!port) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
    throw new Error('测试服务启动失败：无法获取端口');
  }
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

test('e2e entitlement guards: quota, export gating, plan upgrade', async () => {
  const email = `e2e-entitlement-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'passw0rd-123';
  let userId = '';

  try {
    const registerResult = await registerUser({ email, password });
    userId = registerResult.user.id;

    const world1 = await createWorld({
      userId,
      name: 'Guard 世界 1',
      description: 'free 配额校验',
    });
    assert.equal(world1.userId, userId);

    const world2 = await createWorld({
      userId,
      name: 'Guard 世界 2',
      description: 'free 配额校验',
    });
    assert.equal(world2.userId, userId);

    await expectErrorCode(
      () =>
        createWorld({
          userId,
          name: 'Guard 世界 3',
          description: '应超出 free 配额',
        }),
      'WORLD_QUOTA_EXCEEDED'
    );

    const canUseAiInFree = await checkFeatureAccess(userId, 'ai');
    assert.equal(canUseAiInFree, false);

    const markdownExport = await consumeExport(userId, 'markdown');
    assert.equal(markdownExport.markdown, 1);
    assert.equal(markdownExport.json, 0);

    await expectErrorCode(
      () => consumeExport(userId, 'json'),
      'EXPORT_JSON_FORBIDDEN'
    );

    await createSubscription(userId, 'pro', 'test-card');

    const canUseAiInPro = await checkFeatureAccess(userId, 'ai');
    assert.equal(canUseAiInPro, true);

    const jsonExport = await consumeExport(userId, 'json');
    assert.equal(jsonExport.json >= 1, true);

    const entitlement = await getEntitlementWithUsage(userId);
    assert.equal(entitlement.plan, 'pro');
    assert.equal(entitlement.features.canUseAI, true);
    assert.equal(entitlement.features.canExportJson, true);
    assert.equal(entitlement.exports.markdown >= 1, true);
    assert.equal(entitlement.exports.json >= 1, true);
  } finally {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      await prisma.user.deleteMany({ where: { email } });
    }
  }
});

test('e2e ai route gating: free blocked, pro allowed', async () => {
  const email = `e2e-ai-gate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'passw0rd-123';
  let userId = '';
  let closeServer: (() => Promise<void>) | null = null;

  try {
    const registerResult = await registerUser({ email, password });
    userId = registerResult.user.id;

    const server = await startTestServer();
    closeServer = server.close;

    const freeResponse = await fetch(`${server.baseUrl}/api/ai/entity-assist`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${registerResult.token}`,
      },
      body: JSON.stringify({
        text: '青铜矿石可用于锻造武器',
        mode: 'summarize',
      }),
    });
    assert.equal(freeResponse.status, 403);
    const freePayload = (await freeResponse.json()) as {
      success?: boolean;
      error?: { code?: string };
    };
    assert.equal(freePayload.success, false);
    assert.equal(freePayload.error?.code, 'AI_FEATURE_DISABLED');

    await createSubscription(userId, 'pro', 'test-card');

    const proResponse = await fetch(`${server.baseUrl}/api/ai/entity-assist`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${registerResult.token}`,
      },
      body: JSON.stringify({
        text: '青铜矿石可用于锻造武器',
        mode: 'summarize',
      }),
    });
    assert.equal(proResponse.status, 200);
    const proPayload = (await proResponse.json()) as {
      success?: boolean;
      data?: { result?: string };
    };
    assert.equal(proPayload.success, true);
    assert.equal(typeof proPayload.data?.result, 'string');
  } finally {
    if (closeServer) {
      await closeServer();
    }
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      await prisma.user.deleteMany({ where: { email } });
    }
  }
});
