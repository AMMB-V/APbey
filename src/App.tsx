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
import { Trophy, Layers, Play, CheckCircle2, AlertCircle, Volume2, Radio } from 'lucide-react';

function TournamentApp() {
  const [activeTab, setActiveTab] = useState<'bracket' | 'referee' | 'participants' | 'wizard' | 'admin' | 'docs'>('bracket');
  const [selectedRefereeMatchId, setSelectedRefereeMatchId] = useState<string | undefined>(undefined);

  const {
    activeTournament,
    stages,
    currentRole,
    startStage,
    showStadiumModal,
    setShowStadiumModal,
    activeStationAlert,
    dismissStationCall,
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
    <div className="min-h-screen bg-neutral-100/70 text-neutral-900 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Persistent Stadium Summon Banner */}
      {activeStationAlert && (
        <aside
          aria-label="Convocatoria Activa"
          className="bg-amber-500 text-neutral-950 px-4 py-2.5 shadow-md border-b border-amber-600 flex items-center justify-between text-xs font-bold"
        >
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 animate-bounce text-neutral-950" />
              <span>{activeStationAlert.message}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowStadiumModal(true)}
                className="px-2.5 py-1 bg-neutral-950 text-white rounded text-[11px] font-semibold hover:bg-neutral-800 transition-colors"
              >
                Ver en Estadio
              </button>
              <button
                onClick={() => dismissStationCall(activeStationAlert.matchId)}
                className="text-neutral-900 hover:text-black font-mono text-xs px-1.5"
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
        {/* Role Banner Indicator (Subtle, informative) */}
        <div className="mb-4 flex items-center justify-between text-xs text-neutral-500 bg-white border border-neutral-200 px-4 py-2 rounded-lg shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">Torneo Activo:</span>
            <span className="font-bold text-neutral-900">{activeTournament?.name}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-neutral-500">
              {activeTournament?.venueName || 'Arena Central'} ({activeTournament?.country})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-neutral-600">
              Modo actual: <strong className="uppercase text-neutral-900">{currentRole}</strong>
            </span>
          </div>
        </div>

        {/* View 1: Brackets & Groups */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            {/* Multi-stage Selector Bar */}
            {tournamentStages.length > 1 && (
              <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-2xs flex items-center justify-between overflow-x-auto gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <Layers className="w-4 h-4 text-neutral-700" />
                  <span className="text-xs font-bold text-neutral-700">Etapas del Torneo:</span>
                </div>

                <div className="flex items-center gap-2 grow">
                  {tournamentStages.map((stage, idx) => {
                    const isSelected = stage.id === currentStage?.id;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => setActiveStageId(stage.id)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                          isSelected
                            ? 'bg-neutral-900 text-white shadow-xs'
                            : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full bg-neutral-800 text-[10px] text-white flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{stage.name}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                            stage.status === 'in_progress'
                              ? 'bg-amber-500 text-white'
                              : stage.status === 'completed'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-neutral-300 text-neutral-800'
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
              <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 shadow-2xs">
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
      <footer className="border-t border-neutral-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div>
            Beyblade X Tournament Arena · Diseñado con especificaciones oficiales WBO y esquema PostgreSQL 15.
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Next.js + TypeScript</span>
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

export default function App() {
  return (
    <TournamentProvider>
      <TournamentApp />
    </TournamentProvider>
  );
}
