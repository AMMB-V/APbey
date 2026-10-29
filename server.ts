import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const STAGE_CONFIGS_FILE = path.resolve(DATA_DIR, 'stage_configs.json');
const REFEREE_ASSIGNMENTS_FILE = path.resolve(DATA_DIR, 'referee_assignments.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readStoredConfigs(): Record<string, unknown> {
  try {
    if (fs.existsSync(STAGE_CONFIGS_FILE)) {
      const content = fs.readFileSync(STAGE_CONFIGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading stage_configs.json:', err);
  }
  return {};
}

function writeStoredConfigs(data: Record<string, unknown>): void {
  try {
    const temporaryFile = `${STAGE_CONFIGS_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(temporaryFile, STAGE_CONFIGS_FILE);
  } catch (err) {
    console.error('Error writing stage_configs.json:', err);
  }
}

function readStoredAssignments(): Record<string, unknown> {
  try {
    if (fs.existsSync(REFEREE_ASSIGNMENTS_FILE)) {
      const content = fs.readFileSync(REFEREE_ASSIGNMENTS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading referee_assignments.json:', err);
  }
  return {};
}

function writeStoredAssignments(data: Record<string, unknown>): void {
  try {
    const temporaryFile = `${REFEREE_ASSIGNMENTS_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(temporaryFile, REFEREE_ASSIGNMENTS_FILE);
  } catch (err) {
    console.error('Error writing referee_assignments.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '100kb' }));
  app.disable('x-powered-by');
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_IFRAME) {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    }
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const authClient = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
    : null;

  type AuthenticatedRequest = express.Request & {
    authUser?: { id: string; role: string };
  };

  const requireRoles = (...roles: string[]) => async (
    req: AuthenticatedRequest,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!authClient) {
      return res.status(503).json({
        error: 'auth_not_configured',
        message: 'La autenticación Supabase no está configurada en el backend.',
      });
    }

    const authorization = req.header('Authorization');
    const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'Se requiere un token Bearer para modificar datos.',
      });
    }

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'La sesión no es válida o ha expirado.',
      });
    }

    const { data: profile, error: profileError } = await authClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError || !profile?.role || !roles.includes(profile.role)) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'El usuario no tiene permisos para esta operación.',
      });
    }

    req.authUser = { id: userData.user.id, role: profile.role };
    next();
  };

  const allowedOrigins = new Set(
    (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );

  // CORS middleware for API routes
  app.use((_req, res, next) => {
    const origin = _req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (_req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'appbey-backend',
      timestamp: new Date().toISOString(),
    });
  });

  // GET Stage configuration & tiebreaker rules
  app.get('/api/stages/:stageId/config', (req, res) => {
    const { stageId } = req.params;
    const configs = readStoredConfigs();
    const config = configs[stageId] || null;

    res.json({
      stageId,
      config,
      found: Boolean(config),
    });
  });

  // PUT Stage tiebreaker rules
  app.put('/api/stages/:stageId/tiebreakers', requireRoles('admin', 'organizer'), (req, res) => {
    const { stageId } = req.params;
    const { tiebreakers, config } = req.body;

    if (!Array.isArray(tiebreakers) || tiebreakers.length > 20 || tiebreakers.some((item) => typeof item !== 'string')) {
      return res.status(400).json({
        error: 'tiebreakers must be an array of TiebreakerCriteria strings',
      });
    }

    const configs = readStoredConfigs();
    const previous = (configs[stageId] as Record<string, unknown>) || {};

    const updatedConfig = {
      ...previous,
      stageId,
      tiebreakers,
      config: config || previous.config || {},
      updatedAt: new Date().toISOString(),
    };

    configs[stageId] = updatedConfig;
    writeStoredConfigs(configs);

    console.log(`[Backend] Persisted tiebreakers for stage "${stageId}":`, tiebreakers);

    res.json({
      success: true,
      stageId,
      tiebreakers,
      updatedAt: updatedConfig.updatedAt,
      message: `Criterios de desempate para la etapa ${stageId} guardados en backend.`,
    });
  });

  // PUT Stage general config
  app.put('/api/stages/:stageId/config', requireRoles('admin', 'organizer'), (req, res) => {
    const { stageId } = req.params;
    const incoming = req.body;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      return res.status(400).json({
        error: 'invalid_payload',
        message: 'La configuración debe ser un objeto JSON.',
      });
    }

    const configs = readStoredConfigs();
    const current = (configs[stageId] as Record<string, unknown>) || {};
    const updated = {
      ...current,
      ...incoming,
      stageId,
      updatedAt: new Date().toISOString(),
    };

    configs[stageId] = updated;
    writeStoredConfigs(configs);

    res.json({
      success: true,
      stageId,
      config: updated,
    });
  });


  // GET Tournaments list
  app.get('/api/tournaments', (_req, res) => {
    const configs = readStoredConfigs();
    const list = Object.keys(configs).map(k => ({ id: k, ...((configs[k] as Record<string, unknown>) || {}) }));
    res.json({
      success: true,
      count: list.length,
      tournaments: list,
    });
  });

  // GET Referee assignments for a tournament
  app.get('/api/referees/assignments/:tournamentId', (req, res) => {
    const { tournamentId } = req.params;
    const assignments = readStoredAssignments();
    const assignment = assignments[tournamentId] || null;

    res.json({
      tournamentId,
      assignment,
      found: Boolean(assignment),
    });
  });

  // PUT Referee assignments for a tournament
  app.put('/api/referees/assignments/:tournamentId', requireRoles('admin', 'organizer'), (req, res) => {
    const { tournamentId } = req.params;
    const { groupAssignments, stageAssignments } = req.body;
    if (
      (groupAssignments !== undefined && (!groupAssignments || typeof groupAssignments !== 'object' || Array.isArray(groupAssignments))) ||
      (stageAssignments !== undefined && (!stageAssignments || typeof stageAssignments !== 'object' || Array.isArray(stageAssignments)))
    ) {
      return res.status(400).json({
        error: 'invalid_payload',
        message: 'Las asignaciones deben ser objetos JSON.',
      });
    }

    const assignments = readStoredAssignments();
    const current = (assignments[tournamentId] as Record<string, unknown>) || {};

    const updated = {
      ...current,
      tournamentId,
      groupAssignments: groupAssignments !== undefined ? groupAssignments : (current.groupAssignments || {}),
      stageAssignments: stageAssignments !== undefined ? stageAssignments : (current.stageAssignments || {}),
      updatedAt: new Date().toISOString(),
    };

    assignments[tournamentId] = updated;
    writeStoredAssignments(assignments);

    res.json({
      success: true,
      tournamentId,
      assignment: updated,
      message: `Asignación de árbitros guardada en backend para el torneo ${tournamentId}.`,
    });
  });

  // Setup Vite or static serving
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server ready at http://0.0.0.0:${PORT}`);
  });
}

startServer();
