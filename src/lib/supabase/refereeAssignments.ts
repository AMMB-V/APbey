import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAccessToken } from './client';

export interface RefereeAssignmentRecord {
  tournamentId: string;
  stageAssignments: Record<string, string | null>; // stageId -> refereeId
  groupAssignments: Record<string, string | null>; // groupId -> refereeId
  updatedAt: string;
  updatedBy?: string;
}

export interface SupabaseSyncResult {
  success: boolean;
  persistedIn: 'supabase' | 'backend' | 'local';
  timestamp: string;
  message: string;
  recordsUpdated?: number;
  error?: string;
  sqlStatements?: string[];
}

const STORAGE_KEY = 'bey_referee_assignments_';

// Lazy-initialized Supabase client
let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClientInstance) return supabaseClientInstance;

  const url =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL);

  const anonKey =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY);

  if (url && anonKey) {
    try {
      supabaseClientInstance = createClient(url, anonKey);
      return supabaseClientInstance;
    } catch (e) {
      console.warn('Could not initialize Supabase client:', e);
    }
  }

  return null;
}

/**
 * Generate executable PostgreSQL SQL statements that Supabase can run
 * based on the current referee assignments.
 */
export function generateSupabaseSQL(
  tournamentId: string,
  stageAssignments: Record<string, string | null>,
  groupAssignments: Record<string, string | null>
): string[] {
  const statements: string[] = [];

  // Group assignments update
  for (const [groupId, refereeId] of Object.entries(groupAssignments)) {
    if (refereeId) {
      statements.push(
        `-- Asignar árbitro al grupo y a sus partidas vinculadas\n` +
        `UPDATE groups SET referee_id = '${refereeId}' WHERE id = '${groupId}';\n` +
        `UPDATE matches SET referee_id = '${refereeId}' WHERE group_id = '${groupId}' AND status <> 'completed';`
      );
    } else {
      statements.push(
        `UPDATE groups SET referee_id = NULL WHERE id = '${groupId}';`
      );
    }
  }

  // Stage assignments update
  for (const [stageId, refereeId] of Object.entries(stageAssignments)) {
    if (refereeId) {
      statements.push(
        `-- Asignar árbitro jefe de fase / etapa\n` +
        `UPDATE stages SET config = jsonb_set(coalesce(config, '{}'::jsonb), '{head_referee_id}', '"${refereeId}"'::jsonb) WHERE id = '${stageId}';`
      );
    } else {
      statements.push(
        `UPDATE stages SET config = config - 'head_referee_id' WHERE id = '${stageId}';`
      );
    }
  }

  // Tournament referees roster
  const allReferees = new Set<string>();
  Object.values(stageAssignments).forEach(r => r && allReferees.add(r));
  Object.values(groupAssignments).forEach(r => r && allReferees.add(r));

  for (const refId of allReferees) {
    statements.push(
      `INSERT INTO tournament_referees (tournament_id, profile_id) VALUES ('${tournamentId}', '${refId}') ON CONFLICT (tournament_id, profile_id) DO NOTHING;`
    );
  }

  // Audit log entry in Supabase
  statements.push(
    `INSERT INTO audit_log (table_name, record_id, action, note, created_at) VALUES ('groups', '${tournamentId}', 'update', 'Asignación de árbitros sincronizada', NOW());`
  );

  return statements;
}

/**
 * Persist referee assignments to Supabase with backend and local storage fallbacks.
 */
export async function persistRefereeAssignments(
  tournamentId: string,
  stageAssignments: Record<string, string | null>,
  groupAssignments: Record<string, string | null>,
  updatedBy?: string
): Promise<SupabaseSyncResult> {
  const timestamp = new Date().toISOString();
  const payload: RefereeAssignmentRecord = {
    tournamentId,
    stageAssignments,
    groupAssignments,
    updatedAt: timestamp,
    updatedBy,
  };

  const sqlStatements = generateSupabaseSQL(tournamentId, stageAssignments, groupAssignments);

  // 1. Cache locally immediately
  try {
    localStorage.setItem(`${STORAGE_KEY}${tournamentId}`, JSON.stringify(payload));
  } catch {
    // ignore quota
  }

  // 2. Try Supabase direct client if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let count = 0;
      // Update groups in Supabase
      for (const [groupId, refereeId] of Object.entries(groupAssignments)) {
        const { error: groupError } = await supabase
          .from('groups')
          .update({ referee_id: refereeId })
          .eq('id', groupId);

        if (!groupError) {
          count++;
          // Also update matches in group
          await supabase
            .from('matches')
            .update({ referee_id: refereeId })
            .eq('group_id', groupId);
        }
      }

      // Log to Supabase audit_log
      await supabase.from('audit_log').insert({
        table_name: 'groups',
        record_id: tournamentId,
        action: 'update',
        note: `Asignación de árbitros guardada (${count} grupos actualizados)`,
      });

      return {
        success: true,
        persistedIn: 'supabase',
        timestamp,
        message: `Asignaciones guardadas y sincronizadas exitosamente en Supabase (${count} grupos).`,
        recordsUpdated: count,
        sqlStatements,
      };
    } catch (err: any) {
      console.warn('Supabase direct sync notice, trying backend route:', err);
    }
  }

  // 3. Fallback: Save to Fullstack Express Backend API
  try {
    const accessToken = await getSupabaseAccessToken();
    const response = await fetch(`/api/referees/assignments/${encodeURIComponent(tournamentId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      },
      body: JSON.stringify({
        ...payload,
        sqlStatements,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        persistedIn: 'backend',
        timestamp,
        message: 'Asignaciones guardadas en el backend y preparadas para Supabase.',
        recordsUpdated: Object.keys(groupAssignments).length,
        sqlStatements,
        details: data,
      } as any;
    }
  } catch {
    // offline / dev mode
  }

  // 4. Local fallback
  return {
    success: false,
    persistedIn: 'local',
    timestamp,
    message: 'No se pudieron persistir las asignaciones en un backend autorizado. La copia local queda disponible para recuperación offline.',
    recordsUpdated: Object.keys(groupAssignments).length,
    sqlStatements,
  };
}

/**
 * Fetch saved referee assignments for a tournament.
 */
export async function fetchRefereeAssignments(
  tournamentId: string
): Promise<RefereeAssignmentRecord | null> {
  // Try backend first
  try {
    const res = await fetch(`/api/referees/assignments/${encodeURIComponent(tournamentId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.assignment) {
        return data.assignment as RefereeAssignmentRecord;
      }
    }
  } catch {
    // fallback
  }

  // Local storage fallback
  try {
    const cached = localStorage.getItem(`${STORAGE_KEY}${tournamentId}`);
    if (cached) {
      return JSON.parse(cached) as RefereeAssignmentRecord;
    }
  } catch {
    // ignore
  }

  return null;
}
