import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261105000024_audit_followup.sql'
);
const consistencyMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261105000025_manual_set_consistency.sql'
);
const undoMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261105000026_undo_battle_rpc.sql'
);
const auditConsolidationMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261112000001_unify_audit_log.sql'
);
const tournamentDeletionMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20261112000002_fix_tournament_delete_dependencies.sql'
);

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

  it('keeps manual set corrections consistent with bracket advancement', () => {
    const sql = readFileSync(consistencyMigrationPath, 'utf8');

    expect(sql).toContain('m.next_match_winner_id, m.next_match_loser_id');
    expect(sql).toContain("set status = 'in_progress'");
    expect(sql).toContain("set status = 'completed'");
    expect(sql).toContain('previous_winner is distinct from m.winner_id');
    expect(sql).toContain('t.status in (\'cancelled\', \'completed\')');
  });

  it('defines an audited transactional undo RPC', () => {
    const sql = readFileSync(undoMigrationPath, 'utf8');

    expect(sql).toContain('create or replace function public.undo_last_battle');
    expect(sql).toContain('p_expected_version');
    expect(sql).toContain('set voided = true');
    expect(sql).toContain('no_battle_to_undo');
    expect(sql).toContain("insert into public.audit_log");
    expect(sql).toContain('grant execute on function public.undo_last_battle(uuid, int) to authenticated');
  });

  it('consolidates administrative audit writes into audit_log', () => {
    const sql = readFileSync(auditConsolidationMigrationPath, 'utf8');

    expect(sql).toContain('insert into public.audit_log');
    expect(sql).toContain('returns public.audit_log');
    expect(sql).toContain('returns setof public.audit_log');
    expect(sql).toContain('drop table public.audit_logs');
  });

  it('deletes tournament dependencies before participants', () => {
    const sql = readFileSync(tournamentDeletionMigrationPath, 'utf8');

    expect(sql).toContain('delete from public.penalties');
    expect(sql).toContain('delete from public.battles');
    expect(sql).toContain('delete from public.matches');
    expect(sql).toContain('delete from public.participants');
    expect(sql.indexOf('delete from public.matches')).toBeLessThan(
      sql.indexOf('delete from public.participants')
    );
    expect(sql).toContain('grant execute on function public.delete_tournament(uuid) to authenticated');
  });
});
