import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Radio,
  Volume2,
  VolumeX,
  RotateCcw,
  Shield,
  Flame,
  Zap,
  AlertTriangle,
  History,
  ArrowRight,
  X,
  Scale,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { SyncBadge } from '../common/SyncBadge';
import { Snackbar } from '../common/Snackbar';
import { SetTimeline } from './SetTimeline';
import { MatchSetReport } from '../referee/MatchSetReport';
import { FinishType } from '../../types/tournament';
import { getMatchPointsToWin, getSetsNeeded, liveSetScores } from '../../lib/engine/arbitration';

interface ScoreboardViewProps {
  initialMatchId?: string;
  onOpenMatchInReferee?: (matchId: string) => void;
  onNavigateTab?: (tab: 'torneos' | 'bracket') => void;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({ initialMatchId, onNavigateTab }) => {
  const {
    matches,
    activeTournament,
    stages,
    rounds,
    participants,
    battles,
    penalties,
    recordBattle,
    recordPenalty,
    undoBattle,
    reportMatchSets,
    currentRole,
    currentUser,
    openAuthModal,
    supabaseSyncInfo,
  } = useTournament();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOfficialMatchId, setSelectedOfficialMatchId] = useState(initialMatchId || '');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const savingRef = useRef(false);
  const [savingScore, setSavingScore] = useState(false);
  const [saveFailure, setSaveFailure] = useState<{ matchId: string; score1: number; score2: number } | null>(null);

  const saveScore = async (save: () => Promise<boolean>, message: string, undo?: () => void) => {
    if (savingRef.current) return false;
    savingRef.current = true;
    setSavingScore(true);
    setSaveFailure(null);
    setSnackbarOpen(false);
    setLastAction(null);
    let saved = false;
    try {
      saved = await save();
    } catch {
      saved = false;
    } finally {
      savingRef.current = false;
      setSavingScore(false);
    }
    if (!saved && officialMatch) setSaveFailure({ matchId: officialMatch.id, score1: officialMatch.score1, score2: officialMatch.score2 });
    setSnackbarMessage(saved ? message : 'No se pudo guardar. Revisa el marcador e inténtalo de nuevo.');
    if (saved && undo) setLastAction(() => undo);
    setSnackbarOpen(true);
    return saved;
  };

  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  // Foul / Penalty Modal State
  const [showFoulModal, setShowFoulModal] = useState(false);
  const [foulTarget, setFoulTarget] = useState<'p1' | 'p2'>('p1');
  const [foulReason, setFoulReason] = useState('Lanzamiento anticipado (False Start)');
  const [foulPointsToRival, setFoulPointsToRival] = useState(false);

  // Filter valid tournament matches — only pending/in_progress shown in grid
  const tournamentMatches = matches.filter(
    (match) =>
      match.tournamentId === activeTournament?.id &&
      match.participant1Id &&
      match.participant2Id &&
      !match.isBye
  );

  // Matches visible in the selector grid (hide already completed ones)
  const selectableMatches = tournamentMatches.filter(
    (match) => match.status !== 'completed'
  );

  useEffect(() => {
    if (!tournamentMatches.some((match) => match.id === selectedOfficialMatchId)) {
      setSelectedOfficialMatchId(
        tournamentMatches.find((match) => match.id === initialMatchId)?.id ||
          selectableMatches.find((match) => match.status === 'in_progress')?.id ||
          selectableMatches[0]?.id ||
          ''
      );
    }
  }, [initialMatchId, selectedOfficialMatchId, tournamentMatches, selectableMatches]);

  const officialMatch = tournamentMatches.find((match) => match.id === selectedOfficialMatchId);
  const officialP1 = participants.find((participant) => participant.id === officialMatch?.participant1Id);
  const officialP2 = participants.find((participant) => participant.id === officialMatch?.participant2Id);
  const activeP1Score = officialMatch?.score1 || 0;
  const activeP2Score = officialMatch?.score2 || 0;
  const activeStage = officialMatch ? stages.find((stage) => stage.id === officialMatch.stageId) : undefined;
  const canArbitrate = Boolean(currentUser && activeTournament?.status === 'in_progress' && activeStage?.status === 'in_progress' && (
    currentRole === 'admin' ||
    (currentRole === 'organizer' && activeTournament.organizerId === currentUser.id) ||
    (currentRole === 'referee' && officialMatch?.refereeId === currentUser.id)
  ));
  const activeRound = officialMatch ? rounds.find((round) => round.id === officialMatch.roundId) : undefined;
  const target = officialMatch && activeStage && activeTournament
    ? getMatchPointsToWin(officialMatch, activeStage, activeTournament, activeRound)
    : 4;
  const p1Winner = officialMatch?.status === 'completed' && officialMatch.winnerId === officialP1?.id;
  const p2Winner = officialMatch?.status === 'completed' && officialMatch.winnerId === officialP2?.id;

  // Battles and penalties for current match
  const matchBattles = officialMatch
    ? battles.filter((b) => b.matchId === officialMatch.id).sort((a, b) => b.battleNumber - a.battleNumber)
    : [];

  const matchPenalties = officialMatch
    ? penalties.filter((p) => p.matchId === officialMatch.id)
    : [];

  const setScores = officialMatch ? liveSetScores(officialMatch, matchBattles, matchPenalties, target) : [];
  const canCloseTie = Boolean(canArbitrate && officialMatch?.status === 'in_progress' &&
    activeP1Score > 0 && activeP1Score === activeP2Score && activeP1Score < target);

  function closeTiedSet() {
    if (!officialMatch || !canCloseTie) return;
    void saveScore(async () => {
      await reportMatchSets(officialMatch.id, officialMatch.version, [...setScores, [0, 0]], true);
      return true;
    }, 'Set empatado guardado. El siguiente set empieza en 0–0.');
  }

  const stationQueue = officialMatch?.station ? matches.filter(match =>
    match.tournamentId === officialMatch.tournamentId && match.id !== officialMatch.id && match.station === officialMatch.station && match.status === 'pending' && !match.isBye) : [];
  const nextMatch = stationQueue.find(match => match.participant1Id && match.participant2Id &&
    stages.some(stage => stage.id === match.stageId && stage.status === 'in_progress') &&
    (currentRole === 'referee' ? match.refereeId === currentUser?.id : Boolean(match.refereeId)));
  const nextStageName = stages.find(stage => stage.id === nextMatch?.stageId)?.name;
  const blockedBySaveFailure = saveFailure?.matchId === officialMatch?.id && Boolean(saveFailure);
  const nextParticipants = nextMatch && [nextMatch.participant1Id, nextMatch.participant2Id]
    .map(id => participants.find(player => player.id === id)?.displayName ?? 'Por definir').join(' vs. ');
  const stationQueueMessage = !officialMatch?.station ? 'Asigna una mesa para ver su siguiente combate.' :
    stationQueue.some(match => !match.participant1Id || !match.participant2Id)
      ? 'Hay cruces en esta mesa que aún esperan participantes.'
      : stationQueue.length ? 'Revisa el árbitro asignado y la fase de los combates pendientes.'
      : 'No hay más combates pendientes en esta mesa.';

  const handleNextMatch = () => {
    if (!nextMatch || savingScore) return;
    setSelectedOfficialMatchId(nextMatch.id);
    setLastAction(null);
    setSnackbarOpen(false);
    window.scrollTo(0, 0);
  };

  const playSoundEffect = (points: number) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.frequency.setValueAtTime(points === 1 ? 520 : points === 2 ? 660 : 880, context.currentTime);
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.2);
    } catch {
      // AudioContext unavailable
    }
  };

  const triggerVibration = (ms = 45) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };

  const handleRecordBattle = async (scorer: 'p1' | 'p2', finish: FinishType, points: number) => {
    if (!officialMatch || !officialP1 || !officialP2) return;
    if (!canArbitrate) {
      openAuthModal('login');
      return;
    }

    const currentPoints = scorer === 'p1' ? officialMatch.score1 : officialMatch.score2;
    const currentSets = scorer === 'p1' ? officialMatch.sets1 : officialMatch.sets2;
    if (activeStage && currentPoints + points >= target && currentSets + 1 >= getSetsNeeded(activeStage) &&
        !window.confirm(`Este punto decide el combate a favor de ${scorer === 'p1' ? officialP1.displayName : officialP2.displayName}. ¿Confirmar resultado?`)) return;
    const winner = scorer === 'p1' ? officialP1 : officialP2;
    const saved = await saveScore(
      () => recordBattle(officialMatch.id, winner.id, finish, `Finish ${finish} (${points} pts)`),
      `Guardado: +${points} para ${winner.displayName}.`,
      () => undoBattle(officialMatch.id)
    );
    if (saved) {
      playSoundEffect(points);
      triggerVibration(points >= 3 ? 90 : 45);
    }
  };

  const handleApplyPenalty = async () => {
    if (!officialMatch || !officialP1 || !officialP2) return;
    if (!canArbitrate) {
      openAuthModal('login');
      return;
    }
    const offender = foulTarget === 'p1' ? officialP1 : officialP2;
    setShowFoulModal(false);
    await saveScore(
      () => recordPenalty(officialMatch.id, offender.id, undefined, true, foulReason),
      `Falta guardada para ${offender.displayName}.`
    );
  };

  const renderFinishButton = (
    scorer: 'p1' | 'p2',
    finish: FinishType,
    points: number,
    title: string,
    detail: string,
    borderColor: string,
    textColor: string,
    icon: React.ReactNode
  ) => (
    <button
      type="button"
      aria-label={`${title}, +${points} para ${scorer === "p1" ? officialP1?.displayName : officialP2?.displayName}`}
      onClick={() => handleRecordBattle(scorer, finish, points)}
      disabled={savingScore || blockedBySaveFailure || !canArbitrate || !officialMatch || officialMatch.status === 'completed'}
      className={`w-full min-w-0 min-h-[56px] py-2 px-2 sm:px-4 rounded-2xl bg-[var(--chasis)] border-2 ${borderColor} hover:opacity-90 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-between shadow-md group`}
    >
      <div className="flex min-w-0 items-center gap-1 sm:gap-3 text-left">
        <div className={`hidden rounded-xl bg-[var(--grafito)] p-2 sm:block ${textColor} shrink-0`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-black text-[var(--hueso)]">{title}</div>
          <div className="hidden text-[10px] text-[var(--acero)] sm:block">{detail}</div>
        </div>
      </div>
      <span className={`text-lg font-black font-mono ${textColor}`}>+{points}</span>
    </button>
  );

  return (
    <div className="min-w-0 max-w-4xl mx-auto px-0 sm:px-4 py-4 pb-20 md:pb-4 w-full flex flex-col gap-5">
      {officialMatch && onNavigateTab && (
        <button type="button" onClick={() => onNavigateTab('bracket')}
          className="self-start min-h-11 text-sm font-semibold text-[var(--cobalto-texto)] hover:underline">
          ← Volver al cuadro
        </button>
      )}
      {/* View Header with Status */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-[var(--cobalto-texto)] shrink-0" aria-hidden="true" />
            <span>Mesa de Arbitraje y Marcador</span>
          </h1>
          <p className="text-xs text-[var(--acero)] mt-0.5">
            Registro oficial de puntos WBO, faltas reglamentarias y control de combates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SyncBadge
            isConfigured={supabaseSyncInfo.isConfigured}
            isConnected={supabaseSyncInfo.isConnected}
            message={supabaseSyncInfo.message}
          />
          <button
            type="button"
            onClick={() => setSoundEnabled((value) => !value)}
            aria-label={soundEnabled ? 'Silenciar sonidos de puntos' : 'Activar sonidos de puntos'}
            className="p-2 rounded-xl bg-[var(--chasis)] border border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)] min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Match Selector & Next Match Bar */}
      <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl p-4 flex flex-col gap-3 shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[var(--hueso)]">Combate en mesa:</span>
            {officialMatch && (
              <span className="text-xs font-mono font-bold text-[var(--cobalto-texto)]">
                Mesa {officialMatch.station || 'A'}
              </span>
            )}
            {activeStage && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--grafito)] border border-[var(--costura)] text-[var(--hueso)]">
                Al mejor de {activeStage.bestOf || 1}
              </span>
            )}
            {officialMatch && activeStage && officialMatch.status !== 'completed' && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--cobalto)]/20 border border-[var(--cobalto)]/40 text-[var(--cobalto-texto)]">
                Set {setScores.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentRole === 'referee' && officialMatch && officialMatch.refereeId !== currentUser?.id && (
              <span className="text-xs text-amber-400">Solo lectura. Este combate no está asignado a tu cuenta.</span>
            )}
            {currentRole === 'public' && (
              <span className="text-[11px] text-amber-400 font-semibold">
                Modo visor. Inicia sesión con un rol oficial para arbitrar.
              </span>
            )}
          </div>
        </div>

        {selectableMatches.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--acero)]">
            No hay combates pendientes para el torneo activo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {selectableMatches.map((match) => {
              const blader1 = participants.find((p) => p.id === match.participant1Id)?.displayName || 'P1';
              const blader2 = participants.find((p) => p.id === match.participant2Id)?.displayName || 'P2';
              const selected = match.id === selectedOfficialMatchId;
              const isMine = match.refereeId === currentUser?.id;

              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => setSelectedOfficialMatchId(match.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all min-h-[50px] flex flex-col justify-between ${
                    selected
                      ? 'border-[var(--cobalto)] bg-[var(--grafito)] shadow-xs'
                      : 'border-[var(--costura)] bg-[var(--grafito)]/60 hover:border-[var(--acero)]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[var(--acero)] mb-1">
                    <span>Mesa {match.station || 'A'}</span>
                    <div className="flex items-center gap-1">
                      {isMine && <span className="text-emerald-400 font-bold">Mi mesa</span>}
                      <span className={match.status === 'in_progress' ? 'text-amber-400 font-bold' : match.status === 'completed' ? 'text-neutral-400' : ''}>
                        {match.status === 'in_progress' ? 'En curso' : match.status === 'completed' ? 'Finalizado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-[var(--hueso)] truncate">
                    {blader1} <span className="font-normal text-[var(--acero)]">vs</span> {blader2}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--cobalto-texto)] mt-1 font-bold">
                    {match.score1} - {match.score2}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!officialMatch || !officialP1 || !officialP2 ? (
        <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] flex items-center justify-center text-[var(--cobalto-texto)]">
            <Radio className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--hueso)]">Ningún combate oficial seleccionado</h3>
            <p className="text-xs text-[var(--acero)] leading-relaxed">
              {selectableMatches.length > 0
                ? 'Elige una de las mesas listadas arriba para abrir el marcador y registrar puntos reglamentarios WBO.'
                : 'No hay combates disponibles en el torneo actual. Puedes revisar las llaves o seleccionar otro torneo.'}
            </p>
          </div>
          {onNavigateTab && (
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigateTab('bracket')}
                className="px-4 py-2 rounded-xl bg-[var(--grafito)] border border-[var(--costura)] hover:border-[var(--cobalto)] text-xs font-semibold text-[var(--hueso)] transition-colors"
              >
                Ver Brackets
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('torneos')}
                className="px-4 py-2 rounded-xl bg-[var(--cobalto)] text-[var(--tinta)] font-bold text-xs hover:opacity-90 transition-opacity"
              >
                Explorar Torneos
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {officialMatch.status !== 'completed' && (
            <div className="fixed bottom-20 left-3 right-3 z-30 flex min-w-0 items-center justify-between gap-2 rounded-xl border border-[var(--costura)] bg-[var(--chasis)] p-2 text-xs shadow-lg md:hidden">
              <span className="min-w-0 truncate text-[var(--cobalto-texto)]">{officialP1.displayName}</span>
              <span className="shrink-0 text-center font-mono font-bold tabular-nums">
                {activeP1Score}–{activeP2Score}<span className="block text-[var(--acero)]">Set {setScores.length}</span>
              </span>
              <span className="min-w-0 truncate text-[var(--cobre)]">{officialP2.displayName}</span>
            </div>
          )}
          {/* Main Scoreboard Digits Display */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-[var(--chasis)] border-2 border-[var(--costura)] rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            {/* Blader 1 (Azul / Cobalto) */}
            <div
              className={`flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 transition-all ${
                p1Winner ? 'border-emerald-500 bg-emerald-950/30' : 'border-[var(--cobalto)]/40 bg-[var(--grafito)]'
              }`}
            >
              <div className="w-full text-center">
                <span className="font-bold text-sm sm:text-base block truncate text-[var(--cobalto-texto)]">
                  {officialP1.displayName}
                </span>
                <span className="text-[10px] text-[var(--acero)] uppercase tracking-wider block font-semibold mt-0.5">
                  Lado Azul
                </span>
              </div>
              <div className="my-1.5 sm:my-2 font-mono font-black text-5xl sm:text-7xl tracking-tighter text-[var(--hueso)] select-none drop-shadow-md">
                {activeP1Score}
              </div>

              {/* Sets ganados como puntos visuales */}
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: activeStage?.bestOf || 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      i < officialMatch.sets1
                        ? 'bg-[var(--cobalto)] border-[var(--cobalto)]'
                        : 'bg-transparent border-[var(--costura)]'
                    }`}
                    aria-label={i < officialMatch.sets1 ? 'Set ganado' : 'Set pendiente'}
                  />
                ))}
              </div>

              {p1Winner && (
                <div className="mt-2 px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-wider animate-bounce">
                  ¡Ganador!
                </div>
              )}
            </div>

            {/* Blader 2 (Naranja / Cobre) */}
            <div
              className={`flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 transition-all ${
                p2Winner ? 'border-emerald-500 bg-emerald-950/30' : 'border-[var(--cobre)]/40 bg-[var(--grafito)]'
              }`}
            >
              <div className="w-full text-center">
                <span className="font-bold text-sm sm:text-base block truncate text-[var(--cobre)]">
                  {officialP2.displayName}
                </span>
                <span className="text-[10px] text-[var(--acero)] uppercase tracking-wider block font-semibold mt-0.5">
                  Lado Naranja
                </span>
              </div>
              <div className="my-1.5 sm:my-2 font-mono font-black text-5xl sm:text-7xl tracking-tighter text-[var(--hueso)] select-none drop-shadow-md">
                {activeP2Score}
              </div>

              {/* Sets ganados como puntos visuales */}
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: activeStage?.bestOf || 1 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full border-2 transition-all ${
                      i < officialMatch.sets2
                        ? 'bg-[var(--cobre)] border-[var(--cobre)]'
                        : 'bg-transparent border-[var(--costura)]'
                    }`}
                    aria-label={i < officialMatch.sets2 ? 'Set ganado' : 'Set pendiente'}
                  />
                ))}
              </div>

              {p2Winner && (
                <div className="mt-2 px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-wider animate-bounce">
                  ¡Ganador!
                </div>
              )}
            </div>
          </div>

          {officialMatch.status === 'in_progress' && (
            <SetTimeline scores={setScores} canCloseTie={canCloseTie && !savingScore && !blockedBySaveFailure} onCloseTie={closeTiedSet} />
          )}
          {activeStage && activeTournament && (
            <MatchSetReport
              key={officialMatch.id}
              match={officialMatch}
              stage={activeStage}
              players={[officialP1, officialP2]}
              target={target}
              canReport={!savingScore && !blockedBySaveFailure && canArbitrate && officialMatch.status !== 'completed'}
              currentScores={setScores}
              onReport={reportMatchSets}
            />
          )}

          {/* Quick Foul / Penalty Button Bar */}
          <div className="flex items-center justify-between bg-[var(--chasis)] p-3 rounded-2xl border border-[var(--costura)] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-[var(--hueso)]">Reglamento & Faltas:</span>
              <span className="text-[11px] text-[var(--acero)]">
                {matchPenalties.length > 0 ? (matchPenalties.length === 1 ? '1 sanción aplicada' : `${matchPenalties.length} sanciones aplicadas`) : 'Sin faltas en el combate'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!canArbitrate) {
                  openAuthModal('login');
                  return;
                }
                setShowFoulModal(true);
              }}
              disabled={savingScore || blockedBySaveFailure || !canArbitrate || officialMatch.status === 'completed'}
              className="px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-800 text-xs font-bold text-amber-300 hover:bg-amber-950 flex items-center gap-1.5 transition-colors min-h-[36px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Registrar Falta / Tarjeta</span>
            </button>
          </div>

          {saveFailure?.matchId === officialMatch.id && (
            <div role="alert" className="rounded-xl border border-amber-600 bg-[var(--chasis)] p-3 text-sm">
              <p>Guardado sin confirmar. Marcador anterior al intento: {saveFailure.score1}–{saveFailure.score2}.</p>
              <button type="button" className="mt-1 min-h-11 font-bold text-[var(--cobalto-texto)]"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('match', officialMatch.id);
                  window.history.replaceState(null, '', url);
                  window.location.reload();
                }}>Actualizar marcador</button>
            </div>
          )}
          {/* Points Punchpad with Icons (HCI touch targets >= 56px) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* P1 Controls */}
            <div className="flex flex-col gap-2">
              <div className="break-words text-center text-xs font-bold text-[var(--cobalto-texto)] pb-1 border-b border-[var(--cobalto)]/30">
                Anotar a {officialP1.displayName}
              </div>
              {renderFinishButton(
                'p1',
                'spin',
                (activeTournament?.finishPoints?.spin ?? 1),
                'Spin Finish',
                'Detención por giro',
                'border-[var(--costura)] hover:border-[var(--cobalto)]',
                'text-[var(--cobalto-texto)]',
                <RotateCcw className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p1',
                'over',
                (activeTournament?.finishPoints?.over ?? 2),
                'Over Finish',
                'Salida de arena / bolsillo',
                'border-emerald-900/60 hover:border-emerald-500',
                'text-emerald-400',
                <Shield className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p1',
                'burst',
                (activeTournament?.finishPoints?.burst ?? 2),
                'Burst Finish',
                'Desarme de piezas',
                'border-pink-900/60 hover:border-pink-500',
                'text-pink-400',
                <Flame className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p1',
                'xtreme',
                (activeTournament?.finishPoints?.xtreme ?? 3),
                'Xtreme Finish',
                'Xtreme Dash Pocket',
                'border-purple-900/60 hover:border-purple-400',
                'text-purple-300',
                <Zap className="w-4 h-4" />
              )}
            </div>

            {/* P2 Controls */}
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs font-bold text-[var(--cobre)] pb-1 border-b border-[var(--cobre)]/30 break-words">
                Anotar a {officialP2.displayName}
              </div>
              {renderFinishButton(
                'p2',
                'spin',
                (activeTournament?.finishPoints?.spin ?? 1),
                'Spin Finish',
                'Detención por giro',
                'border-[var(--costura)] hover:border-[var(--cobre)]',
                'text-[var(--cobre)]',
                <RotateCcw className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p2',
                'over',
                (activeTournament?.finishPoints?.over ?? 2),
                'Over Finish',
                'Salida de arena / bolsillo',
                'border-emerald-900/60 hover:border-emerald-500',
                'text-emerald-400',
                <Shield className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p2',
                'burst',
                (activeTournament?.finishPoints?.burst ?? 2),
                'Burst Finish',
                'Desarme de piezas',
                'border-pink-900/60 hover:border-pink-500',
                'text-pink-400',
                <Flame className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p2',
                'xtreme',
                (activeTournament?.finishPoints?.xtreme ?? 3),
                'Xtreme Finish',
                'Xtreme Dash Pocket',
                'border-purple-900/60 hover:border-purple-400',
                'text-purple-300',
                <Zap className="w-4 h-4" />
              )}
            </div>
          </div>

          {/* Close Match & Advance Banner */}
          {(p1Winner || p2Winner) && (
            <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-black text-emerald-200">
                    Gana {p1Winner ? officialP1.displayName : officialP2.displayName}
                  </div>
                  <div className="text-xs text-emerald-300/80">
                    Sets: {officialMatch.sets1}–{officialMatch.sets2}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                {nextMatch && (
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-[var(--cobalto)] text-[var(--tinta)] font-black text-xs rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Siguiente en {nextMatch.station} · {nextParticipants}{nextStageName && ` · ${nextStageName}`}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
                {!nextMatch && canArbitrate && <p className="text-xs text-emerald-200">{stationQueueMessage}</p>}
              </div>
            </div>
          )}

          {/* Points & Battle Records Log (Registro de Puntos) */}
          <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[var(--cobalto-texto)]" />
                <h2 className="text-sm font-black text-[var(--hueso)]">
                  Registro de Puntos & Historial del Combate ({matchBattles.length})
                </h2>
              </div>
              {matchBattles.some(b => !b.voided && b.battleNumber > (officialMatch.setCheckpoint?.battleNumber ?? 0)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (canArbitrate) undoBattle(officialMatch.id);
                  }}
                  disabled={savingScore || blockedBySaveFailure || !canArbitrate}
                  className="text-xs text-[var(--acero)] hover:text-rose-400 flex items-center gap-1 min-h-[32px] px-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Deshacer última batalla</span>
                </button>
              )}
            </div>

            {matchBattles.length === 0 ? (
              <div className="text-center py-5 text-xs text-[var(--acero)]">
                Aún no se han anotado puntos en este combate. Usa los botones de finish para registrar cada batalla.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {matchBattles.map((b) => {
                  const winner = b.scorerId === officialP1.id ? officialP1 : officialP2;
                  const isP1 = b.scorerId === officialP1.id;
                  const finishLabel = b.voided ? 'Anulada' : b.finish ? `${b.finish.toUpperCase()} · +${b.points}` : 'Sin puntos';

                  return (
                    <div
                      key={b.id}
                      className="p-3 rounded-2xl bg-[var(--grafito)] border border-[var(--costura)] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-[var(--chasis)] font-mono font-bold flex items-center justify-center text-[11px] text-[var(--acero)]">
                          #{b.battleNumber}
                        </span>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span className={isP1 ? 'text-[var(--cobalto-texto)]' : 'text-[var(--cobre)]'}>
                              {b.scorerId ? winner?.displayName : 'Empate'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[var(--chasis)] text-[10px] font-mono font-bold text-[var(--hueso)]">
                              {finishLabel}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--acero)] mt-0.5">
                            {new Date(b.createdAt).toLocaleTimeString()} · Anotado por árbitro
                          </div>
                        </div>
                      </div>


                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Foul / Penalties Modal */}
      {showFoulModal && officialMatch && officialP1 && officialP2 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="foul-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-6 text-[var(--hueso)] flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--costura)]">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h2 id="foul-modal-title" className="text-base font-bold">
                  Sanción o Falta Reglamentaria
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowFoulModal(false)}
                className="p-1 text-[var(--acero)] hover:text-[var(--hueso)] min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Blader */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--acero)]">Infractor:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFoulTarget('p1')}
                  className={`p-2.5 rounded-xl border text-xs font-bold min-h-[44px] transition-all ${
                    foulTarget === 'p1'
                      ? 'border-[var(--cobalto)] bg-[var(--cobalto)]/20 text-[var(--hueso)]'
                      : 'border-[var(--costura)] bg-[var(--grafito)] text-[var(--acero)]'
                  }`}
                >
                  {officialP1.displayName}
                </button>
                <button
                  type="button"
                  onClick={() => setFoulTarget('p2')}
                  className={`p-2.5 rounded-xl border text-xs font-bold min-h-[44px] transition-all ${
                    foulTarget === 'p2'
                      ? 'border-[var(--cobre)] bg-[var(--cobre)]/20 text-[var(--hueso)]'
                      : 'border-[var(--costura)] bg-[var(--grafito)] text-[var(--acero)]'
                  }`}
                >
                  {officialP2.displayName}
                </button>
              </div>
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--acero)]">Infracción:</label>
              <select
                value={foulReason}
                onChange={(e) => setFoulReason(e.target.value)}
                className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-xl px-3 py-2 text-xs text-[var(--hueso)] min-h-[44px]"
              >
                <option value="Lanzamiento anticipado">Lanzamiento anticipado</option>
                <option value="Contacto con el estadio antes del choque">Contacto con el estadio antes del choque</option>
                <option value="Invasión de zona de combate">Invasión de zona de combate</option>
                <option value="Tocar el Beyblade en movimiento">Tocar el Beyblade en movimiento</option>
                <option value="Retraso injustificado de combate">Retraso injustificado de combate</option>
                <option value="Conducta antideportiva">Conducta antideportiva</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--costura)]">
              <button
                type="button"
                onClick={() => setShowFoulModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--grafito)] border border-[var(--costura)] text-xs font-semibold min-h-[40px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyPenalty}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold min-h-[40px]"
              >
                Aplicar Sanción
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar for Undo */}
      <div role="status" className={savingScore ? "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-[var(--chasis)] px-4 py-3 shadow-xl" : "sr-only"}>
        {savingScore ? "Guardando marcador…" : ""}
      </div>
      <Snackbar
        message={snackbarMessage}
        isOpen={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        onUndo={lastAction || undefined}
        undoLabel="Deshacer punto"
        duration={5000}
      />

    </div>
  );
};
