import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
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
    const hasSupabaseConfiguration = Boolean(
      process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
    );
    let persistenceStatus: 'ready' | 'unconfigured' | 'unreachable' = 'unconfigured';

    if (hasSupabaseConfiguration) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!
        );
        const { error } = await supabase
          .from('tournaments')
          .select('id', { head: true, count: 'exact' })
          .limit(1);
        persistenceStatus = error ? 'unreachable' : 'ready';
      } catch {
        persistenceStatus = 'unreachable';
      }
    }

    const isReady = !isProduction || persistenceStatus === 'ready';

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ok' : 'degraded',
      service: 'appbey-backend',
      persistence: persistenceStatus,
      requestId: res.getHeader('X-Request-Id'),
      timestamp: new Date().toISOString(),
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';
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
