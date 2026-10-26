import { StageConfig, TiebreakerCriteria } from '../../types/tournament';
import { getSupabaseAccessToken } from '../supabase/client';

export interface StageTiebreakerPayload {
  stageId: string;
  tiebreakers: TiebreakerCriteria[];
  config?: Partial<StageConfig>;
  updatedAt: string;
}

export interface PersistenceResult {
  success: boolean;
  persistedIn: 'backend' | 'local';
  timestamp: string;
  message: string;
  details?: unknown;
}

const BACKEND_STORAGE_PREFIX = 'bey_stage_config_';

/**
 * Persists stage tiebreaker rules and stage config to the backend API.
 * Falls back to local storage if backend server is unreachable or offline.
 */
export async function persistStageTiebreakers(
  stageId: string,
  tiebreakers: TiebreakerCriteria[],
  additionalConfig: Partial<StageConfig> = {}
): Promise<PersistenceResult> {
  const timestamp = new Date().toISOString();
  const payload: StageTiebreakerPayload = {
    stageId,
    tiebreakers,
    config: additionalConfig,
    updatedAt: timestamp,
  };

  // Always cache locally as fast offline fallback
  try {
    localStorage.setItem(
      `${BACKEND_STORAGE_PREFIX}${stageId}`,
      JSON.stringify(payload)
    );
  } catch {
    // ignore local storage quota errors
  }

  try {
    const accessToken = await getSupabaseAccessToken();
    // Attempt real HTTP request to backend REST API
    const response = await fetch(`/api/stages/${encodeURIComponent(stageId)}/tiebreakers`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        persistedIn: 'backend',
        timestamp,
        message: 'Reglas de desempate persistidas exitosamente en la base de datos backend.',
        details: data,
      };
    }
  } catch {
    // Server is unreachable or running in SPA-only mode
  }

  return {
    success: false,
    persistedIn: 'local',
    timestamp,
    message: 'No se pudo persistir la configuración en el backend. La copia local queda disponible para recuperación offline.',
  };
}

/**
 * Retrieves the stored stage tiebreaker rules from the backend or local cache.
 */
export async function fetchStageConfig(
  stageId: string
): Promise<StageTiebreakerPayload | null> {
  try {
    const response = await fetch(`/api/stages/${encodeURIComponent(stageId)}/config`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.tiebreakers) {
        return data as StageTiebreakerPayload;
      }
    }
  } catch {
    // backend offline
  }

  try {
    const cached = localStorage.getItem(`${BACKEND_STORAGE_PREFIX}${stageId}`);
    if (cached) {
      return JSON.parse(cached) as StageTiebreakerPayload;
    }
  } catch {
    // ignore
  }

  return null;
}
