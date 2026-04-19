import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/config/database';
import { registerUser, loginUser } from '../src/services/authService';
import { createWorld } from '../src/services/worldService';
import { createBook } from '../src/services/bookService';
import { createEntity, bindEntityToBook } from '../src/services/entityService';
import { createCapture, markCaptureAsConverted, getCaptureById } from '../src/services/captureService';
import { checkFeatureAccess, getEntitlementWithUsage } from '../src/services/entitlementService';

test('e2e core flow: auth -> capture -> entity -> bind -> entitlement', async () => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = 'passw0rd-123';

  let userId = '';

  try {
    const registerResult = await registerUser({ email, password });
    userId = registerResult.user.id;
    assert.ok(registerResult.token, 'register token should exist');
    assert.equal(registerResult.user.email, email);

    const loginResult = await loginUser({ email, password });
    assert.ok(loginResult.token, 'login token should exist');
    assert.equal(loginResult.user.id, userId);

    const world = await createWorld({
      userId,
      name: 'E2E 世界观',
      description: '核心链路测试世界',
    });
    assert.equal(world.userId, userId);

    const book = await createBook(userId, {
      worldId: world.id,
      title: 'E2E 当前作品',
      description: '用于绑定设定的作品',
    });
    assert.equal(book.worldId, world.id);

    const capture = await createCapture({
      userId,
      text: '北境银松城',
      sourceUrl: 'https://example.com/story',
      sourceTitle: '设定灵感来源',
    });
    assert.equal(capture.status, 'inbox');

    const entity = await createEntity(userId, {
      worldId: world.id,
      name: '银松城',
      type: 'location',
      summary: '北境贸易要塞',
      tags: ['城邦', '北境'],
      sourceUrl: 'https://example.com/story',
      sourceTitle: '设定灵感来源',
    });
    assert.equal(entity.worldId, world.id);

    const usage = await bindEntityToBook(entity.id, book.id, userId);
    assert.equal(usage.bookId, book.id);
    assert.equal(usage.entityId, entity.id);

    await markCaptureAsConverted(capture.id, entity.id, userId);
    const convertedCapture = await getCaptureById(capture.id, userId);
    assert.equal(convertedCapture?.status, 'converted');
    assert.equal(convertedCapture?.entityId, entity.id);

    const exportAccess = await checkFeatureAccess(userId, 'export');
    assert.equal(exportAccess, true);

    const entitlement = await getEntitlementWithUsage(userId);
    assert.equal(entitlement.usage.worlds >= 1, true);
    assert.equal(entitlement.usage.entities >= 1, true);
    assert.equal(entitlement.usage.captures >= 1, true);
  } finally {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    } else {
      await prisma.user.deleteMany({ where: { email } });
    }
  }
});
