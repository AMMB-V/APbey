import { getSupabaseClient } from './client';

export interface RefereeAssignmentRecord {
  tournamentId: string;
  stageAssignments: Record<string, string | null>;
  groupAssignments: Record<string, string | null>;
  updatedAt: string;
  updatedBy?: string;
}

export interface SupabaseSyncResult {
  success: boolean;
  persistedIn: 'supabase' | 'none';
  timestamp: string;
  message: string;
  recordsUpdated?: number;
  error?: string;
  sqlStatements?: string[];
}

export function generateSupabaseSQL(
  tournamentId: string,
  stageAssignments: Record<string, string | null>,
  groupAssignments: Record<string, string | null>
): string[] {
  const statements: string[] = [];

  for (const [groupId, refereeId] of Object.entries(groupAssignments)) {
    statements.push(
      refereeId
        ? `UPDATE groups SET referee_id = '${refereeId}' WHERE id = '${groupId}';\nUPDATE matches SET referee_id = '${refereeId}' WHERE group_id = '${groupId}' AND status <> 'completed';`
        : `UPDATE groups SET referee_id = NULL WHERE id = '${groupId}';`
    );
  }

  for (const [stageId, refereeId] of Object.entries(stageAssignments)) {
    statements.push(
      refereeId
        ? `UPDATE stages SET config = jsonb_set(coalesce(config, '{}'::jsonb), '{head_referee_id}', '"${refereeId}"'::jsonb) WHERE id = '${stageId}';`
        : `UPDATE stages SET config = config - 'head_referee_id' WHERE id = '${stageId}';`
    );
  }

  const allReferees = new Set<string>();
  Object.values(stageAssignments).forEach((refereeId) => refereeId && allReferees.add(refereeId));
  Object.values(groupAssignments).forEach((refereeId) => refereeId && allReferees.add(refereeId));
  for (const refereeId of allReferees) {
    statements.push(
      `INSERT INTO tournament_referees (tournament_id, profile_id) VALUES ('${tournamentId}', '${refereeId}') ON CONFLICT (tournament_id, profile_id) DO NOTHING;`
    );
  }

  return statements;
}

export async function persistRefereeAssignments(
  tournamentId: string,
  stageAssignments: Record<string, string | null>,
  groupAssignments: Record<string, string | null>,
  releaseOfficial?: string
): Promise<SupabaseSyncResult> {
  const timestamp = new Date().toISOString();
  const sqlStatements = generateSupabaseSQL(tournamentId, stageAssignments, groupAssignments);
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: 'Supabase no está configurado; no se guardaron las asignaciones.',
      sqlStatements,
    };
  }

  const { error } = await supabase.rpc('apply_referee_assignments', {
    p_tournament: tournamentId, p_stages: stageAssignments, p_groups: groupAssignments, p_release: releaseOfficial ?? null,
  });
  if (error) return { success: false, persistedIn: 'none', timestamp, message: error.message, sqlStatements };
  const recordsUpdated = Object.keys(groupAssignments).length;

  return {
    success: true,
    persistedIn: 'supabase',
    timestamp,
    message: `Asignaciones guardadas en Supabase (${recordsUpdated} grupos).`,
    recordsUpdated,
    sqlStatements,
  };
}

export async function fetchRefereeAssignments(
  tournamentId: string
): Promise<RefereeAssignmentRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data: tournament, error: tournamentError } = await supabase
    .from('tournaments')
    .select('id')
    .eq('id', tournamentId)
    .maybeSingle();
  if (tournamentError || !tournament) return null;

  const { data: groups, error: groupsError } = await supabase
    .from('groups')
    .select('id, referee_id, stage_id, stages!inner(tournament_id, config)')
    .eq('stages.tournament_id', tournamentId);
  if (groupsError) return null;

  const groupAssignments: Record<string, string | null> = {};
  const stageAssignments: Record<string, string | null> = {};
  for (const group of groups || []) {
    groupAssignments[group.id] = group.referee_id;
    const stage = Array.isArray(group.stages) ? group.stages[0] : group.stages;
    if (stage && !(group.stage_id in stageAssignments)) {
      stageAssignments[group.stage_id] = (stage.config as Record<string, unknown> | null)?.head_referee_id as string | null || null;
    }
  }

  return {
    tournamentId,
    groupAssignments,
    stageAssignments,
    updatedAt: new Date().toISOString(),
  };
}
