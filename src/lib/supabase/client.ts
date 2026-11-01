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

export function getSupabaseDashboardUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    const projectRef = hostname.endsWith('.supabase.co')
      ? hostname.slice(0, -'.supabase.co'.length)
      : '';

    return projectRef
      ? `https://supabase.com/dashboard/project/${projectRef}`
      : 'https://supabase.com/dashboard';
  } catch {
    return 'https://supabase.com/dashboard';
  }
}

export function getSupabaseSqlEditorUrl(url: string): string {
  const dashboardUrl = getSupabaseDashboardUrl(url);
  return dashboardUrl === 'https://supabase.com/dashboard'
    ? dashboardUrl
    : `${dashboardUrl}/sql`;
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

export async function getSupabaseAccessToken(): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) {
    console.error('[Supabase Auth] Error al leer la sesión:', error);
    return null;
  }
  return data.session?.access_token || null;
}

export async function testSupabaseConnection(
  url?: string,
  anonKey?: string,
  validateSession = true
): Promise<{ success: boolean; message: string }> {
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
          message: 'Conexión con Supabase verificada; la instancia respondió con RLS activo. Comprueba que las migraciones del repositorio estén aplicadas.',
        };
      }
      return {
        success: false,
        message: `Error de Supabase [${error.code || 'ERR'}]: ${error.message}`,
      };
    }

    if (!validateSession) {
      return {
        success: true,
        message: 'Conexión a Supabase verificada. La sesión se validará desde el cliente activo.',
      };
    }

    const { data: userData, error: userError } = await testClient.auth.getUser();
    if (userError) {
      return {
        success: false,
        message: `La base responde, pero la sesión no es válida: ${userError.message}`,
      };
    }
    if (!userData.user) {
      return {
        success: false,
        message: 'Supabase responde correctamente. Inicia sesión para publicar torneos y registrar arbitrajes.',
      };
    }

    const { data: profile, error: profileError } = await testClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();
    if (profileError) {
      return {
        success: false,
        message: `La sesión existe, pero no se pudo validar el perfil: ${profileError.message}`,
      };
    }
    if (!profile) {
      return {
        success: false,
        message: 'La sesión existe, pero no hay un perfil asociado en public.profiles.',
      };
    }
    if (profile.role !== 'admin' && profile.role !== 'organizer' && profile.role !== 'referee') {
      return {
        success: false,
        message: `La sesión tiene el rol "${profile.role}", que no puede operar torneos.`,
      };
    }

    return {
      success: true,
      message: `Supabase conectado y sesión válida (${profile.role}).`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Error de red o conexión: ${message}`,
    };
  }
}
