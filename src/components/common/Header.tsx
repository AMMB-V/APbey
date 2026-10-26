import React, { useState } from 'react';
import {
  ShieldCheck,
  Radio,
  Database,
  LogIn,
  LogOut,
  User,
  KeyRound,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { SupabaseModal } from '../admin/SupabaseModal';
import { AceroIcon } from './AceroIcon';

interface HeaderProps {
  activeTab: 'bracket' | 'referee' | 'participants' | 'wizard' | 'admin' | 'docs';
  setActiveTab: (tab: 'bracket' | 'referee' | 'participants' | 'wizard' | 'admin' | 'docs') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const {
    currentUser,
    currentRole,
    logout,
    openAuthModal,
    setShowStadiumModal,
    supabaseSyncInfo,
  } = useTournament();

  const [showDbModal, setShowDbModal] = useState<boolean>(false);

  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-rose-900/40 text-rose-300 border-rose-700/60' },
    organizer: { label: 'Organizador', color: 'bg-amber-900/40 text-amber-300 border-amber-700/60' },
    referee: { label: 'Árbitro', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60' },
    blader: { label: 'Blader', color: 'bg-blue-900/40 text-blue-300 border-blue-700/60' },
    public: { label: 'Público', color: 'bg-neutral-800 text-neutral-300 border-neutral-700' },
  };

  const currentRoleMeta = roleLabels[currentRole] || roleLabels.public;

  return (
    <>
      <header className="border-b border-[var(--costura)] bg-[var(--chasis)] sticky top-0 z-30 shadow-md text-[var(--hueso)] w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--grafito)] border border-[var(--costura)] text-[var(--hueso)] flex items-center justify-center font-bold text-sm tracking-wider shadow-xs">
              ⚡X
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-[var(--hueso)] tracking-tight leading-none font-display">
                BEYBLADE X ARENA
              </div>
              <div className="text-[10px] text-[var(--acero)] font-medium mt-0.5 hidden xs:block">
                Plataforma Oficial de Torneos
              </div>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Strictly Segmented by Role) */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
            {/* Brackets: Visible to everyone */}
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'bracket'
                  ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                  : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
              }`}
            >
              <AceroIcon id="i-trofeo" size="sm" />
              <span>Brackets & Grupos</span>
            </button>

            {/* Referee Console: Only Árbitro, Organizador, Admin */}
            {(currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin') && (
              <button
                onClick={() => setActiveTab('referee')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'referee'
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                    : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
                }`}
              >
                <AceroIcon id="i-arbitro" size="sm" />
                <span>Panel de Árbitro</span>
              </button>
            )}

            {/* Bladers & Seeding: Only Organizador, Admin */}
            {(currentRole === 'organizer' || currentRole === 'admin') && (
              <button
                onClick={() => setActiveTab('participants')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'participants'
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                    : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
                }`}
              >
                <AceroIcon id="i-participante" size="sm" />
                <span>Bladers & Siembra</span>
              </button>
            )}

            {/* Tournament Wizard: Only Organizador, Admin */}
            {(currentRole === 'organizer' || currentRole === 'admin') && (
              <button
                onClick={() => setActiveTab('wizard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'wizard'
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                    : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
                }`}
              >
                <AceroIcon id="i-ajustes" size="sm" />
                <span>Diseñador</span>
              </button>
            )}

            {/* Admin & Invitations: Only Admin */}
            {currentRole === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                    : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--cobalto)]" />
                <span>Invitaciones & Admin</span>
              </button>
            )}

            {/* Stadium Projector Display: Visible to everyone */}
            <button
              onClick={() => setShowStadiumModal(true)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-[var(--r-control)] text-amber-300 hover:text-amber-200 hover:bg-amber-950/30 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              title="Abrir pantalla en vivo para proyector o streaming"
            >
              <AceroIcon id="i-envivo" size="sm" />
              <span className="hidden lg:inline">Estadio</span>
            </button>
          </nav>

          {/* Zone 3: Authentication & Status Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Database indicator (Admin only) */}
            {currentRole === 'admin' && (
              <button
                onClick={() => setShowDbModal(true)}
                className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-[var(--r-chip)] text-[11px] font-bold border transition-colors ${
                  supabaseSyncInfo?.isConnected
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
                    : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/50'
                }`}
                title={supabaseSyncInfo?.message || 'Configuración Supabase'}
              >
                <Database className="w-3 h-3" />
                <span className="hidden xl:inline">
                  {supabaseSyncInfo?.isConnected ? 'Supabase' : 'DB Local'}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${supabaseSyncInfo?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              </button>
            )}

            {/* If NOT logged in (Public): Login & Claim Invite buttons */}
            {currentRole === 'public' || !currentUser ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openAuthModal('invite')}
                  className="px-2.5 py-1.5 text-xs font-semibold rounded-[var(--r-control)] border border-[var(--costura)] hover:border-[var(--acero)] text-[var(--hueso)] hover:bg-[var(--grafito)] transition-colors hidden sm:flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Invitación</span>
                </button>
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-3 py-1.5 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] hover:bg-white text-[var(--tinta)] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Iniciar Sesión</span>
                </button>
              </div>
            ) : (
              /* If logged in: User Badge + Logout */
              <div className="flex items-center gap-2 bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] p-1">
                <div className="flex items-center gap-1.5 px-1.5">
                  <div className="w-5 h-5 rounded-full bg-[var(--chasis)] border border-[var(--costura)] flex items-center justify-center text-[10px] font-bold text-[var(--hueso)]">
                    {currentUser.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-[var(--hueso)] max-w-[110px] truncate hidden sm:inline">
                    {currentUser.displayName}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${currentRoleMeta.color}`}>
                    {currentRoleMeta.label}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1 rounded text-[var(--acero)] hover:text-rose-400 hover:bg-[var(--chasis)] transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Segmented Sub-bar */}
        <div className="flex md:hidden overflow-x-auto border-t border-[var(--costura)] px-3 py-1.5 gap-1 scrollbar-none bg-[var(--grafito)]">
          <button
            onClick={() => setActiveTab('bracket')}
            className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
              activeTab === 'bracket' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
            }`}
          >
            Brackets
          </button>

          {(currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin') && (
            <button
              onClick={() => setActiveTab('referee')}
              className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
                activeTab === 'referee' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
              }`}
            >
              Árbitro
            </button>
          )}

          {(currentRole === 'organizer' || currentRole === 'admin') && (
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
                activeTab === 'participants' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
              }`}
            >
              Bladers
            </button>
          )}

          {(currentRole === 'organizer' || currentRole === 'admin') && (
            <button
              onClick={() => setActiveTab('wizard')}
              className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
                activeTab === 'wizard' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
              }`}
            >
              Diseñador
            </button>
          )}

          {currentRole === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-2.5 py-1 text-xs font-medium rounded shrink-0 ${
                activeTab === 'admin' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold' : 'text-[var(--acero)]'
              }`}
            >
              Admin
            </button>
          )}

          <button
            onClick={() => setShowStadiumModal(true)}
            className="px-2.5 py-1 text-xs font-medium rounded shrink-0 text-amber-300 bg-amber-950/40"
          >
            Estadio
          </button>
        </div>
      </header>

      {/* Database Connection & Migration Modal */}
      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </>
  );
};
