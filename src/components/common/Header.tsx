import React, { useState } from 'react';
import {
  Radio,
  LogIn,
  LogOut,
  KeyRound,
  Trophy,
  TrendingUp,
  Layers,
  Shield,
  Users,
  Search,
  Wrench,
  Tv,
  ChevronDown,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from './AceroIcon';
import { SyncBadge } from './SyncBadge';
import { ProfileModal } from '../auth/ProfileModal';

export type MainTabType =
  | 'torneos'
  | 'bracket'
  | 'marcador'
  | 'referee'
  | 'rankings'
  | 'deck'
  | 'tierlist'
  | 'profile'
  | 'participants'
  | 'wizard'
  | 'admin';

interface HeaderProps {
  activeTab: MainTabType;
  setActiveTab: (tab: MainTabType) => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenCommandPalette,
}) => {
  const {
    currentUser,
    currentRole,
    logout,
    openAuthModal,
    setShowStadiumModal,
  } = useTournament();

  const [showProfile, setShowProfile] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  const isStaff = currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin';

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-rose-900/60 text-rose-300 border-rose-700/80' },
    organizer: { label: 'Organizador', color: 'bg-amber-900/60 text-amber-300 border-amber-700/80' },
    referee: { label: 'Árbitro', color: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/80' },
    blader: { label: 'Blader', color: 'bg-blue-900/60 text-blue-300 border-blue-700/80' },
    public: { label: 'Público', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
  };

  const currentRoleMeta = roleLabels[currentRole] || roleLabels.public;

  return (
    <header className="border-b border-[var(--costura)] bg-[var(--chasis)] sticky top-0 z-30 shadow-md text-[var(--hueso)] w-full">
      <div className="min-w-0 max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Zone 1: Wordmark & Brand */}
        <div
          onClick={() => setActiveTab('torneos')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
          title="Ir al inicio de torneos"
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/apbey-mark.png"
              alt=""
              aria-hidden="true"
              className="w-9 h-9 object-contain"
            />
            <span className="text-base sm:text-lg font-black tracking-tight leading-none font-display text-[var(--hueso)]">
              APBEY
            </span>
          </div>
        </div>

        {/* Zone 2: Desktop 7-Group Navigation (Hick's Law: grouped cleanly) */}
        <nav aria-label="Navegación principal" className="hidden lg:flex flex-1 min-w-0 items-center justify-center gap-1 overflow-visible">
          {/* 1. Torneos */}
          <button
            type="button"
            onClick={() => setActiveTab('torneos')}
            aria-current={activeTab === 'torneos' ? 'page' : undefined}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
              activeTab === 'torneos'
                ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Torneos</span>
          </button>

          {/* 2. Brackets */}
          <button
            type="button"
            onClick={() => setActiveTab('bracket')}
            aria-current={activeTab === 'bracket' ? 'page' : undefined}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
              activeTab === 'bracket'
                ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
            }`}
          >
            <AceroIcon id="i-trofeo" size="sm" />
            <span>Brackets</span>
          </button>

          {/* 3. Marcador (Unified Free & Official) */}
          <button
            type="button"
            onClick={() => setActiveTab('marcador')}
            aria-current={activeTab === 'marcador' || activeTab === 'referee' ? 'page' : undefined}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
              activeTab === 'marcador' || activeTab === 'referee'
                ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-xs'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Marcador</span>
          </button>

          {/* 4. Rankings & Hall of Fame */}
          <button
            type="button"
            onClick={() => setActiveTab('rankings')}
            aria-current={activeTab === 'rankings' ? 'page' : undefined}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
              activeTab === 'rankings'
                ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
            <span>Rankings & Salón</span>
          </button>

          {/* 5. Herramientas Dropdown (Deck 3on3, Tier List, Participantes) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setToolsOpen(!toolsOpen)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 whitespace-nowrap min-h-[36px] ${
                activeTab === 'deck' || activeTab === 'tierlist' || activeTab === 'participants'
                  ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                  : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Herramientas</span>
              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
            </button>

            {toolsOpen && (
              <div
                role="menu"
                className="absolute left-0 mt-1 w-48 bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('deck');
                    setToolsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[var(--hueso)] hover:bg-[var(--grafito)] rounded-xl flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Deck 3on3 Builder</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('tierlist');
                    setToolsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[var(--hueso)] hover:bg-[var(--grafito)] rounded-xl flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-rose-400" />
                  <span>Tier List Competitiva</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('participants');
                    setToolsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-[var(--hueso)] hover:bg-[var(--grafito)] rounded-xl flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Participantes Torneo</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Gestionar (Solo para Staff) */}
          {isStaff && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              aria-current={activeTab === 'admin' || activeTab === 'wizard' ? 'page' : undefined}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px] ${
                activeTab === 'admin' || activeTab === 'wizard'
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'text-amber-300 hover:text-amber-200 hover:bg-amber-950/40'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Gestionar</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Utilities, SyncBadge, Search & Account */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Permanent Sync Badge */}
          <div className="hidden sm:block">
            <SyncBadge />
          </div>

          {/* Command Palette Trigger (Ctrl+K) */}
          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              title="Búsqueda rápida (Ctrl+K)"
              className="p-2 text-[var(--acero)] hover:text-[var(--hueso)] bg-[var(--grafito)] border border-[var(--costura)] hover:border-[var(--acero)] rounded-xl min-w-[38px] min-h-[38px] flex items-center justify-center transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Stadium Display Trigger */}
          <button
            type="button"
            onClick={() => setShowStadiumModal(true)}
            title="Abrir Pantalla de Estadio en Vivo para TV o Proyector"
            className="p-2 text-amber-300 hover:text-amber-200 bg-amber-950/30 border border-amber-800/60 rounded-xl min-w-[38px] min-h-[38px] flex items-center justify-center transition-colors"
          >
            <Tv className="w-4 h-4" />
          </button>

          {/* User Account Button / Login */}
          {currentRole === 'public' || !currentUser ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => openAuthModal('invite')}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-[var(--costura)] hover:border-[var(--acero)] text-[var(--hueso)] hover:bg-[var(--grafito)] transition-colors hidden sm:flex items-center gap-1.5 min-h-[38px]"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Invitación</span>
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[var(--hueso)] hover:bg-white text-[var(--tinta)] transition-all flex items-center gap-1.5 shadow-sm min-h-[38px]"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[var(--grafito)] border border-[var(--costura)] rounded-xl p-1 pr-1.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-1.5 px-1 text-left min-h-[34px]"
                aria-label="Abrir mi perfil"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--cobalto)] text-[var(--tinta)] flex items-center justify-center text-[10px] font-black shrink-0">
                  {currentUser.displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-[var(--hueso)] max-w-[90px] truncate hidden md:inline hover:underline">
                  {currentUser.displayName}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${currentRoleMeta.color}`}>
                  {currentRoleMeta.label}
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="p-1 rounded-lg text-[var(--acero)] hover:text-rose-400 hover:bg-[var(--chasis)] transition-colors shrink-0 min-w-[28px] min-h-[28px] flex items-center justify-center"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </header>
  );
};
