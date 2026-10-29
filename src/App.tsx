import React, { useState, useEffect } from 'react';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import { Header, MainTabType } from './components/common/Header';
import { BracketViewer } from './components/bracket/BracketViewer';
import { GroupStageViewer } from './components/bracket/GroupStageViewer';
import { RefereeConsole } from './components/referee/RefereeConsole';
import { ParticipantManager } from './components/participants/ParticipantManager';
import { TournamentWizard } from './components/tournament/TournamentWizard';
import { TournamentList } from './components/tournament/TournamentList';
import { AdminPanel } from './components/admin/AdminPanel';
import { StadiumDisplay } from './components/stadium/StadiumDisplay';
import { AuthModal } from './components/auth/AuthModal';
import { BottomNav } from './components/common/BottomNav';
import { CommandPalette } from './components/common/CommandPalette';
import { ScoreboardView } from './components/scoreboard/ScoreboardView';
import { DeckBuilder } from './components/deck/DeckBuilder';
import { TierListView } from './components/deck/TierListView';
import { RankingsView } from './components/rankings/RankingsView';
import { UserProfileView } from './components/profile/UserProfileView';
import { Layers, Volume2, Shield, Lock, KeyRound, LogIn, Trophy } from 'lucide-react';

const VALID_TABS: MainTabType[] = [
  'torneos',
  'bracket',
  'marcador',
  'referee',
  'rankings',
  'deck',
  'tierlist',
  'profile',
  'participants',
  'wizard',
  'admin',
];

const VIEW_TITLES: Record<MainTabType, string> = {
  torneos: 'Torneos Oficiales',
  bracket: 'Brackets & Grupos',
  marcador: 'Marcador de Combate',
  referee: 'Panel de Árbitro',
  rankings: 'Rankings & Salón de la Fama',
  deck: 'Deck 3on3 Builder',
  tierlist: 'Tier List Competitiva',
  profile: 'Mi Perfil de Blader',
  participants: 'Lista de Bladers',
  wizard: 'Diseñador de Torneos',
  admin: 'Gestión & Árbitros',
};

function TournamentApp() {
  const [activeTab, setActiveTab] = useState<MainTabType>(() => {
    if (typeof window === 'undefined') return 'bracket';

    // Check hash for legacy AppBey redirects
    const hash = window.location.hash;
    if (hash.includes('referee')) return 'marcador';
    if (hash.includes('stadium')) return 'bracket';
    if (hash.includes('rankings')) return 'rankings';
    if (hash.includes('deck')) return 'deck';

    const requestedView = new URLSearchParams(window.location.search).get('view');
    if (requestedView && VALID_TABS.includes(requestedView as MainTabType)) {
      return requestedView as MainTabType;
    }

    const saved = window.localStorage.getItem('apbey_active_tab');
    return saved && VALID_TABS.includes(saved as MainTabType)
      ? (saved as MainTabType)
      : 'bracket';
  });

  const [selectedRefereeMatchId, setSelectedRefereeMatchId] = useState<string | undefined>(undefined);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

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
  useEffect(() => {
    if (tournamentStages.length > 0 && !tournamentStages.some((s) => s.id === activeStageId)) {
      setActiveStageId(tournamentStages[0].id);
    }
  }, [tournamentStages, activeStageId]);

  const currentStage = tournamentStages.find((s) => s.id === activeStageId) || tournamentStages[0];

  // Sync title and URL search param
  useEffect(() => {
    window.localStorage.setItem('apbey_active_tab', activeTab);
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeTab);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    // Update document.title per HCI orientation requirement
    const titleText = VIEW_TITLES[activeTab] || 'Torneos de Beyblade X';
    document.title = `APbey | ${titleText}`;
  }, [activeTab]);

  // Handle browser back/forward popstate
  useEffect(() => {
    const handleBrowserNavigation = () => {
      const requestedView = new URLSearchParams(window.location.search).get('view');
      if (requestedView && VALID_TABS.includes(requestedView as MainTabType)) {
        setActiveTab(requestedView as MainTabType);
      }
    };

    window.addEventListener('popstate', handleBrowserNavigation);
    return () => window.removeEventListener('popstate', handleBrowserNavigation);
  }, []);

  // Global Ctrl+K / Cmd+K listener for CommandPalette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenMatchInReferee = (matchId: string) => {
    setSelectedRefereeMatchId(matchId);
    setActiveTab('marcador');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--grafito)] text-[var(--hueso)] flex flex-col font-sans antialiased selection:bg-[var(--cobalto)] selection:text-[var(--tinta)] pb-16 md:pb-0">
      {/* WCAG 2.2 AA Skip to Content Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[var(--cobalto)] focus:text-[var(--tinta)] focus:font-black focus:rounded-xl focus:shadow-2xl"
      >
        Saltar al contenido principal
      </a>

      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

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
                type="button"
                onClick={() => setShowStadiumModal(true)}
                className="px-2.5 py-1 bg-[var(--tinta)] text-[var(--hueso)] rounded text-[11px] font-semibold hover:bg-neutral-800 transition-colors"
              >
                Ver en Estadio
              </button>
              <button
                type="button"
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
      <main id="main-content" tabIndex={-1} className="grow min-w-0 max-w-screen-2xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 outline-hidden">
        {/* Breadcrumbs & Active Tournament Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between text-xs text-[var(--acero)] bg-[var(--chasis)] border border-[var(--costura)] px-4 py-2 rounded-2xl shadow-xs gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-[var(--hueso)]">Torneo:</span>
            <span className="font-bold text-[var(--hueso)]">{activeTournament?.name || 'Torneo Beyblade X'}</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline text-[var(--acero)]">
              {activeTournament?.venueName || 'Arena Central'} ({activeTournament?.country || 'PA'})
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
                type="button"
                onClick={() => openAuthModal('login')}
                className="text-[11px] font-semibold text-[var(--acero)] hover:text-[var(--hueso)] flex items-center gap-1 transition-colors min-h-[32px]"
              >
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Modo Público · Iniciar sesión para arbitrar</span>
              </button>
            )}
          </div>
        </div>

        {/* View 0: Hub de Torneos */}
        {activeTab === 'torneos' && (
          <TournamentList
            onSelectTournament={(_tourneyId, targetTab) => {
              setActiveTab((targetTab as MainTabType) || 'bracket');
            }}
          />
        )}

        {/* View 1: Brackets & Groups */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            {tournamentStages.length > 1 && (
              <div className="bg-[var(--chasis)] rounded-2xl border border-[var(--costura)] p-3 shadow-xs flex items-center justify-between overflow-x-auto gap-4">
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
                        type="button"
                        onClick={() => setActiveStageId(stage.id)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap min-h-[36px] ${
                          isSelected
                            ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs font-bold'
                            : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-[var(--hueso)]'
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

            {currentStage && (
              <div className="bg-[var(--chasis)] rounded-3xl border border-[var(--costura)] p-4 sm:p-6 shadow-md">
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

        {/* View 2: Marcador Unificado (Modo Libre + Oficial) */}
        {(activeTab === 'marcador' || activeTab === 'referee') && (
          <ScoreboardView
            initialMatchId={selectedRefereeMatchId}
          />
        )}

        {/* View 3: Rankings WBO & Salón de la Fama */}
        {activeTab === 'rankings' && <RankingsView />}

        {/* View 4: Deck 3on3 Builder */}
        {activeTab === 'deck' && <DeckBuilder />}

        {/* View 5: Tier List Competitiva */}
        {activeTab === 'tierlist' && <TierListView />}

        {/* View 6: Perfil de Blader */}
        {activeTab === 'profile' && <UserProfileView />}

        {/* View 7: Participantes Torneo */}
        {activeTab === 'participants' && <ParticipantManager />}

        {/* View 8: Diseñador de Torneos (Staff) */}
        {activeTab === 'wizard' && <TournamentWizard />}

        {/* View 9: Admin Panel (Personal & Accesos) */}
        {activeTab === 'admin' && <AdminPanel />}

      </main>

      {/* Mobile Fixed 5-Item Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenStadium={() => setShowStadiumModal(true)}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setActiveTab(tab as MainTabType)}
      />

      {/* Stadium Projector Display Modal */}
      {showStadiumModal && (
        <StadiumDisplay onClose={() => setShowStadiumModal(false)} />
      )}

      {/* Unified Auth & Invitation Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab={authModalInitialTab}
        initialCode={inviteCodePrefill}
      />
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
