import { useMemo } from 'react';
import { generateDoubleElimination } from '../../lib/engine/formats/doubleElimination';
import type { Participant, Stage } from '../../types/tournament';
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
  const demo = useMemo(() => ({
    ...generateDoubleElimination(stage.tournamentId, stage.id, participants),
    participants,
  }), []);

  return (
    <main className="min-h-screen bg-[var(--grafito)] p-4 text-[var(--hueso)] sm:p-8">
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
      </div>
    </main>
  );
}
