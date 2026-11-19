import { describe, expect, it } from 'vitest';
import handler from '../../../api/server';

function createMockReqRes(options: { url: string; method?: string; headers?: Record<string, string> }) {
  const req = {
    method: options.method || 'GET',
    url: options.url,
    headers: options.headers || {},
  };
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: '',
    setHeader(key: string, value: string) {
      this.headers[key.toLowerCase()] = value;
    },
    end(chunk?: string) {
      if (chunk) this.body = chunk;
    },
  };
  return { req, res };
}

describe('Vercel serverless api handler', () => {
  it('handles OPTIONS request with 204', async () => {
    const { req, res } = createMockReqRes({ url: '/api/health', method: 'OPTIONS' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(204);
  });

  it('rejects non-GET methods with 405', async () => {
    const { req, res } = createMockReqRes({ url: '/api/health', method: 'POST' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(405);
    const body = JSON.parse(res.body);
    expect(body.message).toContain('no permitido');
  });

  it('responds to /api/health with status ok and apbey-backend service', async () => {
    const { req, res } = createMockReqRes({ url: '/api/health', method: 'GET' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('apbey-backend');
    expect(body.persistence).toBe('unconfigured');
    expect(body.timestamp).toBeDefined();
  });

  it('rejects invalid invitation codes with 400', async () => {
    const { req, res } = createMockReqRes({ url: '/api/invitations/validate/12', method: 'GET' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.valid).toBe(false);
  });

  it('returns 503 for valid invitation code when supabase is unconfigured', async () => {
    const { req, res } = createMockReqRes({ url: '/api/invitations/validate/VALID-CODE-1234', method: 'GET' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.valid).toBe(false);
    expect(body.message).toContain('no está configurada');
  });

  it('returns 404 for unknown routes', async () => {
    const { req, res } = createMockReqRes({ url: '/api/unknown', method: 'GET' });
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(404);
  });
});
