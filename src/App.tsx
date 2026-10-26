import React, { useState } from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Header } from './components/common/Header';
import { BracketViewer } from './components/bracket/BracketViewer';
import { GroupStageViewer } from './components/bracket/GroupStageViewer';
import { RefereeConsole } from './components/referee/RefereeConsole';
import { ParticipantManager } from './components/participants/ParticipantManager';
import { TournamentWizard } from './components/tournament/TournamentWizard';
import { AdminPanel } from './components/admin/AdminPanel';
import { SoftwareEngineeringGuide } from './components/docs/SoftwareEngineeringGuide';
import { StadiumDisplay } from './components/stadium/StadiumDisplay';
import { Trophy, Layers, Volume2, Shield } from 'lucide-react';

function TournamentApp() {
  const [activeTab, setActiveTab] = useState<'bracket' | 'referee' | 'participants' | 'wizard' | 'admin' | 'docs'>('bracket');
  const [selectedRefereeMatchId, setSelectedRefereeMatchId] = useState<string | undefined>(undefined);

  const {
    activeTournament,
    stages,
    currentRole,
    showStadiumModal,
    setShowStadiumModal,
    activeStationAlert,
    dismissStationCall,
    supabaseSyncInfo,
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

  const handleOpenMatchInReferee = (matchId: string) => {
    setSelectedRefereeMatchId(matchId);
    setActiveTab('referee');
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
      <main className="grow max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Role & System Status Banner Indicator */}
        <div className="mb-4 flex flex-wrap items-center justify-between text-xs text-[var(--acero)] bg-[var(--chasis)] border border-[var(--costura)] px-4 py-2.5 rounded-[var(--r-control)] shadow-xs gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--hueso)]">Torneo Activo:</span>
            <span className="font-bold text-[var(--hueso)]">{activeTournament?.name}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-[var(--acero)]">
              {activeTournament?.venueName || 'Arena Central'} ({activeTournament?.country})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[var(--cobalto)]" />
              <span className="font-mono text-[11px]">
                Modo: <strong className="uppercase text-[var(--hueso)]">{currentRole}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`w-2 h-2 rounded-full ${supabaseSyncInfo.isConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{supabaseSyncInfo.isConnected ? 'Supabase Conectado' : 'Modo Local'}</span>
            </div>
          </div>
        </div>

        {/* View 1: Brackets & Groups */}
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
          <RefereeConsole
            initialMatchId={selectedRefereeMatchId}
            onClose={() => setActiveTab('bracket')}
          />
        )}

        {/* View 3: Participants & Seeding */}
        {activeTab === 'participants' && <ParticipantManager />}

        {/* View 4: Tournament Wizard / Designer */}
        {activeTab === 'wizard' && <TournamentWizard />}

        {/* View 5: Admin Panel & Invitations */}
        {activeTab === 'admin' && <AdminPanel />}

        {/* View 6: Software Engineering Blueprint Guide */}
        {activeTab === 'docs' && <SoftwareEngineeringGuide />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--costura)] bg-[var(--chasis)] py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--acero)] gap-2">
          <div>
            Beyblade X Tournament Arena · Diseñado con especificaciones oficiales WBO, sistema Acero y PostgreSQL 15.
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>TypeScript Strict</span>
            <span>·</span>
            <span>Supabase RLS & Realtime</span>
            <span>·</span>
            <span>Vercel Ready</span>
          </div>
        </div>
      </footer>

      {/* Stadium Display Fullscreen Projector Overlay */}
      {showStadiumModal && (
        <StadiumDisplay onClose={() => setShowStadiumModal(false)} />
      )}
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