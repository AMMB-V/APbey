import { createClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

type Request = IncomingMessage & { method?: string };
type Response = ServerResponse & {
  statusCode: number;
};

function sendJson(res: Response, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export default async function handler(req: Request, res: Response): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = /^[A-Za-z0-9._:-]{8,100}$/.test(String(req.headers['x-request-id'] || ''))
    ? String(req.headers['x-request-id'])
    : randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const origin = req.headers.origin ? String(req.headers.origin) : '';
  const rawAllowed = process.env.ALLOWED_ORIGINS || '';
  const allowedOrigins = new Set(
    rawAllowed
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  );

  if (origin && (allowedOrigins.has(origin) || allowedOrigins.has('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else if (!rawAllowed) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'GET') {
    sendJson(res, 405, { message: 'Método no permitido.' });
    return;
  }

  const url = new URL(req.url || '/', 'https://vercel.local');
  const requestPath = url.searchParams.get('path')
    ? `/${url.searchParams.get('path')!.replace(/^\/+/, '')}`
    : url.pathname;
  if (requestPath === '/api/health' || requestPath === '/health') {
    const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const healthKey = privilegedKey || process.env.SUPABASE_ANON_KEY;

    const hasConfiguration = Boolean(process.env.SUPABASE_URL && healthKey);
    let persistenceStatus: 'ready' | 'unconfigured' | 'unreachable' = 'unconfigured';
    let persistenceError: string | null = null;

    if (hasConfiguration) {
      try {
        const supabase = createClient(process.env.SUPABASE_URL!, healthKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { error } = await supabase
          .from('tournaments')
          .select('id')
          .limit(1);

        if (!error) {
          persistenceStatus = 'ready';
        } else {
          persistenceError = error.message || error.details || error.code || JSON.stringify(error);
          console.error('[Health] persistence check failed:', {
            error,
            credential: privilegedKey ? 'privileged' : 'anonymous',
          });
        }
      } catch (err) {
        persistenceError = err instanceof Error ? err.message : String(err);
        console.error('[Health] persistence check exception:', err);
      }
      if (persistenceStatus !== 'ready') {
        persistenceStatus = 'unreachable';
      }
    }
    const isReady = (!isProduction && persistenceStatus === 'unconfigured') ||
      (persistenceStatus === 'ready' && (!isProduction || Boolean(privilegedKey)));
    sendJson(res, isReady ? 200 : 503, {
      status: isReady ? 'ok' : 'degraded',
      service: 'apbey-backend',
      persistence: persistenceStatus,
      privilegedPersistence: Boolean(privilegedKey),
      ...(!isProduction && persistenceError ? { details: persistenceError } : {}),
      requestId,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const invitationMatch = requestPath.match(/^(?:\/api)?\/invitations\/validate\/([^/]+)$/);
  if (!invitationMatch) {
    sendJson(res, 404, { message: 'Ruta no encontrada.' });
    return;
  }

  const code = decodeURIComponent(invitationMatch[1]).trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,128}$/.test(code)) {
    sendJson(res, 400, { valid: false, message: 'Código de invitación inválido.' });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    sendJson(res, 503, { valid: false, message: 'La validación de invitaciones no está configurada.' });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('invitations')
      .select('role, tournament_id, expires_at')
      .eq('code', code)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      console.error('Invitation validation failed', { requestId, error: error.message });
      sendJson(res, 503, { valid: false, message: 'No se pudo validar la invitación.' });
      return;
    }
    if (!data) {
      sendJson(res, 404, { valid: false, message: 'La invitación no existe o ha expirado.' });
      return;
    }
    sendJson(res, 200, {
      valid: true,
      role: data.role,
      tournamentId: data.tournament_id,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error('Invitation validation error', { requestId, error });
    sendJson(res, 503, { valid: false, message: 'No se pudo validar la invitación.' });
  }
}
