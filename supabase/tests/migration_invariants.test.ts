import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20261104_audit_followup.sql');

describe('audit follow-up migration', () => {
  it('exists and contains the production-critical RPCs', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('create or replace function public.create_invitation');
    expect(sql).toContain('gen_random_bytes');
    expect(sql).toContain('expires_at > now()');
    expect(sql).toContain('create or replace function public.claim_invitation');
    expect(sql).toContain('create or replace function public.adjust_manual_set');
  });

  it('does not trust a client-supplied invitation code', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    const createFunction = sql.slice(
      sql.indexOf('create or replace function public.create_invitation'),
      sql.indexOf('revoke all on function public.create_invitation')
    );

    expect(createFunction).toContain('generated_code :=');
    expect(createFunction).not.toContain('upper(trim(p_code))');
  });
});
