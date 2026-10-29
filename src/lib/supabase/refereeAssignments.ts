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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  _updatedBy?: string
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

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: 'Se requiere una sesión autenticada para guardar asignaciones.',
      sqlStatements,
    };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: 'No se pudo identificar al usuario autenticado.',
      sqlStatements,
    };
  }

  const actor = userData.user.id;
  let recordsUpdated = 0;

  for (const [groupId, refereeId] of Object.entries(groupAssignments)) {
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .update({ referee_id: refereeId })
      .eq('id', groupId)
      .select('id')
      .maybeSingle();
    if (groupError || !group) {
      return {
        success: false,
        persistedIn: 'none',
        timestamp,
        message: `No se pudo guardar el grupo ${groupId}: ${groupError?.message || 'grupo no encontrado o no autorizado'}.`,
        sqlStatements,
      };
    }

    const { error: matchesError } = await supabase
      .from('matches')
      .update({ referee_id: refereeId })
      .eq('group_id', groupId)
      .neq('status', 'completed');
    if (matchesError) {
      return {
        success: false,
        persistedIn: 'none',
        timestamp,
        message: `No se pudieron actualizar las partidas del grupo ${groupId}: ${matchesError.message}.`,
        sqlStatements,
      };
    }
    recordsUpdated++;
  }

  for (const [stageId, refereeId] of Object.entries(stageAssignments)) {
    const { data: stage, error: readError } = await supabase
      .from('stages')
      .select('config')
      .eq('id', stageId)
      .single();
    if (readError || !stage) {
      return {
        success: false,
        persistedIn: 'none',
        timestamp,
        message: `No se pudo leer la etapa ${stageId}: ${readError?.message || 'etapa no encontrada'}.`,
        sqlStatements,
      };
    }

    const config = { ...(stage.config || {}) } as Record<string, unknown>;
    if (refereeId) config.head_referee_id = refereeId;
    else delete config.head_referee_id;

    const { error: stageError } = await supabase
      .from('stages')
      .update({ config })
      .eq('id', stageId)
      .select('id')
      .single();
    if (stageError) {
      return {
        success: false,
        persistedIn: 'none',
        timestamp,
        message: `No se pudo guardar la etapa ${stageId}: ${stageError.message}.`,
        sqlStatements,
      };
    }
  }

  const refereeIds = new Set(
    [...Object.values(stageAssignments), ...Object.values(groupAssignments)].filter(
      (refereeId): refereeId is string => Boolean(refereeId)
    )
  );
  if (refereeIds.size > 0) {
    const { error: rosterError } = await supabase
      .from('tournament_referees')
      .upsert([...refereeIds].map((profile_id) => ({ tournament_id: tournamentId, profile_id })));
    if (rosterError) {
      return {
        success: false,
        persistedIn: 'none',
        timestamp,
        message: `No se pudo actualizar el roster de árbitros: ${rosterError.message}.`,
        sqlStatements,
      };
    }
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    table_name: 'tournament_referees',
    record_id: isUuid(tournamentId) ? tournamentId : null,
    action: 'update',
    actor,
  });
  if (auditError) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: `La asignación se actualizó, pero la auditoría falló: ${auditError.message}.`,
      sqlStatements,
    };
  }

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
