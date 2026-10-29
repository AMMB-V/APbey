import React, { useState } from 'react';
import { User, Shield, Trophy, Award, Layers, Edit2, Check, Sparkles, LogOut } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

export const UserProfileView: React.FC = () => {
  const { currentUser, currentRole, logout } = useTournament();
  const [isEditingName, setIsEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Blader Competidor');
  const [saveFeedback, setSaveFeedback] = useState(false);

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
      { blade: 'Phoenix Wing', ratchet: '9-60', bit: 'Point (P)' },
      { blade: 'Hells Scythe', ratchet: '3-60', bit: 'Ball (B)' },
      { blade: 'Wizard Arrow', ratchet: '4-60', bit: 'Flat (F)' },
    ];
  })();

  const handleSaveName = () => {
    setIsEditingName(false);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
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
                  />
                  <button
                    type="button"
                    onClick={handleSaveName}
                    className="p-2 rounded-xl bg-[var(--cobalto)] text-[var(--tinta)] font-bold text-xs min-h-[38px] flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar</span>
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
          <div className="p-3 bg-emerald-950/60 border border-emerald-600/80 rounded-xl text-xs font-bold text-emerald-300">
            ✓ Nombre de usuario actualizado exitosamente.
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--costura)]">
          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Rating ELO
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-purple-400 mt-0.5">
              1,845
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Récord V / D
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-0.5">
              48 - 9
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Efectividad
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400 mt-0.5">
              84.2%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-center">
            <div className="text-[10px] text-[var(--acero)] uppercase tracking-wider font-semibold">
              Torneos Ganados
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-0.5">
              🏆 5
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
          <span className="text-xs text-emerald-400 font-bold">Certificado WBO</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {savedDeck.map((item: any, i: number) => (
            <div
              key={i}
              className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] flex flex-col gap-1"
            >
              <div className="text-[10px] text-[var(--acero)] font-mono font-bold uppercase">
                Slot #{i + 1}
              </div>
              <div className="text-xs font-black text-[var(--hueso)]">{item.blade}</div>
              <div className="text-[11px] font-mono text-cyan-400">
                {item.ratchet} {item.bit}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
