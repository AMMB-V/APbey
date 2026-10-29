import React, { useState } from 'react';
import {
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { SyncBadge } from '../common/SyncBadge';
import { Snackbar } from '../common/Snackbar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FinishType } from '../../types/tournament';

interface ScoreboardViewProps {
  initialMatchId?: string;
  onOpenMatchInReferee?: (matchId: string) => void;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({
  initialMatchId,
}) => {
  const {
    matches,
    activeTournament,
    participants,
    recordBattle,
    undoBattle,
    currentRole,
    currentUser,
    openAuthModal,
  } = useTournament();

  const [mode, setMode] = useState<'free' | 'official'>(() => (initialMatchId ? 'official' : 'free'));
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Free mode state
  const [freeP1Name, setFreeP1Name] = useState('Blader 1');
  const [freeP2Name, setFreeP2Name] = useState('Blader 2');
  const [freeP1Score, setFreeP1Score] = useState(0);
  const [freeP2Score, setFreeP2Score] = useState(0);
  const [freeTargetScore, setFreeTargetScore] = useState(4);
  const [freeHistory, setFreeHistory] = useState<Array<{ scorer: 'p1' | 'p2'; finish: FinishType; points: number }>>([]);

  // Official mode state
  const tournamentMatches = matches.filter(
    (m) => m.tournamentId === activeTournament?.id && m.participant1Id && m.participant2Id && !m.isBye
  );

  const [selectedOfficialMatchId, setSelectedOfficialMatchId] = useState<string>(
    initialMatchId || tournamentMatches.find((m) => m.status === 'in_progress')?.id || tournamentMatches[0]?.id || ''
  );

  const officialMatch = matches.find((m) => m.id === selectedOfficialMatchId);
  const officialP1 = officialMatch?.participant1Id
    ? participants.find((p) => p.id === officialMatch.participant1Id)
    : undefined;
  const officialP2 = officialMatch?.participant2Id
    ? participants.find((p) => p.id === officialMatch.participant2Id)
    : undefined;

  // Snackbar Undo state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);

  // Close match confirm dialog state
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [closeSummary, setCloseSummary] = useState('');

  // Audio effect synthesizer using Web Audio API
  const playSoundEffect = (points: number) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const freq = points === 1 ? 520 : points === 2 ? 660 : 880;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // AudioContext unavailable
    }
  };

  const triggerVibration = (ms = 45) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  };

  // Add points in Free Mode
  const addFreePoint = (scorer: 'p1' | 'p2', finish: FinishType, points: number) => {
    playSoundEffect(points);
    triggerVibration(points >= 3 ? 90 : 45);

    const prevP1 = freeP1Score;
    const prevP2 = freeP2Score;
    const prevHist = [...freeHistory];

    if (scorer === 'p1') {
      setFreeP1Score((s) => s + points);
    } else {
      setFreeP2Score((s) => s + points);
    }

    setFreeHistory((h) => [...h, { scorer, finish, points }]);

    const finishName = finish === 'spin' ? 'Spin' : finish === 'burst' ? 'Burst' : finish === 'over' ? 'Over' : 'Xtreme';
    const scorerName = scorer === 'p1' ? freeP1Name : freeP2Name;
    setSnackbarMessage(`¡${finishName} Finish (+${points}) para ${scorerName}!`);
    setLastAction(() => () => {
      setFreeP1Score(prevP1);
      setFreeP2Score(prevP2);
      setFreeHistory(prevHist);
    });
    setSnackbarOpen(true);
  };

  // Official battle recording
  const handleRecordOfficialBattle = async (scorer: 'p1' | 'p2', finish: FinishType, points: number) => {
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
    setLastAction(() => () => {
      undoBattle(officialMatch.id);
    });
    setSnackbarOpen(true);
  };

  const handlePromptCloseMatch = (winnerName: string, p1Score: number, p2Score: number) => {
    setCloseSummary(
      `Resultado final: Gana ${winnerName} con marcador de ${p1Score} a ${p2Score}.\n¿Confirmas cerrar y sellar el combate?`
    );
    setShowConfirmClose(true);
  };

  const activeP1Score = mode === 'free' ? freeP1Score : (officialMatch?.score1 || 0);
  const activeP2Score = mode === 'free' ? freeP2Score : (officialMatch?.score2 || 0);
  const target = mode === 'free' ? freeTargetScore : 4;
  const p1Winner = activeP1Score >= target;
  const p2Winner = activeP2Score >= target;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 w-full flex flex-col gap-4">
      {/* Visual orientation header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--hueso)] font-display tracking-tight flex items-center gap-2">
            <Radio className="w-5 h-5 text-[var(--cobalto)] shrink-0" aria-hidden="true" />
            <span>Marcador de Combate</span>
          </h1>
          <p className="text-xs text-[var(--acero)] mt-0.5">
            Mesa táctil de puntuación oficial Beyblade X (reglamento WBO)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SyncBadge />
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            aria-label={soundEnabled ? 'Silenciar sonidos de puntos' : 'Activar sonidos de puntos'}
            className="p-2 rounded-xl bg-[var(--chasis)] border border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)] min-w-[40px] min-h-[40px] flex items-center justify-center transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tabs: Modo Libre (sin sesión) vs Modo Oficial (Torneo) */}
      <div
        role="tablist"
        aria-label="Tipo de marcador"
        className="grid grid-cols-2 p-1 bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl"
      >
        <button
          role="tab"
          type="button"
          aria-selected={mode === 'free'}
          onClick={() => setMode('free')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            mode === 'free'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-md font-black'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Modo Libre (Sin Sesión)</span>
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={mode === 'official'}
          onClick={() => setMode('official')}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 ${
            mode === 'official'
              ? 'bg-[var(--cobalto)] text-[var(--tinta)] shadow-md font-black'
              : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Modo Oficial (Torneo)</span>
        </button>
      </div>

      {/* Official Mode Match Selector */}
      {mode === 'official' && (
        <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--hueso)]">Seleccionar Combate Oficial:</span>
            {currentRole === 'public' && (
              <span className="text-[11px] text-amber-400 font-semibold">
                (Modo visor. Inicia sesión para arbitrar)
              </span>
            )}
          </div>

          {tournamentMatches.length === 0 ? (
            <div className="text-center py-6 text-xs text-[var(--acero)]">
              No hay combates programados en el torneo activo.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {tournamentMatches.map((m) => {
                const b1 = participants.find((p) => p.id === m.participant1Id)?.displayName || 'P1';
                const b2 = participants.find((p) => p.id === m.participant2Id)?.displayName || 'P2';
                const isSelected = m.id === selectedOfficialMatchId;
                const isMine = m.refereeId === currentUser?.id;

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedOfficialMatchId(m.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all min-h-[50px] flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--cobalto)] bg-[var(--grafito)] shadow-xs'
                        : 'border-[var(--costura)] bg-[var(--grafito)]/60 hover:border-[var(--acero)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-[var(--acero)] mb-1">
                      <span>Mesa {m.station || 'A'}</span>
                      {isMine && <span className="text-emerald-400 font-bold">Mi partido</span>}
                      {m.status === 'in_progress' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 font-bold">En curso</span>
                      )}
                      {m.status === 'completed' && (
                        <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">Finalizado</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-[var(--hueso)] truncate">
                      {b1} <span className="text-[var(--acero)] font-normal">vs</span> {b2}
                    </div>
                    <div className="text-[11px] font-mono text-[var(--cobalto)] mt-1 font-bold">
                      {m.score1} - {m.score2}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Target Score Selector in Free Mode */}
      {mode === 'free' && (
        <div className="flex items-center justify-between bg-[var(--chasis)] p-3 rounded-2xl border border-[var(--costura)] flex-wrap gap-2">
          <span className="text-xs font-bold text-[var(--acero)]">Puntos para ganar:</span>
          <div className="flex items-center gap-1.5">
            {[4, 5, 7].map((pts) => (
              <button
                key={pts}
                type="button"
                onClick={() => setFreeTargetScore(pts)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold min-h-[36px] transition-colors ${
                  freeTargetScore === pts
                    ? 'bg-[var(--cobalto)] text-[var(--tinta)]'
                    : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-[var(--hueso)]'
                }`}
              >
                {pts} pts {pts === 4 ? '(WBO)' : pts === 7 ? '(Final)' : ''}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setFreeP1Score(0);
                setFreeP2Score(0);
                setFreeHistory([]);
              }}
              title="Reiniciar marcador libre"
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-800 text-neutral-300 hover:bg-neutral-700 min-h-[36px] ml-2 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}

      {/* SCOREBOARD DISPLAY */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-[var(--chasis)] border-2 border-[var(--costura)] rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Blader 1 (Cobalto) */}
        <div
          className={`flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 transition-all ${
            p1Winner
              ? 'border-emerald-500 bg-emerald-950/30'
              : 'border-[var(--cobalto)]/40 bg-[var(--grafito)]'
          }`}
        >
          <div className="w-full text-center">
            {mode === 'free' ? (
              <input
                type="text"
                value={freeP1Name}
                onChange={(e) => setFreeP1Name(e.target.value)}
                className="w-full text-center font-bold text-sm sm:text-base text-[var(--cobalto)] bg-transparent border-b border-transparent hover:border-[var(--cobalto)] focus:border-[var(--cobalto)] outline-hidden py-1"
                placeholder="Nombre Blader 1"
              />
            ) : (
              <span className="font-bold text-sm sm:text-base text-[var(--cobalto)] block truncate">
                {officialP1?.displayName || 'Blader 1'}
              </span>
            )}
            <span className="text-[10px] text-[var(--acero)] uppercase tracking-wider block font-semibold mt-0.5">
              Lado Azul (P1)
            </span>
          </div>

          <div
            className="my-3 font-mono font-black text-6xl sm:text-8xl tracking-tighter text-[var(--hueso)] drop-shadow-md select-none"
            style={{ minHeight: '1.2em' }}
          >
            {activeP1Score}
          </div>

          {p1Winner && (
            <div className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-wider animate-bounce">
              ¡Ganador!
            </div>
          )}
        </div>

        {/* Blader 2 (Cobre) */}
        <div
          className={`flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 transition-all ${
            p2Winner
              ? 'border-emerald-500 bg-emerald-950/30'
              : 'border-[var(--cobre)]/40 bg-[var(--grafito)]'
          }`}
        >
          <div className="w-full text-center">
            {mode === 'free' ? (
              <input
                type="text"
                value={freeP2Name}
                onChange={(e) => setFreeP2Name(e.target.value)}
                className="w-full text-center font-bold text-sm sm:text-base text-[var(--cobre)] bg-transparent border-b border-transparent hover:border-[var(--cobre)] focus:border-[var(--cobre)] outline-hidden py-1"
                placeholder="Nombre Blader 2"
              />
            ) : (
              <span className="font-bold text-sm sm:text-base text-[var(--cobre)] block truncate">
                {officialP2?.displayName || 'Blader 2'}
              </span>
            )}
            <span className="text-[10px] text-[var(--acero)] uppercase tracking-wider block font-semibold mt-0.5">
              Lado Naranja (P2)
            </span>
          </div>

          <div
            className="my-3 font-mono font-black text-6xl sm:text-8xl tracking-tighter text-[var(--hueso)] drop-shadow-md select-none"
            style={{ minHeight: '1.2em' }}
          >
            {activeP2Score}
          </div>

          {p2Winner && (
            <div className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-wider animate-bounce">
              ¡Ganador!
            </div>
          )}
        </div>
      </div>

      {/* ACTION PUNCHPAD: Points buttons >= 56px in bottom half for thumb reachability (Fitts's Law) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-1">
        {/* P1 Scoring Buttons */}
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs font-bold text-[var(--cobalto)] pb-1 border-b border-[var(--cobalto)]/30">
            Anotar a {mode === 'free' ? freeP1Name : (officialP1?.displayName || 'P1')}
          </div>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p1', 'spin', 1)
                : handleRecordOfficialBattle('p1', 'spin', 1)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-[var(--costura)] hover:border-[var(--cobalto)] active:scale-98 transition-all flex items-center justify-between px-4 text-[var(--hueso)] shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Spin Finish</div>
              <div className="text-[10px] text-[var(--acero)]">Detención por giro</div>
            </div>
            <span className="text-lg font-black font-mono text-[var(--cobalto)]">+1</span>
          </button>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p1', 'over', 2)
                : handleRecordOfficialBattle('p1', 'over', 2)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-emerald-900/60 hover:border-emerald-500 active:scale-98 transition-all flex items-center justify-between px-4 text-emerald-300 shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Over Finish</div>
              <div className="text-[10px] text-emerald-400/80">Salida de arena / bolsillo</div>
            </div>
            <span className="text-lg font-black font-mono text-emerald-400">+2</span>
          </button>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p1', 'burst', 2)
                : handleRecordOfficialBattle('p1', 'burst', 2)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-pink-900/60 hover:border-pink-500 active:scale-98 transition-all flex items-center justify-between px-4 text-pink-300 shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Burst Finish</div>
              <div className="text-[10px] text-pink-400/80">Desarme de piezas</div>
            </div>
            <span className="text-lg font-black font-mono text-pink-400">+2</span>
          </button>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p1', 'xtreme', 3)
                : handleRecordOfficialBattle('p1', 'xtreme', 3)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-purple-900/60 hover:border-purple-400 active:scale-98 transition-all flex items-center justify-between px-4 text-purple-200 shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Xtreme Finish</div>
              <div className="text-[10px] text-purple-300/80">Xtreme Dash Pocket</div>
            </div>
            <span className="text-lg font-black font-mono text-purple-300">+3</span>
          </button>
        </div>

        {/* P2 Scoring Buttons */}
        <div className="flex flex-col gap-2">
          <div className="text-center text-xs font-bold text-[var(--cobre)] pb-1 border-b border-[var(--cobre)]/30">
            Anotar a {mode === 'free' ? freeP2Name : (officialP2?.displayName || 'P2')}
          </div>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p2', 'spin', 1)
                : handleRecordOfficialBattle('p2', 'spin', 1)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-[var(--costura)] hover:border-[var(--cobre)] active:scale-98 transition-all flex items-center justify-between px-4 text-[var(--hueso)] shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Spin Finish</div>
              <div className="text-[10px] text-[var(--acero)]">Detención por giro</div>
            </div>
            <span className="text-lg font-black font-mono text-[var(--cobre)]">+1</span>
          </button>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p2', 'over', 2)
                : handleRecordOfficialBattle('p2', 'over', 2)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-emerald-900/60 hover:border-emerald-500 active:scale-98 transition-all flex items-center justify-between px-4 text-emerald-300 shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Over Finish</div>
              <div className="text-[10px] text-emerald-400/80">Salida de arena / bolsillo</div>
            </div>
            <span className="text-lg font-black font-mono text-emerald-400">+2</span>
          </button>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p2', 'burst', 2)
                : handleRecordOfficialBattle('p2', 'burst', 2)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-pink-900/60 hover:border-pink-500 active:scale-98 transition-all flex items-center justify-between px-4 text-pink-300 shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Burst Finish</div>
              <div className="text-[10px] text-pink-400/80">Desarme de piezas</div>
            </div>
            <span className="text-lg font-black font-mono text-pink-400">+2</span>
          </button>

          <button
            type="button"
            onClick={() =>
              mode === 'free'
                ? addFreePoint('p2', 'xtreme', 3)
                : handleRecordOfficialBattle('p2', 'xtreme', 3)
            }
            className="w-full min-h-[56px] py-3 px-2 rounded-2xl bg-[var(--chasis)] border-2 border-purple-900/60 hover:border-purple-400 active:scale-98 transition-all flex items-center justify-between px-4 text-purple-200 shadow-md"
          >
            <div className="text-left">
              <div className="text-sm font-black">Xtreme Finish</div>
              <div className="text-[10px] text-purple-300/80">Xtreme Dash Pocket</div>
            </div>
            <span className="text-lg font-black font-mono text-purple-300">+3</span>
          </button>
        </div>
      </div>

      {/* Close match action when target reached */}
      {(p1Winner || p2Winner) && (
        <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500/80 rounded-2xl flex items-center justify-between gap-3 mt-2">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="text-sm font-black text-emerald-200">
                ¡Combate alcanzado! Gana {p1Winner ? (mode === 'free' ? freeP1Name : officialP1?.displayName) : (mode === 'free' ? freeP2Name : officialP2?.displayName)}
              </div>
              <div className="text-xs text-emerald-300/80">
                Puntuación final: {activeP1Score} a {activeP2Score}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              handlePromptCloseMatch(
                p1Winner
                  ? (mode === 'free' ? freeP1Name : (officialP1?.displayName || 'P1'))
                  : (mode === 'free' ? freeP2Name : (officialP2?.displayName || 'P2')),
                activeP1Score,
                activeP2Score
              )
            }
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl transition-all shadow-md min-h-[44px]"
          >
            Cerrar Partido
          </button>
        </div>
      )}

      {/* Accessible Snackbar with Undo during 5 seconds */}
      <Snackbar
        message={snackbarMessage}
        isOpen={snackbarOpen}
        onClose={() => setSnackbarOpen(false)}
        onUndo={lastAction || undefined}
        undoLabel="Deshacer punto"
        duration={5000}
      />

      {/* Accessible Confirm Dialog for Closing Match */}
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
