import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '100kb' }));
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const incomingRequestId = req.header('x-request-id');
    const requestId = incomingRequestId && /^[A-Za-z0-9._:-]{8,100}$/.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();
    res.setHeader('X-Request-Id', requestId);
    next();
  });
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_IFRAME) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.get('/api/health', async (_req, res) => {
    const privilegedKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const healthKey = privilegedKey || process.env.SUPABASE_ANON_KEY;

    const hasSupabaseConfiguration = Boolean(process.env.SUPABASE_URL && healthKey);
    let persistenceStatus: 'ready' | 'unconfigured' | 'unreachable' = 'unconfigured';
    let persistenceError: string | null = null;

    if (hasSupabaseConfiguration) {
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

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ok' : 'degraded',
      service: 'apbey-backend',
      persistence: persistenceStatus,
      privilegedPersistence: Boolean(privilegedKey),
      ...(!isProduction && persistenceError ? { details: persistenceError } : {}),
      requestId: res.getHeader('X-Request-Id'),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/invitations/validate/:code', async (req, res) => {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9-]{4,128}$/.test(code)) {
      return res.status(400).json({ valid: false, message: 'Código de invitación inválido.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return res.status(503).json({ valid: false, message: 'La validación de invitaciones no está configurada.' });
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
        console.error('Invitation validation failed', { requestId: res.getHeader('X-Request-Id'), error: error.message });
        return res.status(503).json({ valid: false, message: 'No se pudo validar la invitación.' });
      }
      if (!data) return res.status(404).json({ valid: false, message: 'La invitación no existe o ha expirado.' });
      return res.json({
        valid: true,
        role: data.role,
        tournamentId: data.tournament_id,
        expiresAt: data.expires_at,
      });
    } catch (error) {
      console.error('Invitation validation error', { requestId: res.getHeader('X-Request-Id'), error });
      return res.status(503).json({ valid: false, message: 'No se pudo validar la invitación.' });
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res, filePath) => {
        if (path.basename(filePath) === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }));
    app.use((_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Backend server ready at http://0.0.0.0:${port}`);
  });
}

void startServer();
