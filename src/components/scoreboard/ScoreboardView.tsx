import React, { useEffect, useState } from 'react';
import {
  CheckCircle,
  Radio,
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  Shield,
  Flame,
  Zap,
  Sparkles,
  AlertTriangle,
  History,
  ArrowRight,
  X,
  Scale,
  MinusCircle,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { SyncBadge } from '../common/SyncBadge';
import { Snackbar } from '../common/Snackbar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CardType, FinishType } from '../../types/tournament';

interface ScoreboardViewProps {
  initialMatchId?: string;
  onOpenMatchInReferee?: (matchId: string) => void;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({ initialMatchId }) => {
  const {
    matches,
    activeTournament,
    participants,
    battles,
    penalties,
    recordBattle,
    recordPenalty,
    undoBattle,
    currentRole,
    currentUser,
    openAuthModal,
  } = useTournament();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOfficialMatchId, setSelectedOfficialMatchId] = useState(initialMatchId || '');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [closeSummary, setCloseSummary] = useState('');

  // Foul / Penalty Modal State
  const [showFoulModal, setShowFoulModal] = useState(false);
  const [foulTarget, setFoulTarget] = useState<'p1' | 'p2'>('p1');
  const [foulCard, setFoulCard] = useState<CardType | 'none'>('none');
  const [foulReason, setFoulReason] = useState('Lanzamiento anticipado (False Start)');
  const [foulPointsToRival, setFoulPointsToRival] = useState(false);

  // Filter valid tournament matches
  const tournamentMatches = matches.filter(
    (match) =>
      match.tournamentId === activeTournament?.id &&
      match.participant1Id &&
      match.participant2Id &&
      !match.isBye
  );

  useEffect(() => {
    if (!tournamentMatches.some((match) => match.id === selectedOfficialMatchId)) {
      setSelectedOfficialMatchId(
        initialMatchId ||
          tournamentMatches.find((match) => match.status === 'in_progress')?.id ||
          tournamentMatches[0]?.id ||
          ''
      );
    }
  }, [initialMatchId, selectedOfficialMatchId, tournamentMatches]);

  const officialMatch = matches.find((match) => match.id === selectedOfficialMatchId);
  const officialP1 = participants.find((participant) => participant.id === officialMatch?.participant1Id);
  const officialP2 = participants.find((participant) => participant.id === officialMatch?.participant2Id);
  const activeP1Score = officialMatch?.score1 || 0;
  const activeP2Score = officialMatch?.score2 || 0;
  const target = 4;
  const p1Winner = activeP1Score >= target;
  const p2Winner = activeP2Score >= target;

  // Battles and penalties for current match
  const matchBattles = officialMatch
    ? battles.filter((b) => b.matchId === officialMatch.id).sort((a, b) => b.battleNumber - a.battleNumber)
    : [];

  const matchPenalties = officialMatch
    ? penalties.filter((p) => p.matchId === officialMatch.id)
    : [];

  // Next match finder
  const nextMatch = tournamentMatches.find(
    (m) => m.id !== selectedOfficialMatchId && m.status !== 'completed'
  );

  const handleNextMatch = () => {
    if (nextMatch) {
      setSelectedOfficialMatchId(nextMatch.id);
      setSnackbarMessage(`Cargado siguiente combate: Mesa ${nextMatch.station || 'A'}`);
      setSnackbarOpen(true);
    }
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

  const handleRecordBattle = (scorer: 'p1' | 'p2', finish: FinishType, points: number) => {
    if (!officialMatch || !officialP1 || !officialP2) return;
    if (currentRole === 'public') {
      openAuthModal('login');
      return;
    }

    playSoundEffect(points);
    triggerVibration(points >= 3 ? 90 : 45);

    const winnerId = scorer === 'p1' ? officialP1.id : officialP2.id;
    const winnerName = scorer === 'p1' ? officialP1.displayName : officialP2.displayName;
    recordBattle(officialMatch.id, winnerId, finish, `Finish ${finish} (${points} pts)`);
    const finishName = finish === 'spin' ? 'Spin' : finish === 'burst' ? 'Burst' : finish === 'over' ? 'Over' : 'Xtreme';
    setSnackbarMessage(`¡${finishName} Finish (+${points}) para ${winnerName}!`);
    setLastAction(() => () => undoBattle(officialMatch.id));
    setSnackbarOpen(true);
  };

  const handleApplyPenalty = () => {
    if (!officialMatch || !officialP1 || !officialP2) return;
    const offender = foulTarget === 'p1' ? officialP1 : officialP2;
    const cardParam = foulCard === 'none' ? undefined : foulCard;
    recordPenalty(officialMatch.id, offender.id, cardParam, true, foulReason);
    setShowFoulModal(false);
    setSnackbarMessage(`Falta registrada a ${offender.displayName}: ${foulReason}`);
    setSnackbarOpen(true);
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
      onClick={() => handleRecordBattle(scorer, finish, points)}
      disabled={!officialMatch || officialMatch.status === 'completed'}
      className={`w-full min-h-[56px] py-3 px-4 rounded-2xl bg-[var(--chasis)] border-2 ${borderColor} hover:opacity-90 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-between shadow-md group`}
    >
      <div className="flex items-center gap-3 text-left">
        <div className={`p-2 rounded-xl bg-[var(--grafito)] ${textColor} shrink-0`}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-black text-[var(--hueso)]">{title}</div>
          <div className="text-[10px] text-[var(--acero)]">{detail}</div>
        </div>
      </div>
      <span className={`text-lg font-black font-mono ${textColor}`}>+{points}</span>
    </button>
  );

  return (
    <div className="min-w-0 max-w-4xl mx-auto px-0 sm:px-4 py-4 w-full flex flex-col gap-5">
      {/* View Header with Status */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-[var(--cobalto)] shrink-0" aria-hidden="true" />
            <span>Mesa de Arbitraje y Marcador</span>
          </h1>
          <p className="text-xs text-[var(--acero)] mt-0.5">
            Registro oficial de puntos WBO, faltas reglamentarias y control de combates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SyncBadge />
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
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--hueso)]">Combate en mesa:</span>
            {officialMatch && (
              <span className="text-xs font-mono font-bold text-[var(--cobalto)]">
                Mesa {officialMatch.station || 'A'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {nextMatch && (
              <button
                type="button"
                onClick={handleNextMatch}
                className="px-3 py-1.5 rounded-xl bg-[var(--grafito)] border border-[var(--costura)] hover:border-[var(--cobalto)] text-xs font-bold text-[var(--hueso)] flex items-center gap-1.5 transition-colors min-h-[36px]"
              >
                <span>Siguiente Combate</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--cobalto)]" />
              </button>
            )}

            {currentRole === 'public' && (
              <span className="text-[11px] text-amber-400 font-semibold">
                Modo visor. Inicia sesión para arbitrar.
              </span>
            )}
          </div>
        </div>

        {tournamentMatches.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--acero)]">
            No hay combates oficiales disponibles para el torneo activo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {tournamentMatches.map((match) => {
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
                  <div className="text-[11px] font-mono text-[var(--cobalto)] mt-1 font-bold">
                    {match.score1} - {match.score2}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!officialMatch || !officialP1 || !officialP2 ? (
        <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-8 text-center text-sm text-[var(--acero)]">
          Selecciona un combate oficial para habilitar el marcador.
        </div>
      ) : (
        <>
          {/* Main Scoreboard Digits Display */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-[var(--chasis)] border-2 border-[var(--costura)] rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
            {/* Blader 1 (Azul / Cobalto) */}
            <div
              className={`flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 transition-all ${
                p1Winner ? 'border-emerald-500 bg-emerald-950/30' : 'border-[var(--cobalto)]/40 bg-[var(--grafito)]'
              }`}
            >
              <div className="w-full text-center">
                <span className="font-bold text-sm sm:text-base block truncate text-[var(--cobalto)]">
                  {officialP1.displayName}
                </span>
                <span className="text-[10px] text-[var(--acero)] uppercase tracking-wider block font-semibold mt-0.5">
                  Lado Azul (P1)
                </span>
              </div>
              <div className="my-3 font-mono font-black text-6xl sm:text-8xl tracking-tighter text-[var(--hueso)] select-none drop-shadow-md">
                {activeP1Score}
              </div>
              {p1Winner && (
                <div className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-wider animate-bounce">
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
                  Lado Naranja (P2)
                </span>
              </div>
              <div className="my-3 font-mono font-black text-6xl sm:text-8xl tracking-tighter text-[var(--hueso)] select-none drop-shadow-md">
                {activeP2Score}
              </div>
              {p2Winner && (
                <div className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-wider animate-bounce">
                  ¡Ganador!
                </div>
              )}
            </div>
          </div>

          {/* Quick Foul / Penalty Button Bar */}
          <div className="flex items-center justify-between bg-[var(--chasis)] p-3 rounded-2xl border border-[var(--costura)] flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-[var(--hueso)]">Reglamento & Faltas:</span>
              <span className="text-[11px] text-[var(--acero)]">
                {matchPenalties.length > 0 ? `${matchPenalties.length} sanción(es) aplicada(s)` : 'Sin faltas en el combate'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowFoulModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-800 text-xs font-bold text-amber-300 hover:bg-amber-950 flex items-center gap-1.5 transition-colors min-h-[36px]"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Registrar Falta / Tarjeta</span>
            </button>
          </div>

          {/* Points Punchpad with Icons (HCI touch targets >= 56px) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* P1 Controls */}
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs font-bold text-[var(--cobalto)] pb-1 border-b border-[var(--cobalto)]/30 truncate">
                Anotar a {officialP1.displayName}
              </div>
              {renderFinishButton(
                'p1',
                'spin',
                1,
                'Spin Finish',
                'Detención por giro',
                'border-[var(--costura)] hover:border-[var(--cobalto)]',
                'text-[var(--cobalto)]',
                <RotateCcw className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p1',
                'over',
                2,
                'Over Finish',
                'Salida de arena / bolsillo',
                'border-emerald-900/60 hover:border-emerald-500',
                'text-emerald-400',
                <Shield className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p1',
                'burst',
                2,
                'Burst Finish',
                'Desarme de piezas',
                'border-pink-900/60 hover:border-pink-500',
                'text-pink-400',
                <Flame className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p1',
                'xtreme',
                3,
                'Xtreme Finish',
                'Xtreme Dash Pocket',
                'border-purple-900/60 hover:border-purple-400',
                'text-purple-300',
                <Zap className="w-4 h-4" />
              )}
            </div>

            {/* P2 Controls */}
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs font-bold text-[var(--cobre)] pb-1 border-b border-[var(--cobre)]/30 truncate">
                Anotar a {officialP2.displayName}
              </div>
              {renderFinishButton(
                'p2',
                'spin',
                1,
                'Spin Finish',
                'Detención por giro',
                'border-[var(--costura)] hover:border-[var(--cobre)]',
                'text-[var(--cobre)]',
                <RotateCcw className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p2',
                'over',
                2,
                'Over Finish',
                'Salida de arena / bolsillo',
                'border-emerald-900/60 hover:border-emerald-500',
                'text-emerald-400',
                <Shield className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p2',
                'burst',
                2,
                'Burst Finish',
                'Desarme de piezas',
                'border-pink-900/60 hover:border-pink-500',
                'text-pink-400',
                <Flame className="w-4 h-4" />
              )}
              {renderFinishButton(
                'p2',
                'xtreme',
                3,
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
                    ¡Meta alcanzada! Gana {p1Winner ? officialP1.displayName : officialP2.displayName}
                  </div>
                  <div className="text-xs text-emerald-300/80">
                    Marcador final: {activeP1Score} a {activeP2Score}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCloseSummary(
                      `Resultado final: Gana ${p1Winner ? officialP1.displayName : officialP2.displayName} con marcador de ${activeP1Score} a ${activeP2Score}.\n¿Confirmas cerrar el combate y sellar el acta?`
                    );
                    setShowConfirmClose(true);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl min-h-[44px] transition-all"
                >
                  Cerrar Partido
                </button>

                {nextMatch && (
                  <button
                    type="button"
                    onClick={handleNextMatch}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-[var(--cobalto)] text-[var(--tinta)] font-black text-xs rounded-xl min-h-[44px] flex items-center justify-center gap-1.5 transition-all"
                  >
                    <span>Siguiente Combate</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Points & Battle Records Log (Registro de Puntos) */}
          <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-3xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[var(--cobalto)]" />
                <h2 className="text-sm font-black text-[var(--hueso)]">
                  Registro de Puntos & Historial del Combate ({matchBattles.length})
                </h2>
              </div>
              {matchBattles.length > 0 && (
                <button
                  type="button"
                  onClick={() => undoBattle(officialMatch.id)}
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
                  const finishLabel =
                    b.finish === 'spin'
                      ? 'Spin Finish (+1)'
                      : b.finish === 'over'
                      ? 'Over Finish (+2)'
                      : b.finish === 'burst'
                      ? 'Burst Finish (+2)'
                      : 'Xtreme Finish (+3)';

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
                            <span className={isP1 ? 'text-[var(--cobalto)]' : 'text-[var(--cobre)]'}>
                              {winner?.displayName || 'Empate'}
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

                      <button
                        type="button"
                        onClick={() => undoBattle(officialMatch.id)}
                        title="Anular esta batalla"
                        className="p-1.5 text-[var(--acero)] hover:text-rose-400 rounded-lg min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
                      >
                        <MinusCircle className="w-4 h-4" />
                      </button>
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
                  {officialP1.displayName} (P1)
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
                  {officialP2.displayName} (P2)
                </button>
              </div>
            </div>

            {/* Card Selection */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[var(--acero)]">Tipo de Tarjeta:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFoulCard('none')}
                  className={`p-2 rounded-xl border text-xs font-bold min-h-[40px] ${
                    foulCard === 'none' ? 'border-[var(--hueso)] bg-[var(--grafito)]' : 'border-[var(--costura)] text-[var(--acero)]'
                  }`}
                >
                  Falta Leve
                </button>
                <button
                  type="button"
                  onClick={() => setFoulCard('yellow')}
                  className={`p-2 rounded-xl border text-xs font-bold min-h-[40px] flex items-center justify-center gap-1 ${
                    foulCard === 'yellow' ? 'border-amber-400 bg-amber-950/60 text-amber-300' : 'border-[var(--costura)] text-[var(--acero)]'
                  }`}
                >
                  <span>🟨 Amarilla</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFoulCard('red')}
                  className={`p-2 rounded-xl border text-xs font-bold min-h-[40px] flex items-center justify-center gap-1 ${
                    foulCard === 'red' ? 'border-rose-500 bg-rose-950/60 text-rose-300' : 'border-[var(--costura)] text-[var(--acero)]'
                  }`}
                >
                  <span>🟥 Roja</span>
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
                <option value="Lanzamiento anticipado (False Start)">Lanzamiento anticipado (False Start)</option>
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
      <Snackbar
        message={snackbarMessage}
        isOpen={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        onUndo={lastAction || undefined}
        undoLabel="Deshacer punto"
        duration={5000}
      />

      {/* Confirm Dialog for Closing Match */}
      <ConfirmDialog
        isOpen={showConfirmClose}
        title="¿Finalizar y cerrar combate?"
        description={closeSummary}
        confirmLabel="Cerrar partido"
        cancelLabel="Continuar anotando"
        variant="primary"
        onConfirm={() => {
          setShowConfirmClose(false);
          setSnackbarMessage('Combate registrado y cerrado con éxito.');
          setSnackbarOpen(true);
        }}
        onCancel={() => setShowConfirmClose(false)}
      />
    </div>
  );
};
