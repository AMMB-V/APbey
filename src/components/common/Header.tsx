import React from 'react';
import {
  Trophy,
  Users,
  ShieldCheck,
  Settings,
  Scale,
  GitBranch,
  BookOpen,
  Radio,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { UserRole } from '../../types/tournament';

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
  } = useTournament();

  const roleLabels: Record<UserRole, { label: string; desc: string }> = {
    admin: { label: 'Admin', desc: 'Control total e invitaciones' },
    organizer: { label: 'Organizador', desc: 'Edición y gestión de torneos' },
    referee: { label: 'Árbitro', desc: 'Panel de juez de estadio' },
    blader: { label: 'Blader', desc: 'Jugador' },
    public: { label: 'Público', desc: 'Vista en vivo de solo lectura' },
  };

  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-30 shadow-xs">
      {/* Top tier: Brand, Navigation, Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-6">
        
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shadow-xs">
            ⚡X
          </div>
          <div>
            <div className="text-base font-bold text-neutral-900 tracking-tight leading-none">
              BEYBLADE X ARENA
            </div>
            <div className="text-xs text-neutral-500 font-medium mt-0.5">
              Gestor de Torneos & Arbitraje
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bracket'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Brackets & Grupos
          </button>

          <button
            onClick={() => setActiveTab('referee')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'referee'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Panel de Árbitro
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'participants'
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Bladers & Siembra
          </button>

          {currentRole !== 'public' && (
            <button
              onClick={() => setActiveTab('wizard')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'wizard'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Diseñador de Torneo
            </button>
          )}

          {(currentRole === 'admin' || currentRole === 'organizer') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Invitaciones & Admin
            </button>
          )}

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'docs'
                ? 'bg-blue-900 text-white'
                : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guía de Software
          </button>
        </nav>

        {/* Zone 3: Role Switcher & Tournament Selector */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Stadium Display Projector Launcher */}
          <button
            onClick={() => setShowStadiumModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-bold shadow-xs transition-colors"
            title="Abrir pantalla para proyector o transmisión de estadios"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pantalla Estadio</span>
          </button>

          {/* Active Tournament Selector */}
          <div className="hidden md:block">
            <select
              value={activeTournament?.id}
              onChange={(e) => setActiveTournamentId(e.target.value)}
              className="text-xs font-medium border border-neutral-300 rounded-md px-2.5 py-1.5 bg-neutral-50 text-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>


          {/* Role selector dropdown */}
          <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-md border border-neutral-200">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase px-1 hidden sm:inline">
              Rol:
            </span>
            {(['organizer', 'referee', 'admin', 'public'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`text-[11px] font-medium px-2 py-1 rounded transition-colors ${
                  currentRole === r
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
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
      <div className="flex lg:hidden overflow-x-auto border-t border-neutral-200 px-4 py-1.5 gap-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('bracket')}
          className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
            activeTab === 'bracket' ? 'bg-neutral-900 text-white' : 'text-neutral-700'
          }`}
        >
          Brackets
        </button>
        <button
          onClick={() => setActiveTab('referee')}
          className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
            activeTab === 'referee' ? 'bg-neutral-900 text-white' : 'text-neutral-700'
          }`}
        >
          Árbitro
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
            activeTab === 'participants' ? 'bg-neutral-900 text-white' : 'text-neutral-700'
          }`}
        >
          Bladers
        </button>
        <button
          onClick={() => setActiveTab('wizard')}
          className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
            activeTab === 'wizard' ? 'bg-neutral-900 text-white' : 'text-neutral-700'
          }`}
        >
          Diseño
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
            activeTab === 'admin' ? 'bg-neutral-900 text-white' : 'text-neutral-700'
          }`}
        >
          Admin
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
            activeTab === 'docs' ? 'bg-blue-900 text-white' : 'text-blue-700'
          }`}
        >
          Software
        </button>
      </div>
    </header>
  );
};
