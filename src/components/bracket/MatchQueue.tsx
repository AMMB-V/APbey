import { useState } from 'react';
import type { Match } from '../../types/tournament';

export type QueueFilter = 'ready' | 'live' | 'completed' | 'unassigned' | 'no-station' | 'no-referee' | 'all';

const filters = [
  ['ready', 'Listos'],
  ['live', 'En vivo'],
  ['completed', 'Finalizados'],
  ['unassigned', 'Sin asignar'],
  ['no-station', 'Sin mesa'],
  ['no-referee', 'Sin árbitro'],
  ['all', 'Todos'],
] as const;

export function MatchQueue({ matches, canManage, label, playerName, onLocate, onManage, onOpen, canScore, initialFilter = 'ready', listView = false }: {
  matches: Match[];
  initialFilter?: QueueFilter;
  listView?: boolean;
  canManage: boolean;
  label: (match: Match) => string | undefined;
  playerName: (id?: string | null) => string | undefined;
  onLocate: (id: string) => void;
  onManage: (match: Match) => void;
  onOpen?: (id: string) => void;
  canScore: (match: Match) => boolean;
}) {
  const [selection, setSelection] = useState<QueueFilter>(initialFilter);
  const [query, setQuery] = useState('');
  const matching = matches.filter(match => [label(match), playerName(match.participant1Id), playerName(match.participant2Id), match.station]
    .some(value => value?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) || !query.trim());
  const playable = matching.filter(match => match.participant1Id && match.participant2Id && !match.isBye);
  const byStatus = {
    ready: playable.filter(match => match.status === 'pending'),
    live: playable.filter(match => match.status === 'in_progress'),
    completed: playable.filter(match => match.status === 'completed'),
    all: matching,
    'no-station': playable.filter(match => match.status !== 'completed' && !match.station),
    'no-referee': playable.filter(match => match.status !== 'completed' && !match.refereeId),
    unassigned: playable.filter(match => match.status !== 'completed' && (!match.station || !match.refereeId)),
  };
  const needsManagement = (key: QueueFilter) => key === 'unassigned' || key === 'no-station' || key === 'no-referee';
  const activeFilter = !canManage && needsManagement(selection) ? 'ready' : selection;
  const matchesById = new Map(matches.map(match => [match.id, match]));
  const byStation = new Map<string, Match[]>();
  for (const match of byStatus[activeFilter]) {
    const station = match.station || 'Sin mesa';
    const entries = byStation.get(station) ?? [];
    entries.push(match);
    byStation.set(station, entries);
  }

  return (
    <section aria-label={listView ? "Lista de combates" : "Cola de combates"} className="space-y-3 rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-4">
      <h3 className="font-bold">{listView ? 'Lista de combates' : 'Cola de combates'}</h3>
      {listView && <label className="block text-sm">
        Buscar jugador, mesa o combate
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          className="mt-1 block min-h-11 w-full rounded-xl border border-[var(--costura)] bg-[var(--grafito)] px-3" />
      </label>}
      <div aria-label="Estado de los combates" className="flex flex-wrap gap-2">
        {filters.filter(([key]) => (canManage || !needsManagement(key)) && (listView || key !== 'all')).map(([key, title]) => (
          <button key={key} type="button" aria-pressed={activeFilter === key} onClick={() => setSelection(key)}
            className="min-h-11 rounded-lg border border-[var(--costura)] px-3 text-sm aria-pressed:bg-[var(--hueso)] aria-pressed:text-[var(--tinta)]">
            {title} ({byStatus[key].length})
          </button>
        ))}
      </div>
      {byStation.size === 0 && <p className="text-sm text-[var(--acero)]">No hay combates en este estado.</p>}
      <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${listView ? "" : "max-h-72 overflow-y-auto"}`}>
        {Array.from(byStation, ([station, entries]) => (
          <section key={station} className="rounded-lg bg-[var(--grafito)] p-3">
            <h4 className="text-sm font-bold">{station}</h4>
            <ul className="divide-y divide-[var(--costura)]">
              {entries.map(match => (
                <li key={match.id} className="py-2 text-sm">
                  <p><span className="text-[var(--acero)]">{label(match)} · </span>{playerName(match.participant1Id) ?? "Por definir"} vs. {playerName(match.participant2Id) ?? "Por definir"}</p>
                  {canManage && match.status !== 'completed' && !match.refereeId &&
                    <p className="text-xs text-[var(--acero)]">Sin árbitro</p>}
                  <div className="flex flex-wrap gap-x-4 text-xs font-semibold text-[var(--cobalto-texto)]">
                    <button type="button" className="min-h-11" onClick={() => onLocate(match.id)}>Ubicar en cuadro</button>
                    {listView && ([[match.nextMatchWinnerId, 'Ganador'], [match.nextMatchLoserId, 'Perdedor']] as const).map(([id, route]) => {
                      const destination = id ? matchesById.get(id) : undefined;
                      return destination && <button key={route} type="button" className="min-h-11" onClick={() => onLocate(destination.id)}>
                        {route} → {label(destination)}
                      </button>;
                    })}
                    {canManage && match.status !== 'completed' &&
                      <button type="button" className="min-h-11" onClick={() => onManage(match)}>Asignar mesa o árbitro</button>}
                    {onOpen && !match.isBye && match.participant1Id && match.participant2Id && <button type="button" className="min-h-11" onClick={() => onOpen(match.id)}>
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
