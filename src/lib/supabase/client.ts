import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'appbey_supabase_url';
const STORAGE_KEY_ANON_KEY = 'appbey_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON_KEY) : null;

  return {
    url: (storedUrl || envUrl || '').trim(),
    anonKey: (storedKey || envKey || '').trim(),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON_KEY, anonKey.trim());
  }
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigHash = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  const configHash = `${config.url}::${config.anonKey}`;

  if (!config.url || !config.anonKey) {
    return null;
  }

  if (supabaseInstance && currentConfigHash === configHash) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentConfigHash = configHash;
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase Client] Error al inicializar cliente Supabase:', err);
    return null;
  }
}

export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<{ success: boolean; message: string }> {
  const targetUrl = url || getStoredSupabaseConfig().url;
  const targetKey = anonKey || getStoredSupabaseConfig().anonKey;

  if (!targetUrl || !targetKey) {
    return {
      success: false,
      message: 'Falta configurar la URL o el Anon Key de Supabase.',
    };
  }

  try {
    const testClient = createClient(targetUrl, targetKey);
    const { error } = await testClient.from('tournaments').select('id').limit(1);

    if (error) {
      // If error is code 42P01 (relation does not exist), tables haven't been migrated yet, but connection works!
      if (error.code === '42P01') {
        return {
          success: true,
          message: 'Conexión a Supabase exitosa (Las tablas aún no han sido creadas. Ejecuta el SQL de inicialización).',
        };
      }
      // If error is code 42501 (insufficient privilege / RLS active), connection is valid but requires grant permissions
      if (error.code === '42501') {
        return {
          success: true,
          message: 'Conexión con Supabase verificada exitosamente. Tu base de datos tiene RLS activo; usa el botón "Copiar Permisos RLS" para permitir lectura al rol anónimo.',
        };
      }
      return {
        success: false,
        message: `Error de Supabase [${error.code || 'ERR'}]: ${error.message}`,
      };
    }

    return {
      success: true,
      message: 'Conexión a Supabase y tablas PostgreSQL verificadas correctamente.',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error de red o conexión: ${message}`,
    };
  }
}
