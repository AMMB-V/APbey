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
    expect(body.privilegedPersistence).toBe(false);
    expect(body.timestamp).toBeDefined();
  });

  it('does not report production ready without a privileged Supabase credential', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousUrl = process.env.SUPABASE_URL;
    const previousAnonKey = process.env.SUPABASE_ANON_KEY;
    const previousServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const previousSecretKey = process.env.SUPABASE_SECRET_KEY;

    process.env.NODE_ENV = 'production';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;

    try {
      const { req, res } = createMockReqRes({ url: '/api/health', method: 'GET' });
      await handler(req as any, res as any);
      expect(res.statusCode).toBe(503);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('degraded');
      expect(body.privilegedPersistence).toBe(false);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousUrl === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previousUrl;
      if (previousAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY;
      else process.env.SUPABASE_ANON_KEY = previousAnonKey;
      if (previousServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceRole;
      if (previousSecretKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
      else process.env.SUPABASE_SECRET_KEY = previousSecretKey;
    }
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

  it('sets Access-Control-Allow-Origin header matching ALLOWED_ORIGINS', async () => {
    process.env.ALLOWED_ORIGINS = 'https://arena.example.com,https://apbey.vercel.app';
    const { req, res } = createMockReqRes({
      url: '/api/health',
      method: 'GET',
      headers: { origin: 'https://arena.example.com' },
    });
    await handler(req as any, res as any);
    expect(res.headers['access-control-allow-origin']).toBe('https://arena.example.com');
    delete process.env.ALLOWED_ORIGINS;
  });
});
