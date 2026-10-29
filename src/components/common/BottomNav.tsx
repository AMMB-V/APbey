import React, { useState } from 'react';
import {
  Trophy,
  TrendingUp,
  Radio,
  Layers,
  MoreHorizontal,
  Shield,
  Award,
  Users,
  Wrench,
  BookOpen,
  Tv,
  X,
  UserCheck,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  onOpenStadium?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenStadium,
}) => {
  const { currentRole } = useTournament();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const isStaff = currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin';

  const handleSelect = (tab: string) => {
    setActiveTab(tab);
    setShowMoreSheet(false);
  };

  return (
    <>
      {/* Fixed Bottom Navigation Bar on Mobile */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--chasis)]/95 backdrop-blur-md border-t border-[var(--costura)] shadow-2xl px-2 py-1 flex items-center justify-around safe-bottom"
      >
        {/* 1. Torneos */}
        <button
          type="button"
          onClick={() => handleSelect('torneos')}
          aria-current={activeTab === 'torneos' || activeTab === 'bracket' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            activeTab === 'torneos' || activeTab === 'bracket'
              ? 'text-[var(--cobalto)] font-bold'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Torneos</span>
        </button>

        {/* 2. Rankings */}
        <button
          type="button"
          onClick={() => handleSelect('rankings')}
          aria-current={activeTab === 'rankings' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            activeTab === 'rankings'
              ? 'text-[var(--cobalto)] font-bold'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Rankings</span>
        </button>

        {/* 3. Marcador (Centrado y prominente - Ley de Fitts: zona del pulgar) */}
        <button
          type="button"
          onClick={() => handleSelect('marcador')}
          aria-current={activeTab === 'marcador' || activeTab === 'referee' ? 'page' : undefined}
          className="relative -top-3 flex flex-col items-center justify-center group"
          title="Abrir Marcador táctil"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-2 ${
              activeTab === 'marcador' || activeTab === 'referee'
                ? 'bg-[var(--cobalto)] text-[var(--tinta)] border-white shadow-blue-500/30'
                : 'bg-[var(--grafito)] text-[var(--hueso)] border-[var(--cobalto)] shadow-black/50'
            }`}
          >
            <Radio className="w-6 h-6 animate-pulse" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-bold text-[var(--hueso)] mt-0.5">Marcador</span>
        </button>

        {/* 4. Deck 3on3 */}
        <button
          type="button"
          onClick={() => handleSelect('deck')}
          aria-current={activeTab === 'deck' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            activeTab === 'deck'
              ? 'text-[var(--cobalto)] font-bold'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Layers className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Deck</span>
        </button>

        {/* 5. Más (Hoja de opciones) */}
        <button
          type="button"
          onClick={() => setShowMoreSheet(true)}
          aria-expanded={showMoreSheet}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            showMoreSheet ? 'text-[var(--cobalto)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <MoreHorizontal className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Más</span>
        </button>
      </nav>

      {/* Accessible Bottom Sheet for "Más" */}
      {showMoreSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Más secciones y herramientas"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
        >
          <div
            className="w-full bg-[var(--chasis)] border-t border-[var(--costura)] rounded-t-3xl p-5 text-[var(--hueso)] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
          >
            {/* Sheet Handle & Close */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--costura)]">
              <div className="flex items-center gap-2">
                <span className="w-8 h-1 bg-[var(--costura)] rounded-full mr-2" />
                <h2 className="text-base font-bold">Más opciones</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreSheet(false)}
                aria-label="Cerrar menú Más"
                className="p-1.5 text-[var(--acero)] hover:text-[var(--hueso)] rounded-lg min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-4">
              {/* Tier List */}
              <button
                type="button"
                onClick={() => handleSelect('tierlist')}
                className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-left flex items-start gap-3 hover:border-[var(--acero)] min-h-[56px]"
              >
                <Shield className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Tier List</div>
                  <div className="text-[10px] text-[var(--acero)]">Meta WBO oficial</div>
                </div>
              </button>

              {/* Salón de la Fama */}
              <button
                type="button"
                onClick={() => handleSelect('rankings')}
                className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-left flex items-start gap-3 hover:border-[var(--acero)] min-h-[56px]"
              >
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Salón de la Fama</div>
                  <div className="text-[10px] text-[var(--acero)]">Campeones y récords</div>
                </div>
              </button>

              {/* Comunidad */}
              <button
                type="button"
                onClick={() => handleSelect('comunidad')}
                className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-left flex items-start gap-3 hover:border-[var(--acero)] min-h-[56px]"
              >
                <Users className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Comunidad</div>
                  <div className="text-[10px] text-[var(--acero)]">Reglas y clubes</div>
                </div>
              </button>

              {/* Participantes */}
              <button
                type="button"
                onClick={() => handleSelect('participants')}
                className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-left flex items-start gap-3 hover:border-[var(--acero)] min-h-[56px]"
              >
                <UserCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Bladers</div>
                  <div className="text-[10px] text-[var(--acero)]">Participantes torneo</div>
                </div>
              </button>

              {/* Modo Estadio / En Vivo */}
              <button
                type="button"
                onClick={() => {
                  setShowMoreSheet(false);
                  if (onOpenStadium) onOpenStadium();
                }}
                className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-left flex items-start gap-3 hover:border-[var(--acero)] min-h-[56px]"
              >
                <Tv className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">En Vivo (Estadio)</div>
                  <div className="text-[10px] text-[var(--acero)]">Modo proyector</div>
                </div>
              </button>

              {/* Guía Técnica */}
              <button
                type="button"
                onClick={() => handleSelect('docs')}
                className="p-3.5 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] text-left flex items-start gap-3 hover:border-[var(--acero)] min-h-[56px]"
              >
                <BookOpen className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold">Guía Software</div>
                  <div className="text-[10px] text-[var(--acero)]">Arquitectura & docs</div>
                </div>
              </button>

              {/* Gestionar (solo para staff) */}
              {isStaff && (
                <button
                  type="button"
                  onClick={() => handleSelect('admin')}
                  className="col-span-2 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-left flex items-center justify-between hover:bg-amber-950/60 min-h-[56px]"
                >
                  <div className="flex items-center gap-3">
                    <Wrench className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-amber-200">Panel de Gestión</div>
                      <div className="text-[10px] text-amber-300/80">Torneos, árbitros y auditoría</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-amber-400 font-bold">Staff →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
