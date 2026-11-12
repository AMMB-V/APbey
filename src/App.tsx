import React, { useState, useEffect, useRef } from 'react';
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
import {
  Layers,
  Volume2,
  Shield,
  Lock,
  KeyRound,
  LogIn,
  Trophy,
  LayoutDashboard,
  Users,
  ListOrdered,
  Scale,
  Settings,
} from 'lucide-react';

const VALID_TABS: MainTabType[] = [
  'torneos',
  'overview',
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
  overview: 'Resumen del Torneo',
  bracket: 'Brackets & Grupos',
  marcador: 'Marcador de Combate',
  referee: 'Panel de Árbitro',
  rankings: 'Rankings & Salón de la Fama',
  deck: 'Deck 3on3 Builder',
  tierlist: 'Tier List Competitiva',
  profile: 'Mi Perfil de Blader',
  participants: 'Lista de Bladers',
  wizard: 'Configuración del Torneo',
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
  const [wizardInitialTab, setWizardInitialTab] = useState<
    'general' | 'arbitration' | 'stages' | 'tiebreakers' | 'permissions'
  >('general');

  const {
    currentUser,
    currentRole,
    tournaments,
    activeTournament,
    setActiveTournamentId,
    stages,
    participants,
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
  const hasAppliedTournamentDeepLink = useRef(false);

  // Stages of active tournament
  const tournamentStages = activeTournament
    ? stages.filter((s) => s.tournamentId === activeTournament.id).sort((a, b) => a.position - b.position)
    : [];

  const [activeStageId, setActiveStageId] = useState<string>(tournamentStages[0]?.id || '');
  const initializedStageForTournament = useRef<string | null>(null);

  // Restore a deep-linked stage once per tournament. Afterwards, stage clicks
  // are authoritative and should not be overwritten by the previous URL value.
  useEffect(() => {
    if (tournamentStages.length === 0) return;
    const tournamentId = activeTournament?.id || '';
    if (initializedStageForTournament.current === tournamentId) {
      if (!tournamentStages.some((stage) => stage.id === activeStageId)) {
        setActiveStageId(tournamentStages[0].id);
      }
      return;
    }

    const requestedStageId = new URLSearchParams(window.location.search).get('stage');
    if (requestedStageId && tournamentStages.some((stage) => stage.id === requestedStageId)) {
      setActiveStageId(requestedStageId);
    } else {
      setActiveStageId(tournamentStages[0].id);
    }
    initializedStageForTournament.current = tournamentId;
  }, [activeStageId, activeTournament?.id, tournamentStages]);

  const currentStage = tournamentStages.find((s) => s.id === activeStageId) || tournamentStages[0];

  // Restore a tournament deep link once the remote snapshot is available.
  useEffect(() => {
    if (hasAppliedTournamentDeepLink.current) return;
    const requestedTournamentId = new URLSearchParams(window.location.search).get('tournament');
    if (!requestedTournamentId) {
      hasAppliedTournamentDeepLink.current = true;
      return;
    }
    if (tournaments.length === 0) return;

    hasAppliedTournamentDeepLink.current = true;
    if (tournaments.some((tournament) => tournament.id === requestedTournamentId)) {
      setActiveTournamentId(requestedTournamentId);
    }
  }, [tournaments, setActiveTournamentId]);

  // Sync title and URL search param
  useEffect(() => {
    window.localStorage.setItem('apbey_active_tab', activeTab);
    const url = new URL(window.location.href);
    url.searchParams.set('view', activeTab);
    if (activeTournament?.id) {
      url.searchParams.set('tournament', activeTournament.id);
    } else {
      url.searchParams.delete('tournament');
    }
    if (activeStageId && tournamentStages.some((stage) => stage.id === activeStageId)) {
      url.searchParams.set('stage', activeStageId);
    } else {
      url.searchParams.delete('stage');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    // Update document.title per HCI orientation requirement
    const titleText = VIEW_TITLES[activeTab] || 'Torneos de Beyblade X';
    document.title = `APbey | ${titleText}`;
  }, [activeTab, activeTournament?.id, activeStageId, tournamentStages]);

  // Handle browser back/forward popstate
  useEffect(() => {
    const handleBrowserNavigation = () => {
      const params = new URLSearchParams(window.location.search);
      const requestedView = params.get('view');
      if (requestedView && VALID_TABS.includes(requestedView as MainTabType)) {
        setActiveTab(requestedView as MainTabType);
      }
      const requestedTournamentId = params.get('tournament');
      if (requestedTournamentId && tournaments.some((tournament) => tournament.id === requestedTournamentId)) {
        setActiveTournamentId(requestedTournamentId);
      }
      const requestedStageId = params.get('stage');
      if (requestedStageId && tournamentStages.some((stage) => stage.id === requestedStageId)) {
        setActiveStageId(requestedStageId);
      }
    };

    window.addEventListener('popstate', handleBrowserNavigation);
    return () => window.removeEventListener('popstate', handleBrowserNavigation);
  }, [setActiveTournamentId, tournamentStages, tournaments]);

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
    <div className="min-h-screen overflow-x-hidden bg-[var(--grafito)] text-[var(--hueso)] flex flex-col font-sans antialiased selection:bg-[var(--cobalto)] selection:text-[var(--tinta)] pb-20 lg:pb-0">
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
          className="bg-[var(--tarjeta-amarilla)] text-[var(--tinta)] px-3 sm:px-4 py-2.5 shadow-md border-b border-amber-600 flex items-start sm:items-center justify-between text-xs font-bold"
        >
          <div className="max-w-7xl mx-auto w-full flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <Volume2 className="w-4 h-4 mt-0.5 shrink-0 animate-bounce text-[var(--tinta)]" />
              <span className="min-w-0 break-words">{activeStationAlert.message}</span>
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
        <h1 className="sr-only">{VIEW_TITLES[activeTab] || 'Torneos de Beyblade X'}</h1>
        {/* Breadcrumbs & Active Tournament Bar */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[var(--acero)] bg-[var(--chasis)] border border-[var(--costura)] px-3 sm:px-4 py-2.5 rounded-2xl shadow-xs gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            {activeTournament ? (
              <>
                <span className="font-semibold text-[var(--hueso)]">Torneo:</span>
                <span className="font-bold text-[var(--hueso)]">{activeTournament.name}</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-[var(--acero)]">
                  {activeTournament.venueName || 'Sede no definida'} ({activeTournament.country || 'PA'})
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--hueso)]">Torneo:</span>
                <span className="font-bold text-[var(--acero)]">Sin torneo seleccionado</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-[var(--acero)]">Selecciona o crea un torneo para comenzar</span>
              </>
            )}
          </div>

          {activeTournament && (
            <nav
              aria-label="Navegación del torneo"
              className="mb-5 flex items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-1.5"
            >
              {[
                { id: 'overview' as const, label: 'Resumen', icon: LayoutDashboard },
                { id: 'participants' as const, label: 'Participantes', icon: Users },
                { id: 'stages' as const, label: 'Etapas', icon: ListOrdered, wizardTab: 'stages' as const },
                { id: 'bracket' as const, label: 'Brackets', icon: Trophy },
                { id: 'referee' as const, label: 'Árbitros', icon: Scale },
                { id: 'config' as const, label: 'Configuración', icon: Settings, wizardTab: 'general' as const },
              ].map((item) => {
                const isSelected =
                  item.id === 'config'
                    ? activeTab === 'wizard'
                    : item.id === 'stages'
                      ? activeTab === 'wizard' && wizardInitialTab === 'stages'
                      : activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={isSelected ? 'page' : undefined}
                    onClick={() => {
                      if (item.id === 'config' || item.id === 'stages') {
                        setWizardInitialTab(item.wizardTab || 'general');
                        setActiveTab('wizard');
                      } else {
                        setActiveTab(item.id);
                      }
                    }}
                    className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                        : 'text-[var(--acero)] hover:bg-[var(--grafito)] hover:text-[var(--hueso)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {activeTab === 'overview' && activeTournament && (
            <section className="space-y-5" aria-labelledby="tournament-overview-title">
              <div className="flex flex-col gap-1">
                <h2 id="tournament-overview-title" className="text-xl font-black text-[var(--hueso)]">
                  Resumen de {activeTournament.name}
                </h2>
                <p className="text-sm text-[var(--acero)]">
                  Revisa el estado del evento antes de registrar participantes o iniciar una etapa.
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['Estado', activeTournament.status === 'in_progress' ? 'En vivo' : activeTournament.status === 'completed' ? 'Finalizado' : 'Registro'],
                  ['Participantes', `${participants.filter((p) => p.tournamentId === activeTournament.id).length} / ${activeTournament.maxParticipants || 16}`],
                  ['Etapas', String(tournamentStages.length)],
                  ['Puntos de final', `${activeTournament.pointsToWinFinal || 7} pts`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--acero)]">{label}</div>
                    <div className="mt-1 text-lg font-black text-[var(--hueso)]">{value}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[var(--hueso)]">Ruta del torneo</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardInitialTab('general');
                      setActiveTab('wizard');
                    }}
                    className="text-xs font-bold text-[var(--cobalto)] hover:text-white"
                  >
                    Editar configuración
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {tournamentStages.map((stage, index) => (
                    <div key={stage.id} className="rounded-xl border border-[var(--costura)] bg-[var(--grafito)] p-3">
                      <div className="text-[10px] font-bold text-[var(--acero)]">ETAPA {index + 1}</div>
                      <div className="mt-1 text-xs font-bold text-[var(--hueso)]">{stage.name}</div>
                      <div className="mt-1 text-[10px] text-[var(--acero)]">{stage.type.replace('_', ' ')}</div>
                      <div className="mt-2 text-[10px] text-[var(--cobalto)]">
                        {stage.status === 'completed' ? 'Completada' : stage.status === 'in_progress' ? 'En curso' : 'Pendiente'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-[var(--hueso)]">Vista previa del bracket</h3>
                  <p className="mt-1 text-[11px] text-[var(--acero)]">
                    Estructura que verá el usuario antes de iniciar la primera etapa.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const primaryStage = tournamentStages[0];
                    const previewLabels = primaryStage?.type === 'double_elimination'
                      ? ['Winners', 'Losers', 'Gran Final']
                      : primaryStage?.type === 'single_elimination'
                        ? ['Ronda inicial', 'Semifinales', 'Gran Final']
                        : primaryStage?.type === 'swiss'
                          ? ['Ronda 1', `Ronda ${primaryStage.config.swissRounds || 3}`, 'Clasificación']
                          : ['Grupos', 'Clasificación', 'Playoffs'];
                    return previewLabels.map((label, index) => (
                      <React.Fragment key={label}>
                        {index > 0 && <span className="text-[var(--acero)]">→</span>}
                        <div className="min-w-[110px] rounded-xl border border-[var(--costura)] bg-[var(--grafito)] px-3 py-3 text-center">
                          <div className="text-[10px] font-black uppercase tracking-wide text-[var(--acero)]">Paso {index + 1}</div>
                          <div className="mt-1 text-xs font-bold text-[var(--hueso)]">{label}</div>
                        </div>
                      </React.Fragment>
                    ));
                  })()}
                </div>
              </div>
            </section>
          )}

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
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
            onSelectTournament={(tourneyId, targetTab) => {
              setActiveTournamentId(tourneyId);
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
        {activeTab === 'wizard' && <TournamentWizard initialTab={wizardInitialTab} />}

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
