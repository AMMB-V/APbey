import React, { useEffect, useState } from 'react';
import { CheckCircle, Radio, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';
import { SyncBadge } from '../common/SyncBadge';
import { Snackbar } from '../common/Snackbar';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FinishType } from '../../types/tournament';

interface ScoreboardViewProps {
  initialMatchId?: string;
}

export const ScoreboardView: React.FC<ScoreboardViewProps> = ({ initialMatchId }) => {
  const {
    matches,
    activeTournament,
    participants,
    recordBattle,
    undoBattle,
    currentRole,
    currentUser,
    openAuthModal,
    supabaseSyncInfo,
  } = useTournament();

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOfficialMatchId, setSelectedOfficialMatchId] = useState(initialMatchId || '');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [lastAction, setLastAction] = useState<(() => void) | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [closeSummary, setCloseSummary] = useState('');

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
      // AudioContext may be unavailable in the current browser.
    }
  };

  const handleRecordBattle = (scorer: 'p1' | 'p2', finish: FinishType, points: number) => {
    if (!officialMatch || !officialP1 || !officialP2) return;
    if (currentRole === 'public') {
      openAuthModal('login');
      return;
    }

    playSoundEffect(points);
    const winnerId = scorer === 'p1' ? officialP1.id : officialP2.id;
    const winnerName = scorer === 'p1' ? officialP1.displayName : officialP2.displayName;
    recordBattle(officialMatch.id, winnerId, finish, `Finish ${finish} (${points} pts)`);
    const finishName = finish === 'spin' ? 'Spin' : finish === 'burst' ? 'Burst' : finish === 'over' ? 'Over' : 'Xtreme';
    setSnackbarMessage(`¡${finishName} Finish (+${points}) para ${winnerName}!`);
    setLastAction(() => () => undoBattle(officialMatch.id));
    setSnackbarOpen(true);
  };

  const renderFinishButton = (
    scorer: 'p1' | 'p2',
    finish: FinishType,
    points: number,
    title: string,
    detail: string,
    color: string
  ) => (
    <button
      type="button"
      onClick={() => handleRecordBattle(scorer, finish, points)}
      disabled={!officialMatch || officialMatch.status === 'completed'}
      className={`w-full min-h-[56px] py-3 px-4 rounded-2xl bg-[var(--chasis)] border-2 border-[var(--costura)] hover:border-${color} disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-between text-[var(--hueso)] shadow-md`}
    >
      <div className="text-left">
        <div className="text-sm font-black">{title}</div>
        <div className="text-[10px] text-[var(--acero)]">{detail}</div>
      </div>
      <span className={`text-lg font-black font-mono text-${color}`}>+{points}</span>
    </button>
  );

  return (
    <div className="min-w-0 max-w-4xl mx-auto px-0 sm:px-4 py-4 w-full flex flex-col gap-4">
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
          <SyncBadge
            isConnected={supabaseSyncInfo.isConfigured ? supabaseSyncInfo.isConnected : undefined}
            message={supabaseSyncInfo.message}
          />
          <button
            type="button"
            onClick={() => setSoundEnabled((value) => !value)}
            aria-label={soundEnabled ? 'Silenciar sonidos de puntos' : 'Activar sonidos de puntos'}
            className="p-2 rounded-xl bg-[var(--chasis)] border border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)] min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs font-bold text-[var(--hueso)]">Seleccionar combate oficial</span>
          {currentRole === 'public' && (
            <span className="text-[11px] text-amber-400 font-semibold">Modo visor. Inicia sesión para arbitrar.</span>
          )}
        </div>
        {tournamentMatches.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--acero)]">
            No hay combates oficiales disponibles para el torneo activo.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {tournamentMatches.map((match) => {
              const blader1 = participants.find((participant) => participant.id === match.participant1Id)?.displayName || 'P1';
              const blader2 = participants.find((participant) => participant.id === match.participant2Id)?.displayName || 'P2';
              const selected = match.id === selectedOfficialMatchId;
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => setSelectedOfficialMatchId(match.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all min-h-[50px] ${
                    selected ? 'border-[var(--cobalto)] bg-[var(--grafito)]' : 'border-[var(--costura)] bg-[var(--grafito)]/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-[var(--acero)] mb-1">
                    <span>Mesa {match.station || 'A'}</span>
                    <span>{match.status === 'in_progress' ? 'En curso' : match.status === 'completed' ? 'Finalizado' : 'Pendiente'}</span>
                  </div>
                  <div className="text-xs font-bold text-[var(--hueso)] truncate">{blader1} <span className="font-normal">vs</span> {blader2}</div>
                  <div className="text-[11px] font-mono text-[var(--cobalto)] mt-1 font-bold">{match.score1} - {match.score2}</div>
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
          <div className="grid grid-cols-2 gap-3 sm:gap-6 bg-[var(--chasis)] border-2 border-[var(--costura)] rounded-3xl p-4 sm:p-6 shadow-2xl">
            {[{ participant: officialP1, score: activeP1Score, winner: p1Winner, color: 'var(--cobalto)', side: 'Azul (P1)' }, { participant: officialP2, score: activeP2Score, winner: p2Winner, color: 'var(--cobre)', side: 'Naranja (P2)' }].map((player) => (
              <div key={player.participant.id} className={`flex flex-col items-center justify-between p-3 sm:p-5 rounded-2xl border-2 ${player.winner ? 'border-emerald-500 bg-emerald-950/30' : 'border-[var(--costura)] bg-[var(--grafito)]'}`}>
                <div className="w-full text-center">
                  <span className="font-bold text-sm sm:text-base block truncate" style={{ color: player.color }}>{player.participant.displayName}</span>
                  <span className="text-[10px] text-[var(--acero)] uppercase tracking-wider block font-semibold mt-0.5">Lado {player.side}</span>
                </div>
                <div className="my-3 font-mono font-black text-6xl sm:text-8xl tracking-tighter text-[var(--hueso)] select-none">{player.score}</div>
                {player.winner && <div className="px-3 py-1 rounded-full bg-emerald-500 text-black text-xs font-black uppercase">¡Ganador!</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs font-bold text-[var(--cobalto)] pb-1 border-b border-[var(--cobalto)]/30">Anotar a {officialP1.displayName}</div>
              {renderFinishButton('p1', 'spin', 1, 'Spin Finish', 'Detención por giro', '[var(--cobalto)]')}
              {renderFinishButton('p1', 'over', 2, 'Over Finish', 'Salida de arena / bolsillo', 'emerald-400')}
              {renderFinishButton('p1', 'burst', 2, 'Burst Finish', 'Desarme de piezas', 'pink-400')}
              {renderFinishButton('p1', 'xtreme', 3, 'Xtreme Finish', 'Xtreme Dash Pocket', 'purple-300')}
            </div>
            <div className="flex flex-col gap-2">
              <div className="text-center text-xs font-bold text-[var(--cobre)] pb-1 border-b border-[var(--cobre)]/30">Anotar a {officialP2.displayName}</div>
              {renderFinishButton('p2', 'spin', 1, 'Spin Finish', 'Detención por giro', '[var(--cobre)]')}
              {renderFinishButton('p2', 'over', 2, 'Over Finish', 'Salida de arena / bolsillo', 'emerald-400')}
              {renderFinishButton('p2', 'burst', 2, 'Burst Finish', 'Desarme de piezas', 'pink-400')}
              {renderFinishButton('p2', 'xtreme', 3, 'Xtreme Finish', 'Xtreme Dash Pocket', 'purple-300')}
            </div>
          </div>

          {(p1Winner || p2Winner) && (
            <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-sm font-black text-emerald-200">¡Combate alcanzado! Gana {p1Winner ? officialP1.displayName : officialP2.displayName}</div>
                  <div className="text-xs text-emerald-300/80">Puntuación final: {activeP1Score} a {activeP2Score}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCloseSummary(`Resultado final: Gana ${p1Winner ? officialP1.displayName : officialP2.displayName} con marcador de ${activeP1Score} a ${activeP2Score}.`);
                  setShowConfirmClose(true);
                }}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl min-h-[44px]"
              >
                Cerrar partido
              </button>
            </div>
          )}
        </>
      )}

      <Snackbar message={snackbarMessage} isOpen={snackbarOpen} onClose={() => setSnackbarOpen(false)} onUndo={lastAction || undefined} undoLabel="Deshacer punto" duration={5000} />
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
