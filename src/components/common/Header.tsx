import React, { useState } from 'react';
import {
  Trophy,
  Users,
  ShieldCheck,
  Settings,
  Scale,
  BookOpen,
  Radio,
  Database,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { UserRole } from '../../types/tournament';
import { SupabaseModal } from '../admin/SupabaseModal';

interface HeaderProps {
  activeTab: 'bracket' | 'referee' | 'participants' | 'wizard' | 'admin' | 'docs';
  setActiveTab: (tab: 'bracket' | 'referee' | 'participants' | 'wizard' | 'admin' | 'docs') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentRole,
    switchRole,
    activeTournament,
    tournaments,
    setActiveTournamentId,
    setShowStadiumModal,
    supabaseSyncInfo,
  } = useTournament();

  const [showDbModal, setShowDbModal] = useState<boolean>(false);

  const roleLabels: Record<UserRole, { label: string; desc: string }> = {
    admin: { label: 'Admin', desc: 'Control total e invitaciones' },
    organizer: { label: 'Organizador', desc: 'Edición y gestión de torneos' },
    referee: { label: 'Árbitro', desc: 'Panel de juez de estadio' },
    blader: { label: 'Blader', desc: 'Jugador' },
    public: { label: 'Público', desc: 'Vista en vivo de solo lectura' },
  };

  return (
    <>
      <header className="border-b border-[var(--costura)] bg-[var(--chasis)] sticky top-0 z-30 shadow-md text-[var(--hueso)]">
        {/* Top tier: Brand, Navigation, Role Switcher */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
          
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-[var(--grafito)] border border-[var(--costura)] text-[var(--hueso)] flex items-center justify-center font-bold text-lg tracking-wider shadow-xs">
              ⚡X
            </div>
            <div>
              <div className="text-base font-bold text-[var(--hueso)] tracking-tight leading-none font-display">
                BEYBLADE X ARENA
              </div>
              <div className="text-[11px] text-[var(--acero)] font-medium mt-0.5">
                Plataforma Oficial de Torneos & Arbitraje
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'bracket'
                  ? 'bg-[var(--hueso)] text-[var(--tinta)]'
                  : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Brackets & Grupos
            </button>

            <button
              onClick={() => setActiveTab('referee')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'referee'
                  ? 'bg-[var(--hueso)] text-[var(--tinta)]'
                  : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              Panel de Árbitro
            </button>

            <button
              onClick={() => setActiveTab('participants')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'participants'
                  ? 'bg-[var(--hueso)] text-[var(--tinta)]'
                  : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Bladers & Siembra
            </button>

            {currentRole !== 'public' && (
              <button
                onClick={() => setActiveTab('wizard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'wizard'
                    ? 'bg-[var(--hueso)] text-[var(--tinta)]'
                    : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                Diseñador de Torneo
              </button>
            )}

            {(currentRole === 'admin' || currentRole === 'organizer') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-[var(--hueso)] text-[var(--tinta)]'
                    : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Invitaciones & Admin
              </button>
            )}

            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'docs'
                  ? 'bg-[var(--cobalto)] text-white'
                  : 'text-[var(--cobalto)] hover:bg-[var(--grafito)]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Guía de Software
            </button>
          </nav>

          {/* Zone 3: Supabase Badge, Role Switcher & Stadium Launcher */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Database Connection Pill */}
            <button
              onClick={() => setShowDbModal(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--r-chip)] text-[11px] font-bold border transition-colors ${
                supabaseSyncInfo.isConnected
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/50'
              }`}
              title={supabaseSyncInfo.message}
            >
              <Database className="w-3 h-3" />
              <span className="hidden sm:inline">
                {supabaseSyncInfo.isConnected ? 'Supabase Conectado' : 'Supabase Local'}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${supabaseSyncInfo.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </button>

            {/* Stadium Display Projector Launcher */}
            <button
              onClick={() => setShowStadiumModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--r-control)] bg-[var(--tarjeta-amarilla)] hover:brightness-110 text-[var(--tinta)] text-xs font-bold shadow-xs transition-colors"
              title="Abrir pantalla para proyector o transmisión de estadios"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pantalla Estadio</span>
            </button>

            {/* Active Tournament Selector */}
            <div className="hidden xl:block">
              <select
                value={activeTournament?.id}
                onChange={(e) => setActiveTournamentId(e.target.value)}
                className="text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-2.5 py-1 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Role selector dropdown */}
            <div className="flex items-center gap-1 bg-[var(--grafito)] p-1 rounded-[var(--r-control)] border border-[var(--costura)]">
              <span className="text-[10px] font-semibold text-[var(--acero)] uppercase px-1 hidden sm:inline">
                Rol:
              </span>
              {(['organizer', 'referee', 'admin', 'public'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => switchRole(r)}
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-[var(--r-chip)] transition-colors ${
                    currentRole === r
                      ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold shadow-xs'
                      : 'text-[var(--acero)] hover:text-[var(--hueso)]'
                  }`}
                  title={roleLabels[r].desc}
                >
                  {roleLabels[r].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-bar for mobile navigation */}
        <div className="flex lg:hidden overflow-x-auto border-t border-[var(--costura)] px-4 py-1.5 gap-1 scrollbar-none bg-[var(--grafito)]">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'bracket' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
            }`}
          >
            Brackets
          </button>
          <button
            onClick={() => setActiveTab('referee')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'referee' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
            }`}
          >
            Árbitro
          </button>
          <button
            onClick={() => setActiveTab('participants')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'participants' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
            }`}
          >
            Bladers
          </button>
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'wizard' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
            }`}
          >
            Diseño
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'admin' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'docs' ? 'bg-[var(--cobalto)] text-white' : 'text-[var(--cobalto)]'
            }`}
          >
            Software
          </button>
        </div>
      </header>

      {/* Database Connection & Migration Modal */}
      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </>
  );
};
