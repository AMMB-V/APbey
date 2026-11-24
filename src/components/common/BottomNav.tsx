import React from 'react';
import { Trophy, TrendingUp, Radio, GitBranch, Users, Tv } from 'lucide-react';
import { ToolsMenu } from './ToolsMenu';
import type { MainTabType } from './Header';

interface BottomNavProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  onOpenStadium?: () => void;
  isPublic?: boolean;
  canPresent?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenStadium,
  isPublic = false,
  canPresent = true,
}) => {
  return (
    <>
      {/* Fixed bottom navigation for phones and portrait tablets */}
      <nav
        aria-label="Navegación móvil inferior"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--chasis)]/95 backdrop-blur-md border-t border-[var(--costura)] shadow-2xl px-2 py-1 flex items-center justify-around safe-bottom"
      >
        {/* 1. Torneos */}
        <button
          type="button"
          onClick={() => setActiveTab('torneos')}
          aria-current={activeTab === 'torneos' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            activeTab === 'torneos'
              ? 'text-amber-400 font-bold'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Trophy className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Torneos</span>
        </button>

        {/* 2. Rankings */}
        <button
          type="button"
          onClick={() => setActiveTab('rankings')}
          aria-current={activeTab === 'rankings' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            activeTab === 'rankings'
              ? 'text-purple-400 font-bold'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Rankings</span>
        </button>

        {/* 3. Marcador (Centrado y prominente - Ley de Fitts: zona del pulgar) */}
        {!isPublic ? <button
          type="button"
          onClick={() => setActiveTab('marcador')}
          aria-current={activeTab === 'marcador' || activeTab === 'referee' ? 'page' : undefined}
          className="relative -top-3 flex flex-col items-center justify-center group"
          title="Abrir Marcador táctil"
        >
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 border-2 ${
              activeTab === 'marcador' || activeTab === 'referee'
                ? 'bg-rose-600 text-[var(--tinta)] border-white shadow-rose-500/30'
                : 'bg-[var(--grafito)] text-[var(--hueso)] border-[var(--cobalto)] shadow-black/50'
            }`}
          >
            <Radio className="w-6 h-6 animate-pulse" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-bold text-[var(--hueso)] mt-0.5">Marcador</span>
        </button> : <button type="button" onClick={() => setActiveTab('participants')}
          aria-current={activeTab === 'participants' ? 'page' : undefined}
          className={`flex min-w-[56px] min-h-[50px] flex-col items-center justify-center rounded-xl py-1 ${activeTab === 'participants' ? 'text-cyan-300 font-bold' : 'text-[var(--acero)]'}`}>
          <Users className="mb-0.5 h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Participantes</span>
        </button>}

        {/* 4. Brackets */}
        <button
          type="button"
          onClick={() => setActiveTab('bracket')}
          aria-current={activeTab === 'bracket' ? 'page' : undefined}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] py-1 rounded-xl transition-colors ${
            activeTab === 'bracket'
              ? 'text-indigo-400 font-bold'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <GitBranch className="w-5 h-5 mb-0.5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Cuadro</span>
        </button>

        {isPublic ? <button type="button" onClick={onOpenStadium} disabled={!canPresent}
          className="flex min-w-[56px] min-h-[50px] flex-col items-center justify-center rounded-xl py-1 text-[var(--acero)] disabled:cursor-not-allowed disabled:opacity-40">
          <Tv className="mb-0.5 h-5 w-5" aria-hidden="true" />
          <span className="text-[10px] tracking-tight">Presentar</span>
        </button> : <ToolsMenu activeTab={activeTab} navigate={setActiveTab} openStadium={onOpenStadium} />}
      </nav>
    </>
  );
};
