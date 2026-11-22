import { useMemo, useState } from 'react';
import { generateDoubleElimination } from '../../lib/engine/formats/doubleElimination';
import type { Participant, SetScore, Stage } from '../../types/tournament';
import { SetTimeline } from '../scoreboard/SetTimeline';
import { BracketViewer } from './BracketViewer';

const stage: Stage = {
  id: 'demo-playoffs',
  tournamentId: 'demo',
  name: 'Eliminación doble',
  position: 1,
  type: 'double_elimination',
  status: 'in_progress',
  bestOf: 3,
  pointsToWin: 4,
  matchType: '1on1',
  config: { tiebreakers: ['points', 'seed'] },
};

const participants: Participant[] = ['Astra', 'Boreal', 'Cometa', 'Delta', 'Eco', 'Fénix', 'Giro', 'Helio']
  .map((displayName, index) => ({
    id: `demo-player-${index}`,
    tournamentId: stage.tournamentId,
    displayName,
    seed: index + 1,
    status: 'active',
    checkedIn: true,
    inspected: true,
  }));

export function BracketDemo() {
  const [scores, setScores] = useState<SetScore[]>([[2, 2]]);
  const demo = useMemo(() => {
    const bracket = generateDoubleElimination(stage.tournamentId, stage.id, participants);
    const firstRound = bracket.rounds.find(round => round.bracket === 'winners')?.id;
    return {
      ...bracket,
      participants,
      matches: bracket.matches.map(match => {
        if (match.roundId !== firstRound) return match;
        if (match.position === 1) return { ...match, station: 'Mesa A', status: 'in_progress' as const, score1: 2, score2: 1 };
        if (match.position === 2) return { ...match, station: 'Mesa A', status: 'completed' as const,
          score1: 4, score2: 2, sets1: 2, winnerId: match.participant1Id };
        return { ...match, station: match.position === 3 ? 'Mesa B' : undefined };
      }),
    };
  }, []);

  return (
    <section aria-label="Demostración del cuadro">
      <div className="mx-auto max-w-screen-2xl space-y-5">
        <a href="/?view=torneos" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--cobalto-texto)]">
          Volver a torneos
        </a>
        <header className="rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-5">
          <p className="text-xs font-semibold text-[var(--cobalto-texto)]">Demostración de staging</p>
          <h1 className="mt-2 text-2xl font-black">Copa APbey · Eliminación doble</h1>
          <p className="mt-2 text-sm text-[var(--acero)]">Selecciona el destino de un ganador o perdedor para saltar a su siguiente combate.</p>
        </header>
        <BracketViewer stage={stage} demo={demo} />
        <details className="rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-4">
          <summary className="cursor-pointer text-sm font-semibold">Probar un desempate por sets</summary>
          <div className="mt-3">
            <SetTimeline scores={scores} canCloseTie={scores.length === 1} onCloseTie={() => setScores([[2, 2], [0, 0]])} />
            {scores.length > 1 && <button type="button" className="mt-2 min-h-11 text-sm text-[var(--cobalto-texto)]"
              onClick={() => setScores([[2, 2]])}>Reiniciar demostración</button>}
          </div>
        </details>
      </div>
    </section>
  );
}
