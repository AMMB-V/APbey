import React, { useState } from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Header, MainTabType } from './components/common/Header';
import { BracketViewer } from './components/bracket/BracketViewer';
import { GroupStageViewer } from './components/bracket/GroupStageViewer';
import { RefereeConsole } from './components/referee/RefereeConsole';
import { ParticipantManager } from './components/participants/ParticipantManager';
import { TournamentWizard } from './components/tournament/TournamentWizard';
import { TournamentList } from './components/tournament/TournamentList';
import { AdminPanel } from './components/admin/AdminPanel';
import { SoftwareEngineeringGuide } from './components/docs/SoftwareEngineeringGuide';
import { StadiumDisplay } from './components/stadium/StadiumDisplay';
import { AuthModal } from './components/auth/AuthModal';
import { Layers, Volume2, Shield, Lock, KeyRound, LogIn } from 'lucide-react';

function TournamentApp() {
  const [activeTab, setActiveTab] = useState<MainTabType>(() => {
    if (typeof window === 'undefined') return 'bracket';
    const requestedView = new URLSearchParams(window.location.search).get('view');
    if (requestedView && ['torneos', 'bracket', 'referee', 'participants', 'wizard', 'admin', 'docs'].includes(requestedView)) {
      return requestedView as MainTabType;
    }
    const saved = window.localStorage.getItem('apbey_active_tab');
    return saved && ['torneos', 'bracket', 'referee', 'participants', 'wizard', 'admin', 'docs'].includes(saved)
      ? saved as MainTabType
      : 'bracket';
  });
  const [selectedRefereeMatchId, setSelectedRefereeMatchId] = useState<string | undefined>(undefined);

  const {
    currentUser,
    currentRole,
    activeTournament,
    stages,
    showStadiumModal,
    setShowStadiumModal,
    activeStationAlert,
    dismissStationCall,
    showAuthModal,
    setShowAuthModal,
    authModalInitialTab,
    inviteCodePrefill,
    openAuthModal,
  } = useTournament();

  // Stages of active tournament
  const tournamentStages = activeTournament
    ? stages.filter((s) => s.tournamentId === activeTournament.id).sort((a, b) => a.position - b.position)
    : [];

  const [activeStageId, setActiveStageId] = useState<string>(tournamentStages[0]?.id || '');

  // Keep activeStageId in sync when tournament changes
  React.useEffect(() => {
    if (tournamentStages.length > 0 && !tournamentStages.some((s) => s.id === activeStageId)) {
      setActiveStageId(tournamentStages[0].id);
    }
  }, [tournamentStages, activeStageId]);

  const currentStage = tournamentStages.find((s) => s.id === activeStageId) || tournamentStages[0];

  React.useEffect(() => {
    window.localStorage.setItem('apbey_active_tab', activeTab);
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeTab);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [activeTab]);

  React.useEffect(() => {
    const handleBrowserNavigation = () => {
      const requestedView = new URLSearchParams(window.location.search).get('view');
      if (requestedView && ['torneos', 'bracket', 'referee', 'participants', 'wizard', 'admin', 'docs'].includes(requestedView)) {
        setActiveTab(requestedView as MainTabType);
      }
    };

    window.addEventListener('popstate', handleBrowserNavigation);
    return () => window.removeEventListener('popstate', handleBrowserNavigation);
  }, []);

  const handleOpenMatchInReferee = (matchId: string) => {
    setSelectedRefereeMatchId(matchId);
    if (currentRole === 'public') {
      openAuthModal('login');
    } else {
      setActiveTab('referee');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--grafito)] text-[var(--hueso)] flex flex-col font-sans antialiased selection:bg-[var(--cobalto)] selection:text-[var(--tinta)]">
      {/* Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Persistent Stadium Summon Banner */}
      {activeStationAlert && (
        <aside
          aria-label="Convocatoria Activa"
          className="bg-[var(--tarjeta-amarilla)] text-[var(--tinta)] px-4 py-2.5 shadow-md border-b border-amber-600 flex items-center justify-between text-xs font-bold"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 animate-bounce text-[var(--tinta)]" />
              <span>{activeStationAlert.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowStadiumModal(true)}
                className="px-2.5 py-1 bg-[var(--tinta)] text-[var(--hueso)] rounded text-[11px] font-semibold hover:bg-neutral-800 transition-colors"
              >
                Ver en Estadio
              </button>
              <button
                onClick={() => dismissStationCall(activeStationAlert.matchId)}
                className="text-[var(--tinta)] hover:opacity-75 font-mono text-xs px-1.5"
                title="Descartar notificación"
              >
                ✕
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Container */}
      <main className="grow max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {/* Tournament Bar Indicator */}
        <div className="mb-4 flex flex-wrap items-center justify-between text-xs text-[var(--acero)] bg-[var(--chasis)] border border-[var(--costura)] px-4 py-2 rounded-[var(--r-control)] shadow-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--hueso)]">Torneo:</span>
            <span className="font-bold text-[var(--hueso)]">{activeTournament?.name}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-[var(--acero)]">
              {activeTournament?.venueName || 'Arena Central'} ({activeTournament?.country})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Sesión: <strong className="uppercase text-[var(--hueso)]">{currentUser.displayName}</strong> ({currentRole})
                </span>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal('login')}
                className="text-[11px] font-semibold text-[var(--acero)] hover:text-[var(--hueso)] flex items-center gap-1 transition-colors"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Modo Público · Iniciar sesión para arbitrar</span>
              </button>
            )}
          </div>
        </div>

        {/* View 0: Hub de Torneos (Listado y Gestión) */}
        {activeTab === 'torneos' && (
          <TournamentList
            onSelectTournament={(tourneyId, targetTab) => {
              setActiveTab(targetTab || 'bracket');
            }}
          />
        )}

        {/* View 1: Brackets & Groups (Public and All Roles) */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            {/* Multi-stage Selector Bar */}
            {tournamentStages.length > 1 && (
              <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-3 shadow-xs flex items-center justify-between overflow-x-auto gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <Layers className="w-4 h-4 text-[var(--acero)]" />
                  <span className="text-xs font-bold text-[var(--acero)]">Etapas del Torneo:</span>
                </div>

                <div className="flex items-center gap-2 grow">
                  {tournamentStages.map((stage, idx) => {
                    const isSelected = stage.id === currentStage?.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setActiveStageId(stage.id)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-all flex items-center gap-2 whitespace-nowrap ${
                          isSelected
                            ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                            : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-[var(--hueso)] hover:border-[var(--costura)]'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-neutral-800 text-[10px] text-white flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{stage.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            stage.status === 'in_progress'
                              ? 'bg-amber-500 text-black font-bold'
                              : stage.status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {stage.status === 'in_progress' ? 'En Vivo' : stage.status === 'completed' ? 'Finalizada' : 'Pendiente'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stage Body */}
            {currentStage && (
              <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-4 sm:p-6 shadow-md">
                {currentStage.type === 'group_stage' ? (
                  <GroupStageViewer
                    stage={currentStage}
                    onOpenMatchInReferee={handleOpenMatchInReferee}
                  />
                ) : (
                  <BracketViewer
                    stage={currentStage}
                    onOpenMatchInReferee={handleOpenMatchInReferee}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* View 2: Referee Console */}
        {activeTab === 'referee' && (
          currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin' ? (
            <RefereeConsole
              initialMatchId={selectedRefereeMatchId}
              onClose={() => setActiveTab('bracket')}
            />
          ) : (
            <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] p-8 text-center max-w-lg mx-auto space-y-4 shadow-md my-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-xl">
                ⚖️
              </div>
              <h3 className="text-base font-bold text-[var(--hueso)] font-display">
                Panel Exclusivo para Jueces y Árbitros
              </h3>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                Para arbitrar combates, registrar acabados de batalla (Xtreme, Burst, Over, Spin) o aplicar tarjetas reglamentarias, debes autenticarte con tu cuenta de árbitro o canjear el código de invitación que te entregó el organizador.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] text-[var(--tinta)] hover:bg-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => openAuthModal('invite')}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--r-control)] border border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Canjear Código de Invitación
                </button>
              </div>
            </div>
          )
        )}

        {/* View 3: Participants & Seeding */}
        {activeTab === 'participants' && (
          currentRole === 'organizer' || currentRole === 'admin' ? (
            <ParticipantManager />
          ) : (
            <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] p-8 text-center max-w-lg mx-auto space-y-4 shadow-md my-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-blue-950/40 text-blue-400 border border-blue-800/60 flex items-center justify-center font-bold text-xl">
                👥
              </div>
              <h3 className="text-base font-bold text-[var(--hueso)] font-display">
                Gestión de Bladers & Siembra
              </h3>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                El registro de bladers, inspección de beys (Bey Check) y ordenamiento de siembras requiere rol de Organizador o Administrador.
              </p>
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] text-[var(--tinta)] hover:bg-white flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión como Organizador
                </button>
              </div>
            </div>
          )
        )}

        {/* View 4: Tournament Wizard / Designer */}
        {activeTab === 'wizard' && (
          currentRole === 'organizer' || currentRole === 'admin' ? (
            <TournamentWizard />
          ) : (
            <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] p-8 text-center max-w-lg mx-auto space-y-4 shadow-md my-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-950/40 text-amber-400 border border-amber-800/60 flex items-center justify-center font-bold text-xl">
                ⚙️
              </div>
              <h3 className="text-base font-bold text-[var(--hueso)] font-display">
                Diseñador de Torneo & Reglas
              </h3>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                La configuración de parámetros de arbitraje, fases de grupos, jerarquías de desempate y sedes es exclusiva para organizadores del evento.
              </p>
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] text-[var(--tinta)] hover:bg-white flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión como Organizador
                </button>
              </div>
            </div>
          )
        )}

        {/* View 5: Admin Panel & Invitations */}
        {activeTab === 'admin' && (
          currentRole === 'admin' ? (
            <AdminPanel />
          ) : (
            <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] p-8 text-center max-w-lg mx-auto space-y-4 shadow-md my-8">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/40 text-rose-400 border border-rose-800/60 flex items-center justify-center font-bold text-xl">
                🛡️
              </div>
              <h3 className="text-base font-bold text-[var(--hueso)] font-display">
                Panel de Administración Restringido
              </h3>
              <p className="text-xs text-[var(--acero)] leading-relaxed">
                La emisión de códigos de invitación y auditoría de base de datos requiere credenciales de Administrador del Sistema.
              </p>
              <div className="flex justify-center pt-2">
                <button
                  onClick={() => openAuthModal('login')}
                  className="px-4 py-2 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] text-[var(--tinta)] hover:bg-white flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión como Administrador
                </button>
              </div>
            </div>
          )
        )}

        {/* View 6: Software Engineering Blueprint Guide */}
        {activeTab === 'docs' && <SoftwareEngineeringGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--costura)] bg-[var(--chasis)] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--acero)] gap-2">
          <div>
            Beyblade X Tournament Arena · WBO Ruleset · PostgreSQL 15 & Supabase RLS.
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <button
              onClick={() => setActiveTab('docs')}
              className="text-[var(--acero)] hover:text-[var(--hueso)] transition-colors underline"
            >
              Guía de Software
            </button>
            <span>·</span>
            <span>TypeScript Strict</span>
            <span>·</span>
            <span>Vercel Ready</span>
          </div>
        </div>
      </footer>

      {/* Stadium Display Fullscreen Projector Overlay */}
      {showStadiumModal && (
        <StadiumDisplay onClose={() => setShowStadiumModal(false)} />
      )}

      {/* Authentication & Invitation Redemption Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalInitialTab}
        initialCode={inviteCodePrefill}
      />
    </div>
  );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1b1d21] text-[#ece8e0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#25282e] border border-[#363b43] rounded-xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-900/40 text-red-400 flex items-center justify-center font-bold text-xl border border-red-700/50">
              ⚠️
            </div>
            <h1 className="text-lg font-bold">Error al inicializar la aplicación</h1>
            <p className="text-xs text-[#a3abb5] leading-relaxed">
              {this.state.error?.message || 'Ha ocurrido un error inesperado al cargar la interfaz.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#ece8e0] text-[#101114] hover:bg-white transition-colors"
              >
                Recargar página
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#363b43] text-[#a3abb5] hover:text-[#ece8e0] transition-colors"
              >
                Limpiar datos locales
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <TournamentProvider>
        <TournamentApp />
      </TournamentProvider>
    </ErrorBoundary>
  );
}
