import { StageConfig, TiebreakerCriteria } from '../../types/tournament';
import { getSupabaseClient } from '../supabase/client';

export interface StageTiebreakerPayload {
  stageId: string;
  tiebreakers: TiebreakerCriteria[];
  config?: Partial<StageConfig>;
  updatedAt: string;
}

export interface PersistenceResult {
  success: boolean;
  persistedIn: 'supabase' | 'none';
  timestamp: string;
  message: string;
  details?: unknown;
}

export async function persistStageTiebreakers(
  stageId: string,
  tiebreakers: TiebreakerCriteria[],
  additionalConfig: Partial<StageConfig> = {}
): Promise<PersistenceResult> {
  const timestamp = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: 'Supabase no está configurado; no se guardó la configuración de la etapa.',
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: 'Se requiere una sesión autenticada para guardar la configuración de la etapa.',
    };
  }

  const { data: current, error: readError } = await supabase
    .from('stages')
    .select('config')
    .eq('id', stageId)
    .single();

  if (readError || !current) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: `No se pudo leer la etapa antes de actualizarla: ${readError?.message || 'etapa no encontrada'}.`,
    };
  }

  const config = {
    ...(current.config || {}),
    ...additionalConfig,
    tiebreakers,
  };

  const { data, error } = await supabase
    .from('stages')
    .update({ config })
    .eq('id', stageId)
    .select('id, config')
    .single();

  if (error || !data) {
    return {
      success: false,
      persistedIn: 'none',
      timestamp,
      message: `No se pudo persistir la configuración de la etapa: ${error?.message || 'respuesta vacía'}.`,
    };
  }

  return {
    success: true,
    persistedIn: 'supabase',
    timestamp,
    message: 'Configuración de etapa persistida en Supabase.',
    details: {
      stageId,
      tiebreakers,
      config: data.config,
      updatedAt: timestamp,
    },
  };
}

export async function fetchStageConfig(
  stageId: string
): Promise<StageTiebreakerPayload | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('stages')
    .select('id, config')
    .eq('id', stageId)
    .maybeSingle();

  if (error || !data) return null;

  const config = (data.config || {}) as Partial<StageConfig>;
  return {
    stageId: data.id,
    tiebreakers: (config.tiebreakers || []) as TiebreakerCriteria[],
    config,
    updatedAt: new Date().toISOString(),
  };
}
