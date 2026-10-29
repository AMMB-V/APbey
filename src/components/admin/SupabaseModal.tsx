import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  getStoredSupabaseConfig,
  getSupabaseDashboardUrl,
  getSupabaseSqlEditorUrl,
} from '../../lib/supabase/client';
import { SUPABASE_MIGRATION_SQL } from '../../lib/supabase/schema';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Shield,
  UploadCloud,
  Check,
  X,
} from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { supabaseSyncInfo, syncCurrentTournamentToSupabase, updateSupabaseKeys, activeTournament } = useTournament();

  const currentCfg = getStoredSupabaseConfig();
  const [url, setUrl] = useState<string>(currentCfg.url);
  const [anonKey, setAnonKey] = useState<string>(currentCfg.anonKey || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const dashboardUrl = getSupabaseDashboardUrl(url);
  const sqlEditorUrl = getSupabaseSqlEditorUrl(url);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await updateSupabaseKeys(url, anonKey);
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', text: `Fallo al verificar: ${msg}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await syncCurrentTournamentToSupabase();
      if (res.success) {
        setFeedback({ type: 'success', text: res.message });
      } else {
        setFeedback({ type: 'error', text: res.message });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFeedback({ type: 'error', text: `Error de sincronización: ${msg}` });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] shadow-2xl max-w-2xl w-full text-[var(--hueso)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--costura)] bg-[var(--grafito)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Conexión a Base de Datos Supabase</h2>
              <p className="text-xs text-[var(--acero)]">PostgreSQL 15 · Row Level Security (RLS) · Realtime</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--acero)] hover:text-white rounded-md transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Current Status Box */}
          <div className={`p-4 rounded-lg border flex items-start justify-between gap-4 ${
            supabaseSyncInfo.isConnected
              ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
              : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              {supabaseSyncInfo.isConnected ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-sm">
                  {supabaseSyncInfo.isConnected ? 'Supabase Conectado y Operativo' : 'Modo Local / Esperando Credenciales'}
                </div>
                <div className="text-xs text-[var(--acero)] leading-relaxed">
                  {supabaseSyncInfo.message}
                </div>
                {supabaseSyncInfo.lastSync && (
                  <div className="text-[11px] font-mono text-[var(--acero)] pt-1">
                    Última sincronización exitosa: {supabaseSyncInfo.lastSync}
                  </div>
                )}
              </div>
            </div>

            {supabaseSyncInfo.isConnected && (
              <button
                onClick={handleSyncData}
                disabled={isSyncing}
                className="btn btn--primary text-xs shrink-0 py-1.5 px-3"
              >
                <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Subir Torneo'}
              </button>
            )}
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSaveAndTest} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--acero)] uppercase tracking-wider">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                required
                className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] px-3.5 py-2.5 text-sm text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)] font-mono"
              />
              <span className="text-[11px] text-[var(--acero)]">
                Configura aquí la URL de tu instancia de Supabase y su clave anónima pública.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--acero)] uppercase tracking-wider">
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] px-3.5 py-2.5 text-sm text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)] font-mono"
              />
              <span className="text-[11px] text-[var(--acero)]">
                Obtén la clave anónima en Supabase Dashboard: <strong>Project Settings → API → anon/public</strong>.
              </span>
            </div>

            {feedback && (
              <div className={`p-3 rounded-md text-xs font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-700 text-rose-300'
              }`}>
                {feedback.text}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--cobalto)] hover:underline inline-flex items-center gap-1.5 font-medium"
              >
                Abrir Supabase Dashboard
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="submit"
                disabled={isSaving}
                className="btn btn--primary text-sm px-4 py-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                {isSaving ? 'Verificando...' : 'Guardar y Probar Conexión'}
              </button>
            </div>
          </form>

          {/* SQL Migration Script Section */}
          <div className="pt-4 border-t border-[var(--costura)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--hueso)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--cobalto)]" />
                  Script de esquema inicial
                </h3>
                <p className="text-xs text-[var(--acero)]">
                  Úsalo sólo para una instancia nueva; las migraciones versionadas son la fuente recomendada para staging y producción.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="btn btn--secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? '¡Copiado!' : 'Copiar Esquema Completo'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-[var(--grafito)] border border-[var(--costura)] rounded-lg text-xs text-[var(--acero)] space-y-1">
              <div className="text-[var(--hueso)] font-bold">¿La conexión falla?</div>
              <div>1. Verifica que la URL y la clave pública correspondan al mismo proyecto.</div>
              <div>2. Comprueba que las migraciones del repositorio estén aplicadas en esa instancia desde el <a href={sqlEditorUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline">Supabase SQL Editor</a>.</div>
              <div>3. No pegues claves de servicio en el navegador; sólo la clave anon/public es válida aquí.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
