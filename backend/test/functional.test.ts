import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/config/database';
import { registerUser, loginUser, validateToken } from '../src/services/authService';
import { createWorld, getWorldById, updateWorld, deleteWorld } from '../src/services/worldService';
import { createBook, getBookById, updateBook, deleteBook } from '../src/services/bookService';
import { createEntity, getEntityById, updateEntity, deleteEntity, searchEntities } from '../src/services/entityService';
import { createCapture, getCaptureById, deleteCapture, markCaptureAsConverted } from '../src/services/captureService';
import { checkFeatureAccess, consumeExport, getEntitlementWithUsage } from '../src/services/entitlementService';
import { createSubscription, cancelSubscription } from '../src/services/subscriptionService';
import { createTimelineEvent, getTimelineEventsByWorld, updateTimelineEvent, deleteTimelineEvent } from '../src/services/timelineService';

test('auth: register with valid credentials', async () => {
  const email = `auth-test-${Date.now()}@example.com`;
  const password = 'SecurePass123!';

  const result = await registerUser({ email, password });
  
  assert.ok(result.user.id, 'user id should exist');
  assert.equal(result.user.email, email);
  assert.equal(result.user.plan, 'free');
  assert.ok(result.token, 'token should exist');
  assert.ok(result.token.length > 0, 'token should not be empty');

  await prisma.user.deleteMany({ where: { email } });
});

test('auth: register with duplicate email should fail', async () => {
  const email = `auth-dup-${Date.now()}@example.com`;
  const password = 'SecurePass123!';

  await registerUser({ email, password });

  try {
    await registerUser({ email, password });
    assert.fail('should throw error for duplicate email');
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(error.message.includes('邮箱已被注册'));
  } finally {
    await prisma.user.deleteMany({ where: { email } });
  }
});

test('auth: login with valid credentials', async () => {
  const email = `auth-login-${Date.now()}@example.com`;
  const password = 'SecurePass123!';

  await registerUser({ email, password });
  const result = await loginUser({ email, password });

  assert.ok(result.user.id, 'user id should exist');
  assert.equal(result.user.email, email);
  assert.ok(result.token, 'token should exist');

  await prisma.user.deleteMany({ where: { email } });
});

test('auth: login with invalid credentials should fail', async () => {
  const email = `auth-invalid-${Date.now()}@example.com`;
  const password = 'SecurePass123!';

  await registerUser({ email, password });

  try {
    await loginUser({ email, password: 'WrongPassword123!' });
    assert.fail('should throw error for invalid password');
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.ok(error.message.includes('邮箱或密码错误'));
  } finally {
    await prisma.user.deleteMany({ where: { email } });
  }
});

test('auth: token validation', async () => {
  const email = `auth-token-${Date.now()}@example.com`;
  const password = 'SecurePass123!';

  const { token } = await registerUser({ email, password });
  const decoded = await validateToken(token);

  assert.ok(decoded, 'token should be valid');
  assert.ok(decoded.userId, 'userId should exist');
  assert.equal(decoded.email, email);

  await prisma.user.deleteMany({ where: { email } });
});

test('world: create world successfully', async () => {
  const email = `world-create-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  assert.ok(world.id, 'world id should exist');
  assert.equal(world.userId, user.id);
  assert.equal(world.name, '测试世界');
  assert.equal(world.description, '这是一个测试世界');

  await prisma.user.deleteMany({ where: { email } });
});

test('world: get world by id', async () => {
  const email = `world-get-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const createdWorld = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const world = await getWorldById(createdWorld.id, user.id);

  assert.ok(world, 'world should exist');
  assert.equal(world.id, createdWorld.id);
  assert.equal(world.name, '测试世界');

  await prisma.user.deleteMany({ where: { email } });
});

test('world: update world successfully', async () => {
  const email = `world-update-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const updatedWorld = await updateWorld(world.id, user.id, {
    name: '更新后的世界',
    description: '更新后的描述'
  });

  assert.equal(updatedWorld.name, '更新后的世界');
  assert.equal(updatedWorld.description, '更新后的描述');

  await prisma.user.deleteMany({ where: { email } });
});

test('world: delete world successfully', async () => {
  const email = `world-delete-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  await deleteWorld(world.id, user.id);

  const deletedWorld = await getWorldById(world.id, user.id);
  assert.equal(deletedWorld, null);

  await prisma.user.deleteMany({ where: { email } });
});

test('book: create book successfully', async () => {
  const email = `book-create-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const book = await createBook(user.id, {
    worldId: world.id,
    title: '测试书籍',
    description: '这是一本测试书籍'
  });

  assert.ok(book.id, 'book id should exist');
  assert.equal(book.worldId, world.id);
  assert.equal(book.title, '测试书籍');
  assert.equal(book.description, '这是一本测试书籍');

  await prisma.user.deleteMany({ where: { email } });
});

test('book: get book by id', async () => {
  const email = `book-get-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const createdBook = await createBook(user.id, {
    worldId: world.id,
    title: '测试书籍',
    description: '这是一本测试书籍'
  });

  const book = await getBookById(createdBook.id, user.id);

  assert.ok(book, 'book should exist');
  assert.equal(book.id, createdBook.id);
  assert.equal(book.title, '测试书籍');

  await prisma.user.deleteMany({ where: { email } });
});

test('book: update book successfully', async () => {
  const email = `book-update-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const book = await createBook(user.id, {
    worldId: world.id,
    title: '测试书籍',
    description: '这是一本测试书籍'
  });

  const updatedBook = await updateBook(book.id, user.id, {
    title: '更新后的书籍',
    description: '更新后的描述'
  });

  assert.equal(updatedBook.title, '更新后的书籍');
  assert.equal(updatedBook.description, '更新后的描述');

  await prisma.user.deleteMany({ where: { email } });
});

test('book: delete book successfully', async () => {
  const email = `book-delete-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const book = await createBook(user.id, {
    worldId: world.id,
    title: '测试书籍',
    description: '这是一本测试书籍'
  });

  await deleteBook(book.id, user.id);

  const deletedBook = await getBookById(book.id, user.id);
  assert.equal(deletedBook, null);

  await prisma.user.deleteMany({ where: { email } });
});

test('entity: create entity successfully', async () => {
  const email = `entity-create-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体',
    tags: ['主角', '重要'],
    sourceUrl: 'https://example.com',
    sourceTitle: '来源标题'
  });

  assert.ok(entity.id, 'entity id should exist');
  assert.equal(entity.worldId, world.id);
  assert.equal(entity.name, '测试实体');
  assert.equal(entity.type, 'character');
  assert.equal(entity.tags, '主角,重要');

  await prisma.user.deleteMany({ where: { email } });
});

test('entity: get entity by id', async () => {
  const email = `entity-get-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const createdEntity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  const entity = await getEntityById(createdEntity.id, user.id);

  assert.ok(entity, 'entity should exist');
  assert.equal(entity.id, createdEntity.id);
  assert.equal(entity.name, '测试实体');

  await prisma.user.deleteMany({ where: { email } });
});

test('entity: update entity successfully', async () => {
  const email = `entity-update-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  const updatedEntity = await updateEntity(entity.id, user.id, {
    name: '更新后的实体',
    summary: '更新后的描述',
    tags: ['更新标签']
  });

  assert.equal(updatedEntity.name, '更新后的实体');
  assert.equal(updatedEntity.summary, '更新后的描述');
  assert.equal(updatedEntity.tags, '更新标签');

  await prisma.user.deleteMany({ where: { email } });
});

test('entity: delete entity successfully', async () => {
  const email = `entity-delete-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  await deleteEntity(entity.id, user.id);

  const deletedEntity = await getEntityById(entity.id, user.id);
  assert.equal(deletedEntity, null);

  await prisma.user.deleteMany({ where: { email } });
});

test('entity: search entities by name', async () => {
  const email = `entity-search-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  await createEntity(user.id, {
    worldId: world.id,
    name: '张三',
    type: 'character',
    summary: '主角'
  });

  await createEntity(user.id, {
    worldId: world.id,
    name: '李四',
    type: 'character',
    summary: '配角'
  });

  await createEntity(user.id, {
    worldId: world.id,
    name: '王五',
    type: 'character',
    summary: '配角'
  });

  const results = await searchEntities(user.id, '张');

  assert.ok(results.length >= 1, 'should find at least one result');
  assert.ok(results.some(e => e.name.includes('张')), 'should find entity with 张');

  await prisma.user.deleteMany({ where: { email } });
});

test('entity: search entities by type', async () => {
  const email = `entity-type-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  await createEntity(user.id, {
    worldId: world.id,
    name: '张三',
    type: 'character',
    summary: '主角'
  });

  await createEntity(user.id, {
    worldId: world.id,
    name: '银松城',
    type: 'location',
    summary: '城市'
  });

  await createEntity(user.id, {
    worldId: world.id,
    name: '青铜剑',
    type: 'item',
    summary: '武器'
  });

  const results = await searchEntities(user.id, '', world.id, 'character');

  assert.ok(results.length >= 1, 'should find at least one character');
  assert.ok(results.every(e => e.type === 'character'), 'all results should be characters');

  await prisma.user.deleteMany({ where: { email } });
});

test('capture: create capture successfully', async () => {
  const email = `capture-create-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const capture = await createCapture({
    userId: user.id,
    text: '这是一段捕获的文本',
    sourceUrl: 'https://example.com',
    sourceTitle: '来源标题'
  });

  assert.ok(capture.id, 'capture id should exist');
  assert.equal(capture.userId, user.id);
  assert.equal(capture.text, '这是一段捕获的文本');
  assert.equal(capture.status, 'inbox');

  await prisma.user.deleteMany({ where: { email } });
});

test('capture: get capture by id', async () => {
  const email = `capture-get-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const createdCapture = await createCapture({
    userId: user.id,
    text: '这是一段捕获的文本',
    sourceUrl: 'https://example.com',
    sourceTitle: '来源标题'
  });

  const capture = await getCaptureById(createdCapture.id, user.id);

  assert.ok(capture, 'capture should exist');
  assert.equal(capture.id, createdCapture.id);
  assert.equal(capture.text, '这是一段捕获的文本');

  await prisma.user.deleteMany({ where: { email } });
});

test('capture: delete capture successfully', async () => {
  const email = `capture-delete-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const capture = await createCapture({
    userId: user.id,
    text: '这是一段捕获的文本',
    sourceUrl: 'https://example.com',
    sourceTitle: '来源标题'
  });

  await deleteCapture(capture.id, user.id);

  const deletedCapture = await getCaptureById(capture.id, user.id);
  assert.equal(deletedCapture, null);

  await prisma.user.deleteMany({ where: { email } });
});

test('capture: mark capture as converted', async () => {
  const email = `capture-convert-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const capture = await createCapture({
    userId: user.id,
    text: '这是一段捕获的文本',
    sourceUrl: 'https://example.com',
    sourceTitle: '来源标题'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  await markCaptureAsConverted(capture.id, entity.id, user.id);

  const convertedCapture = await getCaptureById(capture.id, user.id);

  assert.ok(convertedCapture, 'capture should exist');
  if (convertedCapture) {
    assert.equal(convertedCapture.status, 'converted');
    assert.equal(convertedCapture.entityId, entity.id);
  }

  await prisma.user.deleteMany({ where: { email } });
});

test('entitlement: check feature access for free user', async () => {
  const email = `entitlement-free-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const canExport = await checkFeatureAccess(user.id, 'export');
  const canUseAi = await checkFeatureAccess(user.id, 'ai');
  const canExportJson = await checkFeatureAccess(user.id, 'export_json');

  assert.equal(canExport, true, 'free user can export markdown');
  assert.equal(canUseAi, false, 'free user cannot use AI');
  assert.equal(canExportJson, false, 'free user cannot export JSON');

  await prisma.user.deleteMany({ where: { email } });
});

test('entitlement: check feature access for pro user', async () => {
  const email = `entitlement-pro-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  await createSubscription(user.id, 'pro', 'test-card');

  const canExport = await checkFeatureAccess(user.id, 'export');
  const canUseAi = await checkFeatureAccess(user.id, 'ai');
  const canExportJson = await checkFeatureAccess(user.id, 'export_json');

  assert.equal(canExport, true, 'pro user can export markdown');
  assert.equal(canUseAi, true, 'pro user can use AI');
  assert.equal(canExportJson, true, 'pro user can export JSON');

  await prisma.user.deleteMany({ where: { email } });
});

test('entitlement: consume export for free user', async () => {
  const email = `entitlement-consume-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const result = await consumeExport(user.id, 'markdown');

  assert.ok(result.markdown >= 1, 'markdown export count should increase');
  assert.equal(result.json, 0, 'json export should be 0 for free user');

  await prisma.user.deleteMany({ where: { email } });
});

test('entitlement: get entitlement with usage', async () => {
  const email = `entitlement-usage-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entitlement = await getEntitlementWithUsage(user.id);

  assert.equal(entitlement.plan, 'free');
  assert.equal(entitlement.usage.worlds >= 1, true);
  assert.ok(entitlement.features.canExport);
  assert.equal(entitlement.features.canUseAI, false);

  await prisma.user.deleteMany({ where: { email } });
});

test('subscription: create subscription successfully', async () => {
  const email = `subscription-create-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const subscription = await createSubscription(user.id, 'pro', 'test-card');

  assert.ok(subscription.id, 'subscription id should exist');
  assert.equal(subscription.userId, user.id);
  assert.equal(subscription.planId, 'pro');
  assert.equal(subscription.status, 'active');

  await prisma.user.deleteMany({ where: { email } });
});

test('subscription: cancel subscription successfully', async () => {
  const email = `subscription-cancel-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const subscription = await createSubscription(user.id, 'pro', 'test-card');

  const cancelResult = await cancelSubscription(user.id);

  assert.equal(cancelResult.success, true);

  const cancelledSubscription = await prisma.subscription.findUnique({
    where: { id: subscription.id }
  });

  assert.equal(cancelledSubscription?.cancelAtPeriodEnd, true);

  await prisma.user.deleteMany({ where: { email } });
});

test('timeline: create timeline event successfully', async () => {
  const email = `timeline-create-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  const event = await createTimelineEvent({
    worldId: world.id,
    entityType: 'character',
    entityId: entity.id,
    eventType: 'entity_created',
    title: '创建实体',
    description: '创建了新实体',
    timestamp: new Date(),
    metadata: JSON.stringify({ test: 'data' })
  });

  assert.ok(event.id, 'event id should exist');
  assert.equal(event.worldId, world.id);
  assert.equal(event.eventType, 'entity_created');

  await prisma.user.deleteMany({ where: { email } });
});

test('timeline: get timeline events for world', async () => {
  const email = `timeline-get-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity1 = await createEntity(user.id, {
    worldId: world.id,
    name: '实体1',
    type: 'character',
    summary: '测试实体1'
  });

  const entity2 = await createEntity(user.id, {
    worldId: world.id,
    name: '实体2',
    type: 'location',
    summary: '测试实体2'
  });

  await createTimelineEvent({
    worldId: world.id,
    entityType: 'character',
    entityId: entity1.id,
    eventType: 'entity_created',
    title: '创建实体',
    description: '创建了新实体',
    timestamp: new Date(),
    metadata: JSON.stringify({})
  });

  await createTimelineEvent({
    worldId: world.id,
    entityType: 'location',
    entityId: entity2.id,
    eventType: 'entity_updated',
    title: '更新实体',
    description: '更新了实体',
    timestamp: new Date(),
    metadata: JSON.stringify({})
  });

  const events = await getTimelineEventsByWorld(world.id);

  assert.ok(events.length >= 2, 'should have at least 2 events');

  await prisma.user.deleteMany({ where: { email } });
});

test('timeline: update timeline event successfully', async () => {
  const email = `timeline-update-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  const event = await createTimelineEvent({
    worldId: world.id,
    entityType: 'character',
    entityId: entity.id,
    eventType: 'entity_created',
    title: '创建实体',
    description: '创建了新实体',
    timestamp: new Date(),
    metadata: JSON.stringify({})
  });

  const updatedEvent = await updateTimelineEvent(event.id, {
    title: '更新后的标题',
    description: '更新后的描述',
    eventType: 'entity_updated',
    timestamp: new Date(),
    metadata: JSON.stringify({})
  });

  assert.equal(updatedEvent.title, '更新后的标题');
  assert.equal(updatedEvent.description, '更新后的描述');

  await prisma.user.deleteMany({ where: { email } });
});

test('timeline: delete timeline event successfully', async () => {
  const email = `timeline-delete-${Date.now()}@example.com`;
  const password = 'SecurePass123!';
  const { user } = await registerUser({ email, password });

  const world = await createWorld({
    userId: user.id,
    name: '测试世界',
    description: '这是一个测试世界'
  });

  const entity = await createEntity(user.id, {
    worldId: world.id,
    name: '测试实体',
    type: 'character',
    summary: '这是一个测试实体'
  });

  const event = await createTimelineEvent({
    worldId: world.id,
    entityType: 'character',
    entityId: entity.id,
    eventType: 'entity_created',
    title: '创建实体',
    description: '创建了新实体',
    timestamp: new Date(),
    metadata: JSON.stringify({})
  });

  await deleteTimelineEvent(event.id);

  const deletedEvent = await prisma.timelineEvent.findUnique({
    where: { id: event.id }
  });

  assert.equal(deletedEvent, null);

  await prisma.user.deleteMany({ where: { email } });
});