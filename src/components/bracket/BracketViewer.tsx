import React, { useState } from 'react';
import { Match, Participant, Round, Stage } from '../../types/tournament';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import {
  Trophy,
  ChevronRight,
  UserCheck,
  Scale,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Printer,
  Volume2,
  Radio,
  Layers,
} from 'lucide-react';

interface BracketViewerProps {
  stage: Stage;
  onOpenMatchInReferee?: (matchId: string) => void;
}

export const BracketViewer: React.FC<BracketViewerProps> = ({
  stage,
  onOpenMatchInReferee,
}) => {
  const {
    matches,
    rounds,
    participants,
    currentRole,
    currentUser,
    users,
    assignReferee,
    assignStationToMatch,
    callMatchToStation,
  } = useTournament();

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [bracketFilter, setBracketFilter] = useState<'all' | 'winners' | 'losers' | 'finals'>('all');
  const [stationInput, setStationInput] = useState<string>('Estadio 1');

  // Filter rounds for this stage
  const allStageRounds = rounds
    .filter((r) => r.stageId === stage.id && r.bracket !== 'group')
    .sort((a, b) => a.number - b.number);

  // Apply bracket filter (Winners / Losers / Finals) if double elimination
  const stageRounds = allStageRounds.filter((r) => {
    if (stage.type !== 'double_elimination' || bracketFilter === 'all') return true;
    return r.bracket === bracketFilter;
  });

  const stageMatches = matches.filter((m) => m.stageId === stage.id);

  const getParticipant = (id?: string | null): Participant | undefined => {
    if (!id) return undefined;
    return participants.find((p) => p.id === id);
  };

  const getReferee = (id?: string | null) => {
    if (!id) return null;
    return users.find((u) => u.id === id);
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(1.6, Math.max(0.65, Number((prev + delta).toFixed(2)))));
  };

  const resetZoom = () => setZoomLevel(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full space-y-5 text-[var(--hueso)]">
      {/* Top Controls Toolbar: Zoom, Double Elimination Tabs & Export */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--costura)]">
        {/* Left: Double Elimination Navigation Tabs */}
        {stage.type === 'double_elimination' ? (
          <div className="flex items-center gap-1 bg-[var(--grafito)] p-1 rounded-[var(--r-control)] border border-[var(--costura)]">
            <span className="text-[10px] font-bold text-[var(--acero)] uppercase px-1.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[var(--cobalto)]" />
              Cuadro:
            </span>
            {(['all', 'winners', 'losers', 'finals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setBracketFilter(tab)}
                className={`px-2.5 py-1 text-xs rounded-[var(--r-chip)] font-semibold transition-colors ${
                  bracketFilter === tab
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                    : 'text-[var(--acero)] hover:text-white'
                }`}
              >
                {tab === 'all'
                  ? 'Todos'
                  : tab === 'winners'
                  ? 'Winners Bracket'
                  : tab === 'losers'
                  ? 'Losers Bracket'
                  : 'Gran Final'}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AceroIcon id="i-trofeo" size="md" className="text-[var(--cobalto)]" />
            <h3 className="font-bold text-sm tracking-tight font-display">
              Cuadro Eliminatorio Oficial (Best of {stage.bestOf || 1})
            </h3>
          </div>
        )}

        {/* Right: Ergonomic Zoom Controls & Print Button */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] p-1 text-xs text-[var(--acero)]">
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1 hover:text-white hover:bg-[var(--chasis)] rounded"
              title="Reducir zoom (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1.5 min-w-[3.5rem] text-center font-bold text-[var(--hueso)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1 hover:text-white hover:bg-[var(--chasis)] rounded"
              title="Aumentar zoom (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetZoom}
              className="p-1 hover:text-white hover:bg-[var(--chasis)] rounded ml-0.5 border-l border-[var(--costura)] pl-1.5"
              title="Restablecer al 100%"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="btn btn--secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Imprimir cuadro de emparejamientos"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir Cuadro</span>
          </button>
        </div>
      </div>

      {/* Scalable Canvas with Zoom Transform */}
      <div className="overflow-x-auto overflow-y-hidden pb-8 pt-2 rounded-[var(--r-card)] bg-[var(--grafito)] border border-[var(--costura)] p-4">
        <div
          className="flex gap-8 min-w-max items-start transition-transform origin-top-left"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {stageRounds.map((round) => {
            const roundMatches = stageMatches
              .filter((m) => m.roundId === round.id)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={round.id} className="flex flex-col w-72 shrink-0">
                {/* Round Header */}
                <div className="mb-4 text-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--hueso)] bg-[var(--chasis)] py-1.5 px-3 rounded-[var(--r-control)] border border-[var(--costura)] shadow-xs">
                    {round.name}
                  </div>
                  <div className="text-[11px] text-[var(--acero)] mt-1 font-mono">
                    {roundMatches.length} enfrentamiento{roundMatches.length > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Match Cards Column */}
                <div className="flex flex-col justify-around gap-6 grow">
                  {roundMatches.map((match) => {
                    const p1 = getParticipant(match.participant1Id);
                    const p2 = getParticipant(match.participant2Id);
                    const isCompleted = match.status === 'completed';
                    const isLive = match.status === 'in_progress';
                    const p1IsWinner = match.winnerId === p1?.id;
                    const p2IsWinner = match.winnerId === p2?.id;
                    const ref = getReferee(match.refereeId);

                    return (
                      <div
                        key={match.id}
                        onClick={() => {
                          setSelectedMatch(match);
                          setStationInput(match.station || 'Estadio 1');
                        }}
                        className={`group relative rounded-[var(--r-control)] border bg-[var(--chasis)] p-3.5 shadow-xs transition-all cursor-pointer ${
                          isLive
                            ? 'border-[var(--tarjeta-amarilla)] ring-2 ring-[var(--tarjeta-amarilla)]/50'
                            : isCompleted
                            ? 'border-[var(--costura)] hover:border-[var(--acero)]'
                            : 'border-dashed border-[var(--costura)] hover:border-[var(--acero)]'
                        }`}
                      >
                        {/* Match Status Bar */}
                        <div className="flex items-center justify-between text-[11px] mb-2 text-[var(--acero)]">
                          <span className="font-mono font-medium">Match #{match.position}</span>
                          <div className="flex items-center gap-1.5">
                            {match.station && (
                              <span className="text-[10px] font-bold text-[var(--tinta)] bg-[var(--tarjeta-amarilla)] px-1.5 py-0.2 rounded font-mono">
                                {match.station}
                              </span>
                            )}
                            {isLive && (
                              <span className="font-bold text-[var(--en-vivo)] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--en-vivo)] animate-pulse" />
                                EN VIVO
                              </span>
                            )}
                            {match.isBye && (
                              <span className="text-[var(--acero)] font-medium">BYE</span>
                            )}
                            {ref && (
                              <span className="text-[10px] text-[var(--acero)] bg-[var(--grafito)] border border-[var(--costura)] px-1.5 py-0.2 rounded" title={`Árbitro: ${ref.displayName}`}>
                                ⚖️ {ref.displayName.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Player 1 Row */}
                        <div
                          className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors ${
                            p1IsWinner
                              ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-600/60'
                              : isCompleted && p1
                              ? 'text-[var(--acero)] opacity-70'
                              : 'text-[var(--hueso)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {p1?.seed && (
                              <span className="text-[10px] font-mono text-[var(--cobalto)] w-4 font-bold">
                                #{p1.seed}
                              </span>
                            )}
                            <span className="truncate font-medium">
                              {p1 ? p1.displayName : 'A determinar'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs ml-2 tabular-nums">
                            {match.score1}
                          </span>
                        </div>

                        {/* Player 2 Row */}
                        <div
                          className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors mt-1 ${
                            p2IsWinner
                              ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-600/60'
                              : isCompleted && p2
                              ? 'text-[var(--acero)] opacity-70'
                              : 'text-[var(--hueso)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {p2?.seed && (
                              <span className="text-[10px] font-mono text-[var(--cobre)] w-4 font-bold">
                                #{p2.seed}
                              </span>
                            )}
                            <span className="truncate font-medium">
                              {p2 ? p2.displayName : 'A determinar'}
                            </span>
                          </div>
                          <span className="font-mono font-bold text-xs ml-2 tabular-nums">
                            {match.score2}
                          </span>
                        </div>

                        {/* Action link to Referee */}
                        {onOpenMatchInReferee && !match.isBye && p1 && p2 && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--costura)] flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-[var(--acero)]">
                              {match.sets1 > 0 || match.sets2 > 0 ? `Sets: ${match.sets1}-${match.sets2}` : 'Best of 1'}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenMatchInReferee(match.id);
                              }}
                              className="text-[var(--cobalto)] hover:underline font-bold flex items-center gap-0.5"
                            >
                              Arbitrar <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match Details & Station Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] max-w-md w-full p-5 shadow-2xl text-[var(--hueso)] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
              <h3 className="font-bold text-sm flex items-center gap-2 font-display">
                <Scale className="w-4 h-4 text-[var(--cobalto)]" />
                Detalles del Match #{selectedMatch.position}
              </h3>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-[var(--acero)] hover:text-white font-bold text-xs"
              >
                ✕ Cerrar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-[var(--r-control)] bg-[var(--grafito)] border border-[var(--costura)]">
                <div>
                  <div className="font-bold text-[var(--cobalto)]">
                    {getParticipant(selectedMatch.participant1Id)?.displayName || 'TBD'}
                  </div>
                  <div className="text-[10px] text-[var(--acero)] font-mono">
                    {getParticipant(selectedMatch.participant1Id)?.deckCombos?.[0] || 'Combo 1'}
                  </div>
                </div>
                <div className="text-xl font-bold font-mono">
                  {selectedMatch.score1} - {selectedMatch.score2}
                </div>
                <div className="text-right">
                  <div className="font-bold text-[var(--cobre)]">
                    {getParticipant(selectedMatch.participant2Id)?.displayName || 'TBD'}
                  </div>
                  <div className="text-[10px] text-[var(--acero)] font-mono">
                    {getParticipant(selectedMatch.participant2Id)?.deckCombos?.[0] || 'Combo 2'}
                  </div>
                </div>
              </div>

              {/* Station assignment controls */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-[var(--acero)]">
                  Asignar Estadio / Mesa de Combate:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={stationInput}
                    onChange={(e) => setStationInput(e.target.value)}
                    placeholder="Estadio 1 / Mesa Xtreme"
                    className="grow bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-1.5 text-xs text-[var(--hueso)] focus:outline-hidden"
                  />
                  <button
                    onClick={() => assignStationToMatch(selectedMatch.id, stationInput)}
                    className="btn btn--secondary text-xs px-3 py-1.5"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      assignStationToMatch(selectedMatch.id, stationInput);
                      callMatchToStation(selectedMatch.id);
                      setSelectedMatch(null);
                    }}
                    className="btn btn--primary text-xs px-3 py-1.5 flex items-center gap-1"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Llamar
                  </button>
                </div>
              </div>

              {/* Referee assignment */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--acero)]">Árbitro Asignado:</label>
                <select
                  value={selectedMatch.refereeId || ''}
                  onChange={(e) => assignReferee(selectedMatch.id, e.target.value || null)}
                  className="w-full bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] p-2 text-xs text-[var(--hueso)] focus:outline-hidden"
                >
                  <option value="">Sin árbitro asignado</option>
                  {users.filter(u => u.role === 'referee' || u.role === 'organizer' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--costura)] flex items-center justify-end gap-2">
              {onOpenMatchInReferee && (
                <button
                  onClick={() => {
                    const mId = selectedMatch.id;
                    setSelectedMatch(null);
                    onOpenMatchInReferee(mId);
                  }}
                  className="btn btn--primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5" />
                  Abrir Consola de Árbitro
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
