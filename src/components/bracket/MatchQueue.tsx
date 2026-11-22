import { useState } from 'react';
import type { Match } from '../../types/tournament';

const filters = [
  ['ready', 'Listos'],
  ['live', 'En vivo'],
  ['completed', 'Finalizados'],
  ['unassigned', 'Sin asignar'],
] as const;

export function MatchQueue({ matches, canManage, label, playerName, onLocate, onManage, onOpen, canScore }: {
  matches: Match[];
  canManage: boolean;
  label: (match: Match) => string | undefined;
  playerName: (id?: string | null) => string | undefined;
  onLocate: (id: string) => void;
  onManage: (match: Match) => void;
  onOpen?: (id: string) => void;
  canScore: (match: Match) => boolean;
}) {
  const [selection, setSelection] = useState<typeof filters[number][0]>('ready');
  const playable = matches.filter(match => match.participant1Id && match.participant2Id && !match.isBye);
  const byStatus = {
    ready: playable.filter(match => match.status === 'pending'),
    live: playable.filter(match => match.status === 'in_progress'),
    completed: playable.filter(match => match.status === 'completed'),
    unassigned: playable.filter(match => match.status !== 'completed' && (!match.station || !match.refereeId)),
  };
  const activeFilter = selection === 'unassigned' && !canManage ? 'ready' : selection;
  const byStation = new Map<string, Match[]>();
  for (const match of byStatus[activeFilter]) {
    const station = match.station || 'Sin mesa';
    const entries = byStation.get(station) ?? [];
    entries.push(match);
    byStation.set(station, entries);
  }

  return (
    <section aria-label="Cola de combates" className="space-y-3 rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-4">
      <h3 className="font-bold">Cola de combates</h3>
      <div aria-label="Estado de los combates" className="flex flex-wrap gap-2">
        {filters.filter(([key]) => key !== 'unassigned' || canManage).map(([key, title]) => (
          <button key={key} type="button" aria-pressed={activeFilter === key} onClick={() => setSelection(key)}
            className="min-h-11 rounded-lg border border-[var(--costura)] px-3 text-sm aria-pressed:bg-[var(--hueso)] aria-pressed:text-[var(--tinta)]">
            {title} ({byStatus[key].length})
          </button>
        ))}
      </div>
      {byStation.size === 0 && <p className="text-sm text-[var(--acero)]">No hay combates en este estado.</p>}
      <div className="grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
        {Array.from(byStation, ([station, entries]) => (
          <section key={station} className="rounded-lg bg-[var(--grafito)] p-3">
            <h4 className="text-sm font-bold">{station}</h4>
            <ul className="divide-y divide-[var(--costura)]">
              {entries.map(match => (
                <li key={match.id} className="py-2 text-sm">
                  <p><span className="text-[var(--acero)]">{label(match)} · </span>{playerName(match.participant1Id)} vs. {playerName(match.participant2Id)}</p>
                  {canManage && match.status !== 'completed' && !match.refereeId &&
                    <p className="text-xs text-[var(--acero)]">Sin árbitro</p>}
                  <div className="flex flex-wrap gap-x-4 text-xs font-semibold text-[var(--cobalto-texto)]">
                    <button type="button" className="min-h-11" onClick={() => onLocate(match.id)}>Ubicar en cuadro</button>
                    {canManage && match.status !== 'completed' &&
                      <button type="button" className="min-h-11" onClick={() => onManage(match)}>Asignar mesa o árbitro</button>}
                    {onOpen && <button type="button" className="min-h-11" onClick={() => onOpen(match.id)}>
                      {canScore(match) ? 'Arbitrar' : match.status === 'completed' ? 'Ver resultado' : 'Ver combate'}
                    </button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
