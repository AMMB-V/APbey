import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import {
  Maximize,
  Minimize,
  Trophy,
  Volume2,
  X,
  Clock,
  Radio,
  Flame,
  Zap,
  Sparkles,
  Shield,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface StadiumDisplayProps {
  onClose?: () => void;
}

export const StadiumDisplay: React.FC<StadiumDisplayProps> = ({ onClose }) => {
  const {
    activeTournament,
    matches,
    participants,
    stages,
    groups,
    battles,
    activeStationAlert,
    dismissStationCall,
  } = useTournament();

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'arenas' | 'upcoming' | 'standings'>('arenas');

  // Real-time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const getParticipant = (id?: string | null) => {
    if (!id) return undefined;
    return participants.find((p) => p.id === id);
  };

  // Active / Live matches
  const liveMatches = matches.filter(
    (m) =>
      m.tournamentId === activeTournament?.id &&
      (m.status === 'in_progress' || m.calledToStation || m.station)
  );

  // In-progress or recently completed matches
  const displayMatches = liveMatches.length > 0
    ? liveMatches
    : matches
        .filter((m) => m.tournamentId === activeTournament?.id && !m.isBye && m.participant1Id && m.participant2Id)
        .slice(0, 6);

  // Upcoming matches waiting in queue
  const upcomingMatches = matches
    .filter(
      (m) =>
        m.tournamentId === activeTournament?.id &&
        m.status === 'pending' &&
        m.participant1Id &&
        m.participant2Id &&
        !m.isBye
    )
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col font-sans select-none overflow-y-auto">
      {/* Stadium Top Bar */}
      <header className="px-6 py-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-950/50">
            <Radio className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded">
                LIVE STADIUM DISPLAY · PANTALLA OFICIAL
              </span>
              <span className="text-xs text-neutral-400 font-mono">WBO RULESET</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
              {activeTournament?.name || 'Torneo Beyblade X'}
            </h1>
          </div>
        </div>

        {/* Center Clock & Navigation tabs */}
        <div className="hidden md:flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('arenas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'arenas'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Estadios en Vivo ({displayMatches.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Próximos Combates ({upcomingMatches.length})
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-sm">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="tabular-nums font-bold">{currentTime}</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de Pantalla Completa' : 'Modo Pantalla Completa para Proyector'}
            className="p-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Cerrar pantalla de estadio"
              className="p-2.5 rounded-lg bg-neutral-800 hover:bg-rose-900/60 text-neutral-300 hover:text-rose-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Real-time Match Summon Alert Banner (Llamada a Mesa / Estadio) */}
      {activeStationAlert && (
        <aside
          aria-label="Convocatoria a Estadio"
          className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-600 text-white px-6 py-4 shadow-2xl border-b-2 border-amber-300 animate-pulse shrink-0"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[var(--chasis)]/20 backdrop-blur-md rounded-2xl shrink-0">
                <Volume2 className="w-8 h-8 text-white animate-bounce" />
              </div>
              <div>
                <div className="text-xs font-black tracking-widest uppercase bg-black/30 px-2.5 py-0.5 rounded-full inline-block">
                  CONVOCATORIA INMEDIATA A ESTADIO
                </div>
                <div className="text-lg sm:text-2xl font-black mt-1 tracking-tight text-white drop-shadow-md">
                  {activeStationAlert.message}
                </div>
              </div>
            </div>

            <button
              onClick={() => dismissStationCall(activeStationAlert.matchId)}
              className="px-5 py-2.5 bg-black/60 hover:bg-black/80 text-white rounded-xl text-xs font-bold border border-white/30 transition-colors shrink-0"
            >
              Confirmar Recepción / Descartar
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'arenas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                Estadios Activos y Mesas de Combate
              </h2>
              <span className="text-xs text-neutral-500 font-mono">
                Actualizado en tiempo real vía estado unificado
              </span>
            </div>

            {displayMatches.length === 0 ? (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
                <Trophy className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-white">No hay combates activos en este momento</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Inicia una etapa o asigna combates a los estadios para proyectarlos en vivo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {displayMatches.map((m, idx) => {
                  const p1 = getParticipant(m.participant1Id);
                  const p2 = getParticipant(m.participant2Id);
                  const grp = groups.find((g) => g.id === m.groupId);
                  const stg = stages.find((s) => s.id === m.stageId);
                  const matchBattles = battles
                    .filter((b) => b.matchId === m.id)
                    .sort((a, b) => b.battleNumber - a.battleNumber);
                  const lastBattle = matchBattles[0];
                  const stationName = m.station || `Estadio ${idx + 1}`;
                  const isLive = m.status === 'in_progress';
                  const isDone = m.status === 'completed';

                  return (
                    <div
                      key={m.id}
                      className="bg-neutral-900 rounded-3xl border border-neutral-800 overflow-hidden shadow-2xl flex flex-col justify-between"
                    >
                      {/* Arena Header */}
                      <div className="bg-neutral-800/80 px-6 py-3 border-b border-neutral-700/60 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2.5 py-1 rounded-lg">
                            {stationName}
                          </span>
                          <span className="text-xs text-neutral-300 font-medium">
                            {grp ? grp.name : stg?.name || 'Playoffs'} · Match #{m.position}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLive && (
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              EN VIVO
                            </span>
                          )}
                          {isDone && (
                            <span className="text-xs font-bold text-neutral-300 bg-neutral-800 px-2.5 py-1 rounded-lg">
                              FINALIZADO
                            </span>
                          )}
                          {m.calledToStation && !isDone && (
                            <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2.5 py-1 rounded-lg animate-pulse">
                              CONVOCADO
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arena Scoreboard (Blue vs Red) */}
                      <div className="p-6 grid grid-cols-2 gap-6 relative">
                        {/* Center VS pill */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-neutral-950 border border-neutral-700 flex items-center justify-center font-black text-xs text-neutral-400 shadow-xl z-10">
                          VS
                        </div>

                        {/* Blue Blader Corner */}
                        <div className={`p-5 rounded-2xl border transition-all ${
                          m.winnerId === p1?.id
                            ? 'bg-blue-950/50 border-emerald-500'
                            : 'bg-neutral-950/80 border-blue-900/60'
                        }`}>
                          <div className="text-[10px] font-black tracking-widest text-blue-400 uppercase">
                            CORNER AZUL {p1?.seed ? `· SEED #${p1.seed}` : ''}
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-white mt-1 truncate">
                            {p1?.displayName || 'Por Definir'}
                          </div>
                          {p1?.deckCombos?.[0] && (
                            <div className="text-xs text-neutral-400 font-mono mt-1 truncate flex items-center gap-1">
                              <Shield className="w-3 h-3 text-blue-400 shrink-0" />
                              {p1.deckCombos[0]}
                            </div>
                          )}

                          <div className="mt-4 text-center">
                            <div className="text-6xl sm:text-7xl font-black font-mono tabular-nums text-blue-400 tracking-tight">
                              {m.score1}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400">PUNTOS</span>
                          </div>
                        </div>

                        {/* Red Blader Corner */}
                        <div className={`p-5 rounded-2xl border transition-all ${
                          m.winnerId === p2?.id
                            ? 'bg-rose-950/50 border-emerald-500'
                            : 'bg-neutral-950/80 border-rose-900/60'
                        }`}>
                          <div className="text-[10px] font-black tracking-widest text-rose-400 uppercase">
                            CORNER ROJO {p2?.seed ? `· SEED #${p2.seed}` : ''}
                          </div>
                          <div className="text-xl sm:text-2xl font-black text-white mt-1 truncate">
                            {p2?.displayName || 'Por Definir'}
                          </div>
                          {p2?.deckCombos?.[0] && (
                            <div className="text-xs text-neutral-400 font-mono mt-1 truncate flex items-center gap-1">
                              <Shield className="w-3 h-3 text-rose-400 shrink-0" />
                              {p2.deckCombos[0]}
                            </div>
                          )}

                          <div className="mt-4 text-center">
                            <div className="text-6xl sm:text-7xl font-black font-mono tabular-nums text-rose-400 tracking-tight">
                              {m.score2}
                            </div>
                            <span className="text-[10px] uppercase font-bold text-neutral-400">PUNTOS</span>
                          </div>
                        </div>
                      </div>

                      {/* Last Battle Event Marquee */}
                      <div className="px-6 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          <span className="text-neutral-400 font-medium">Último Asalto:</span>
                          {lastBattle ? (
                            <span className="text-neutral-200 font-semibold">
                              {lastBattle.finish ? `${lastBattle.finish.toUpperCase()} FINISH` : 'PUNTOS'} (+{lastBattle.points} pts) · {lastBattle.scorerId === p1?.id ? p1?.displayName : p2?.displayName}
                            </span>
                          ) : (
                            <span className="text-neutral-500 italic">Esperando primer lanzamiento...</span>
                          )}
                        </div>

                        <div className="text-neutral-400 font-mono text-[11px]">
                          Meta: {stg?.pointsToWin || 4} pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Combates en Cola (On Deck) - Preparar Decks
              </h2>
              <span className="text-xs text-neutral-500 font-mono">
                Orden oficial de llamado a mesa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingMatches.map((m, idx) => {
                const b1 = getParticipant(m.participant1Id);
                const b2 = getParticipant(m.participant2Id);
                const grp = groups.find((g) => g.id === m.groupId);

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-mono font-bold text-amber-400 text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs text-neutral-400 font-mono">
                          {grp ? grp.name : 'Playoffs'} · Match #{m.position}
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {b1?.displayName || 'TBD'} <span className="text-neutral-500 font-normal">vs</span> {b2?.displayName || 'TBD'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded">
                        EN ESPERA
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Stadium Bottom Ticker */}
      <footer className="px-6 py-3 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-neutral-300">Sistema Oficial BeyScore</span>
          </div>
          <span className="hidden sm:inline">Puntuación WBO: Spin 1pt · Over 2pts · Burst 2pts · Xtreme 3pts</span>
          <span className="hidden md:inline">Faltas: +1 punto al rival cada 3 infracciones</span>
        </div>

        <div className="font-mono text-neutral-500">
          AppBey Arena Engine · Proyector Mode
        </div>
      </footer>
    </div>
  );
};
