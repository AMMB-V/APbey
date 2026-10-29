import React, { useState, useEffect } from 'react';
import { User, Shield, Trophy, Award, Layers, Edit2, Check, Sparkles, LogOut } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

export const UserProfileView: React.FC = () => {
  const { currentUser, currentRole, logout, updateProfile, matches, participants } = useTournament();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Blader Competidor');
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentUser?.displayName) {
      setDisplayName(currentUser.displayName);
    }
  }, [currentUser?.displayName]);

  const savedDeck = (() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('apbey_deck_3on3');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore error
        }
      }
    }
    return [
      { blade: '', ratchet: '', bit: '' },
      { blade: '', ratchet: '', bit: '' },
      { blade: '', ratchet: '', bit: '' },
    ];
  })();

  // Calculate real stats from completed matches
  const userMatches = matches.filter(
    (m) =>
      m.status === 'completed' &&
      ((m.participant1Id && participants.find((p) => p.id === m.participant1Id)?.profileId === currentUser?.id) ||
        (m.participant2Id && participants.find((p) => p.id === m.participant2Id)?.profileId === currentUser?.id))
  );

  const wins = userMatches.filter((m) => {
    const isP1 = participants.find((p) => p.id === m.participant1Id)?.profileId === currentUser?.id;
    return isP1 ? m.winnerId === m.participant1Id : m.winnerId === m.participant2Id;
  }).length;

  const losses = userMatches.length - wins;
  const winRate = userMatches.length > 0 ? `${((wins / userMatches.length) * 100).toFixed(1)}%` : '0%';
  const tournamentsWon = 0;
  const elo = userMatches.length > 0 ? 1000 + wins * 25 - losses * 15 : 0;

  const handleSaveName = async () => {
    if (!currentUser || isSaving) return;
    setIsSaving(true);
    setSaveFeedback(null);
    try {
      const res = await updateProfile({
        displayName: displayName.trim(),
        email: currentUser.email,
      });
      if (res.success) {
        setIsEditingName(false);
        setSaveFeedback({ type: 'success', message: res.message });
        setTimeout(() => setSaveFeedback(null), 3000);
      } else {
        setSaveFeedback({ type: 'error', message: res.message });
      }
    } catch (error) {
      setSaveFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'No se pudo guardar el nombre.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const roleBadges: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrador General', color: 'bg-rose-950 text-rose-300 border-rose-700' },
    organizer: { label: 'Organizador Oficial', color: 'bg-amber-950 text-amber-300 border-amber-700' },
    referee: { label: 'Árbitro Certificado', color: 'bg-emerald-950 text-emerald-300 border-emerald-700' },
    blader: { label: 'Blader Competidor', color: 'bg-blue-950 text-blue-300 border-blue-700' },
    public: { label: 'Visitante / Espectador', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
  };

  const roleMeta = roleBadges[currentRole] || roleBadges.blader;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-5">
      {/* View Header with accessible h1 */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-[var(--cobalto)] shrink-0" aria-hidden="true" />
          <span>Perfil del Blader</span>
        </h1>
        <p className="text-xs text-[var(--acero)] mt-0.5">
          Historial competitivo, estadísticas personales y configuración de cuenta
        </p>
      </div>

      {/* Main Profile Card */}
      <div className="bg-[var(--chasis)] border-2 border-[var(--costura)] rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--cobalto)] text-[var(--tinta)] flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="bg-[var(--grafito)] border border-[var(--cobalto)] rounded-xl px-3 py-1.5 text-sm font-bold text-[var(--hueso)] outline-hidden min-h-[38px]"
                    placeholder="Tu nombre público"
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    disabled={isSaving}
                    className="p-2 rounded-xl bg-[var(--cobalto)] text-[var(--tinta)] font-bold text-xs min-h-[38px] flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-[var(--hueso)]">{displayName}</h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    aria-label="Editar nombre"
                    className="p-1 text-[var(--acero)] hover:text-[var(--hueso)] rounded-lg min-w-[32px] min-h-[32px] flex items-center justify-center"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleMeta.color}`}>
                  {roleMeta.label}
                </span>
                <span className="text-xs text-[var(--acero)] font-mono">
                  {currentUser?.email || 'blader@appbey.arena'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-[var(--grafito)] border border-[var(--costura)] hover:border-rose-500 hover:text-rose-400 text-xs font-semibold text-[var(--acero)] min-h-[40px] flex items-center gap-2 transition-colors ml-auto sm:ml-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {saveFeedback && (
          <div
            role="status"
            aria-live="polite"
            className={`p-3 rounded-xl text-xs font-bold ${
              saveFeedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-600/80 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-600/80 text-rose-300'
            }`}
          >
            {saveFeedback.type === 'success' ? '✓ ' : '⚠ '}
            {saveFeedback.message}
          </div>
        )}

        {/* Stats Grid: Clean 0 or dynamic match stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--costura)]">
          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Rating ELO
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-400 mt-0.5">
              {elo}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Récord V / D
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
              {wins} - {losses}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Efectividad
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-0.5">
              {winRate}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Torneos Ganados
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-0.5">
              🏆 {tournamentsWon}
            </div>
          </div>
        </div>
      </div>

      {/* Registered Deck 3on3 Preview */}
      <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-5 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-black text-[var(--hueso)]">
              Deck 3on3 Registrado
            </h2>
          </div>
          <span className="text-xs text-[var(--acero)] font-bold">WBO Format</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {savedDeck.map((item: any, i: number) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] flex flex-col gap-1 min-h-[70px]"
            >
              <div className="text-[10px] text-[var(--acero)] font-mono font-bold uppercase">
                Slot #{i + 1}
              </div>
              <div className="text-xs font-black text-[var(--hueso)]">
                {item.blade || 'Sin Blade asignada'}
              </div>
              <div className="text-[11px] font-mono text-cyan-400">
                {item.ratchet || item.bit ? `${item.ratchet} ${item.bit}` : 'Pendiente de armado'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
