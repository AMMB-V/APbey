const healthUrl = process.env.STAGING_HEALTH_URL || 'http://localhost:3000/api/health';
const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing staging environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
  console.warn('Warning: Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_SECRET_KEY is set. Admin operations (invitation validation, referee assignments) will not work.');
}

const response = await fetch(healthUrl, {
  headers: { Accept: 'application/json' },
  signal: AbortSignal.timeout(10_000),
});
const body = await response.text();

if (!response.ok) {
  console.error(`Staging health check failed (${response.status}): ${body}`);
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(body);
} catch {
  console.error('Staging health endpoint did not return JSON.');
  process.exit(1);
}

if (payload.status !== 'ok' || payload.persistence !== 'ready') {
  console.error(`Staging is not ready: ${body}`);
  process.exit(1);
}

console.log(`Staging preflight passed: ${healthUrl}`);
