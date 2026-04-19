import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { registerSchema } from '../src/schemas/auth';
import { authMiddleware, type AuthRequest } from '../src/middleware/auth';
import { errorHandler, notFoundHandler, type ApiError } from '../src/middleware/errorHandler';

type MockResponse = {
  statusCode: number;
  body: unknown;
  status: (code: number) => MockResponse;
  json: (payload: unknown) => MockResponse;
};

function createMockResponse(): MockResponse {
  return {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

test('register schema enforces required email and password', () => {
  const invalid = registerSchema.safeParse({});
  assert.equal(invalid.success, false);

  const valid = registerSchema.safeParse({
    email: 'user@example.com',
    password: 'abcdef',
  });
  assert.equal(valid.success, true);
});

test('authMiddleware returns MISSING_TOKEN when auth header is absent', async () => {
  const req = { headers: {} } as AuthRequest;
  const res = createMockResponse();
  let nextCalled = false;
  const next: NextFunction = () => {
    nextCalled = true;
  };

  await authMiddleware(req, res as unknown as Response, next);

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  const payload = res.body as { success?: boolean; error?: { code?: string } };
  assert.equal(payload.success, false);
  assert.equal(payload.error?.code, 'MISSING_TOKEN');
});

test('notFoundHandler returns NOT_FOUND error contract', () => {
  const req = { headers: {}, requestId: 'req-test' } as Request;
  const res = createMockResponse();

  notFoundHandler(req, res as unknown as Response);

  assert.equal(res.statusCode, 404);
  const payload = res.body as {
    success?: boolean;
    error?: { code?: string };
    meta?: { requestId?: string };
  };
  assert.equal(payload.success, false);
  assert.equal(payload.error?.code, 'NOT_FOUND');
  assert.equal(payload.meta?.requestId, 'req-test');
});

test('errorHandler respects statusCode and request id', () => {
  const req = { headers: {}, requestId: 'req-error' } as Request;
  const res = createMockResponse();
  const err = new Error('bad request') as ApiError;
  err.statusCode = 400;
  err.code = 'BAD_REQUEST';

  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    errorHandler(err, req, res as unknown as Response, (() => {}) as NextFunction);
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(res.statusCode, 400);
  const payload = res.body as {
    success?: boolean;
    error?: { code?: string; message?: string };
    meta?: { requestId?: string };
  };
  assert.equal(payload.success, false);
  assert.equal(payload.error?.code, 'BAD_REQUEST');
  assert.equal(payload.error?.message, 'bad request');
  assert.equal(payload.meta?.requestId, 'req-error');
});
