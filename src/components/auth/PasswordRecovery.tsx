import { useEffect, useState, type FormEvent } from 'react';
import { getSupabaseClient } from '../../lib/supabase/client';

export function isPasswordRecovery(url: URL) {
  const hash = new URLSearchParams(url.hash.slice(1));
  return url.searchParams.get('recovery') === '1' ||
    hash.get('type') === 'recovery' ||
    (hash.get('error') === 'access_denied' && hash.has('error_code'));
}

export function getPasswordRecoveryRedirectUrl(currentUrl: URL) {
  const configuredUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
  const canonicalOrigin = configuredUrl ||
    (currentUrl.hostname === 'apbet.vercel.app' ? 'https://apbey.vercel.app' : currentUrl.origin);
  return new URL('/?recovery=1', canonicalOrigin).href;
}

export function PasswordRecovery() {
  const initialError = new URLSearchParams(window.location.hash.slice(1)).get('error_code');
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'done'>(
    initialError ? 'invalid' : 'checking'
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialError) return;
    const client = getSupabaseClient();
    if (!client) { setStatus('invalid'); return; }
    const timer = window.setTimeout(() => setStatus(current => current === 'checking' ? 'invalid' : current), 8000);
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setStatus('ready');
      if (event === 'SIGNED_OUT') setStatus(current => current === 'ready' ? 'invalid' : current);
    });
    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [initialError]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (status !== 'ready' || saving) return;
    if (password.length < 8 || password !== confirmation) {
      setError('Usa al menos 8 caracteres y confirma la misma contraseña.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const client = getSupabaseClient();
      if (!client) throw new Error('No se pudo conectar al servicio de acceso.');
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      setStatus('done');
      setPassword('');
      setConfirmation('');
      await client.auth.signOut({ scope: 'local' });
    } catch {
      setError('No se pudo guardar la contraseña. Prueba con una distinta o solicita otro enlace si este caducó.');
    } finally {
      setSaving(false);
    }
  }

  return <main className="mx-auto max-w-md space-y-5 p-6 text-[var(--hueso)]">
    <h1 className="text-xl font-bold">Restablecer contraseña</h1>
    {status === 'checking' && <p role="status">Verificando el enlace…</p>}
    {status === 'invalid' && <div className="space-y-3" role="alert">
      <p>El enlace no es válido o ha caducado. Los enlaces de recuperación solo pueden usarse una vez.</p>
      <a href="/?forgot-password=1" className="acero-btn acero-btn--primary inline-flex">Solicitar un enlace nuevo</a>
    </div>}
    {status === 'done' && <p role="status">Contraseña actualizada. Ya puedes entrar con tu nueva contraseña.</p>}
    {status === 'ready' && <form onSubmit={save} className="space-y-4">
      <label className="block">Nueva contraseña
        <input className="mt-1 block w-full rounded border border-[var(--costura)] bg-[var(--grafito)] p-3"
          type="password" autoComplete="new-password" required minLength={8} value={password} onChange={event => setPassword(event.target.value)} />
      </label>
      <label className="block">Confirmar contraseña
        <input className="mt-1 block w-full rounded border border-[var(--costura)] bg-[var(--grafito)] p-3"
          type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={saving} className="acero-btn acero-btn--primary">{saving ? 'Guardando…' : 'Guardar nueva contraseña'}</button>
    </form>}
    <a href="/" className="inline-block py-2 underline">Volver a APbey</a>
  </main>;
}
