import React, { useState } from 'react';
import { Match, Participant, Round, Stage } from '../../types/tournament';
import { useTournament } from '../../context/TournamentContext';
import {
  Trophy,
  ChevronRight,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Scale,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
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
    setZoomLevel((prev) => Math.min(1.5, Math.max(0.6, Number((prev + delta).toFixed(2)))));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full">
      {/* Stage Info Header & Challonge-Style Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              {stage.name}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-medium bg-neutral-100 text-neutral-700">
              {stage.status === 'in_progress' ? 'En Curso' : stage.status === 'completed' ? 'Finalizado' : 'Pendiente'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
            <span>Formato: {stage.type === 'single_elimination' ? 'Eliminación Directa' : 'Doble Eliminación'}</span>
            <span>·</span>
            <span>Meta: {stage.pointsToWin} puntos</span>
            <span>·</span>
            <span>Best of: {stage.bestOf} set{stage.bestOf > 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Toolbar: Zoom, Print, and Double Elimination segments */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Double Elimination Segments */}
          {stage.type === 'double_elimination' && (
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-medium">
              <button
                onClick={() => setBracketFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  bracketFilter === 'all' ? 'bg-white font-bold text-neutral-900 shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setBracketFilter('winners')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  bracketFilter === 'winners' ? 'bg-white font-bold text-neutral-900 shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Winners
              </button>
              <button
                onClick={() => setBracketFilter('losers')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  bracketFilter === 'losers' ? 'bg-white font-bold text-neutral-900 shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Losers
              </button>
              <button
                onClick={() => setBracketFilter('finals')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  bracketFilter === 'finals' ? 'bg-white font-bold text-neutral-900 shadow-2xs' : 'text-neutral-600'
                }`}
              >
                Final
              </button>
            </div>
          )}

          {/* Zoom Controls (Challonge Canvas Standard) */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs text-neutral-700">
            <button
              onClick={() => handleZoom(-0.15)}
              title="Alejar (Zoom Out)"
              className="p-1.5 hover:bg-white rounded-md transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] font-semibold tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.15)}
              title="Acercar (Zoom In)"
              className="p-1.5 hover:bg-white rounded-md transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              title="Restablecer 100%"
              className="p-1.5 hover:bg-white rounded-md transition-colors border-l border-neutral-200 ml-0.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Print / Export button */}
          <button
            onClick={handlePrint}
            title="Imprimir / Exportar Cuadro"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Challonge-Style Scalable Canvas with Zoom Transform */}
      <div className="overflow-x-auto overflow-y-hidden pb-8 pt-2 rounded-xl bg-neutral-50/50 border border-neutral-200/80 p-4">
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
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-700 bg-white py-1.5 px-3 rounded-lg border border-neutral-200 shadow-2xs">
                    {round.name}
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
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
                        className={`group relative rounded-xl border bg-white p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer ${
                          isLive
                            ? 'border-amber-400 ring-2 ring-amber-300/60'
                            : isCompleted
                            ? 'border-neutral-200 hover:border-neutral-400'
                            : 'border-dashed border-neutral-300 hover:border-neutral-400'
                        }`}
                      >
                        {/* Match Status Bar */}
                        <div className="flex items-center justify-between text-[11px] mb-2 text-neutral-500">
                          <span className="font-mono font-medium">Match #{match.position}</span>
                          <div className="flex items-center gap-1.5">
                            {match.station && (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                {match.station}
                              </span>
                            )}
                            {isLive && (
                              <span className="font-semibold text-amber-600 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                EN VIVO
                              </span>
                            )}
                            {match.isBye && (
                              <span className="text-neutral-400 font-medium">BYE</span>
                            )}
                            {ref && (
                              <span className="text-[10px] text-neutral-600 bg-neutral-100 px-1.5 py-0.2 rounded" title={`Árbitro: ${ref.displayName}`}>
                                ⚖️ {ref.displayName.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Player 1 Row */}
                        <div
                          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                            p1IsWinner
                              ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                              : isCompleted && p1
                              ? 'text-neutral-400'
                              : 'text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {p1?.seed && (
                              <span className="text-[10px] font-mono text-neutral-500 w-4">
                                #{p1.seed}
                              </span>
                            )}
                            <span className="truncate text-xs font-semibold">
                              {p1 ? p1.displayName : match.isBye ? 'BYE' : 'Esperando rival...'}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                              p1IsWinner ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {match.score1}
                          </span>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-neutral-100 my-1" />

                        {/* Player 2 Row */}
                        <div
                          className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-colors ${
                            p2IsWinner
                              ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-200'
                              : isCompleted && p2
                              ? 'text-neutral-400'
                              : 'text-neutral-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {p2?.seed && (
                              <span className="text-[10px] font-mono text-neutral-500 w-4">
                                #{p2.seed}
                              </span>
                            )}
                            <span className="truncate text-xs font-semibold">
                              {p2 ? p2.displayName : match.isBye ? 'BYE' : 'Esperando rival...'}
                            </span>
                          </div>
                          <span
                            className={`font-mono text-xs font-bold tabular-nums px-2 py-0.5 rounded ${
                              p2IsWinner ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700'
                            }`}
                          >
                            {match.score2}
                          </span>
                        </div>

                        {/* Quick action button for referee or organizer */}
                        {(currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin') && !match.isBye && (
                          <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                            <span>Gestión & Arbitraje</span>
                            <span className="group-hover:text-neutral-900 flex items-center gap-0.5 font-medium">
                              Ver <ChevronRight className="w-3 h-3" />
                            </span>
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

      {/* Selected Match Modal / Detail Drawer */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">
                  Match #{selectedMatch.position} · {stage.name}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Meta oficial: {stage.pointsToWin} puntos · Best of {stage.bestOf}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="w-8 h-8 rounded-lg hover:bg-neutral-200 flex items-center justify-center text-neutral-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Scoreboard Preview */}
              <div className="grid grid-cols-2 gap-4 text-center p-4 bg-neutral-950 text-white rounded-xl">
                <div>
                  <div className="text-[10px] font-bold text-blue-400 tracking-wider">CORNER AZUL</div>
                  <div className="text-sm font-bold text-white mt-1 truncate">
                    {getParticipant(selectedMatch.participant1Id)?.displayName || 'TBD'}
                  </div>
                  <div className="text-4xl font-black font-mono text-blue-400 mt-2 tabular-nums">
                    {selectedMatch.score1}
                  </div>
                  {getParticipant(selectedMatch.participant1Id)?.deckCombos?.[0] && (
                    <div className="text-[11px] text-neutral-400 mt-1 font-mono truncate">
                      {getParticipant(selectedMatch.participant1Id)?.deckCombos?.[0]}
                    </div>
                  )}
                </div>

                <div className="border-l border-neutral-800 pl-4">
                  <div className="text-[10px] font-bold text-rose-400 tracking-wider">CORNER ROJO</div>
                  <div className="text-sm font-bold text-white mt-1 truncate">
                    {getParticipant(selectedMatch.participant2Id)?.displayName || 'TBD'}
                  </div>
                  <div className="text-4xl font-black font-mono text-rose-400 mt-2 tabular-nums">
                    {selectedMatch.score2}
                  </div>
                  {getParticipant(selectedMatch.participant2Id)?.deckCombos?.[0] && (
                    <div className="text-[11px] text-neutral-400 mt-1 font-mono truncate">
                      {getParticipant(selectedMatch.participant2Id)?.deckCombos?.[0]}
                    </div>
                  )}
                </div>
              </div>

              {/* Station Assignment & Convocatoria (Llamada a Mesa) */}
              {(currentRole === 'organizer' || currentRole === 'admin' || currentRole === 'referee') && (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-amber-600" />
                      Asignación de Estadio / Mesa:
                    </label>
                    {selectedMatch.calledToStation && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                        ¡Llamado Activo!
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMatch.station || stationInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStationInput(val);
                        assignStationToMatch(selectedMatch.id, val);
                        setSelectedMatch({ ...selectedMatch, station: val });
                      }}
                      className="grow border border-neutral-300 rounded-lg p-2 bg-white text-xs font-semibold text-neutral-800"
                    >
                      <option value="Estadio 1">Estadio 1 (Principal)</option>
                      <option value="Estadio 2">Estadio 2 (Secundario)</option>
                      <option value="Estadio 3">Estadio 3</option>
                      <option value="Mesa Xtreme A">Mesa Xtreme A</option>
                      <option value="Mesa Xtreme B">Mesa Xtreme B</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => callMatchToStation(selectedMatch.id)}
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-2xs transition-colors shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Llamar a Mesa
                    </button>
                  </div>
                </div>
              )}

              {/* Referee Assignment */}
              {(currentRole === 'organizer' || currentRole === 'admin' || currentRole === 'referee') && (
                <div className="text-xs space-y-1.5 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-neutral-700">Árbitro del match:</label>
                    {currentRole === 'referee' && selectedMatch.refereeId !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => {
                          assignReferee(selectedMatch.id, currentUser.id);
                          setSelectedMatch({ ...selectedMatch, refereeId: currentUser.id });
                        }}
                        className="text-[11px] font-bold text-neutral-900 bg-white border border-neutral-300 px-2 py-0.5 rounded hover:bg-neutral-100 flex items-center gap-1"
                      >
                        <UserCheck className="w-3 h-3" />
                        Asignarme a mí
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedMatch.refereeId || ''}
                    onChange={(e) => {
                      assignReferee(selectedMatch.id, e.target.value || null);
                      setSelectedMatch({ ...selectedMatch, refereeId: e.target.value || null });
                    }}
                    className="w-full border border-neutral-300 rounded-lg p-2 bg-white text-xs font-medium text-neutral-800"
                  >
                    <option value="">Sin árbitro específico (Cualquiera puede arbitrar)</option>
                    {users.filter(u => u.role === 'referee' || u.role === 'admin' || u.role === 'organizer').map(u => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cerrar
                </button>

                {onOpenMatchInReferee && (
                  <button
                    onClick={() => {
                      onOpenMatchInReferee(selectedMatch.id);
                      setSelectedMatch(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    Abrir en Consola de Árbitro
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
