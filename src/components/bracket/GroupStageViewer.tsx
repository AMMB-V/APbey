import React, { useState } from 'react';
import { Group, Match, Participant, Stage } from '../../types/tournament';
import { useTournament } from '../../context/TournamentContext';
import { computeStandings } from '../../lib/engine/tiebreakers';
import {
  Trophy,
  ArrowRight,
  Play,
  Scale,
  CheckCircle2,
  Shuffle,
  ArrowRightLeft,
  UserCheck,
} from 'lucide-react';

interface GroupStageViewerProps {
  stage: Stage;
  onOpenMatchInReferee?: (matchId: string) => void;
}

export const GroupStageViewer: React.FC<GroupStageViewerProps> = ({
  stage,
  onOpenMatchInReferee,
}) => {
  const {
    groups,
    matches,
    participants,
    currentRole,
    currentUser,
    users,
    advanceCurrentStage,
    startStage,
    moveParticipantToGroup,
    assignRefereeToGroup,
    rebalanceGroups,
    assignReferee,
  } = useTournament();

  const stageGroups = groups.filter((g) => g.stageId === stage.id);
  const stageMatches = matches.filter((m) => m.stageId === stage.id);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(stageGroups[0]?.id || '');

  const advanceCount = stage.config.advanceCount || 2;

  const activeGroup = stageGroups.find((g) => g.id === selectedGroupId) || stageGroups[0];

  const getParticipant = (id?: string | null): Participant | undefined => {
    if (!id) return undefined;
    return participants.find((p) => p.id === id);
  };

  // Compute standings for active group
  const groupParticipants = activeGroup
    ? participants.filter((p) => activeGroup.participantIds.includes(p.id))
    : [];

  const groupMatches = activeGroup
    ? stageMatches.filter((m) => m.groupId === activeGroup.id)
    : [];

  const standings = computeStandings(
    groupMatches,
    groupParticipants,
    stage.config.tiebreakers,
    advanceCount
  );

  const totalMatches = stageMatches.length;
  const completedMatches = stageMatches.filter((m) => m.status === 'completed').length;

  const groupReferee = users.find((u) => u.id === activeGroup?.refereeId);

  return (
    <div className="w-full space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              {stage.name}
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded font-medium ${
                stage.status === 'in_progress'
                  ? 'bg-amber-100 text-amber-800'
                  : stage.status === 'completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-neutral-100 text-neutral-700'
              }`}
            >
              {stage.status === 'in_progress' ? 'En Curso' : stage.status === 'completed' ? 'Completada' : 'Pendiente'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1">
            <span>{stageGroups.length} Grupos</span>
            <span>·</span>
            <span>Clasifican los primeros {advanceCount} de cada grupo</span>
            <span>·</span>
            <span>Meta: {stage.pointsToWin} puntos</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{completedMatches}/{totalMatches} matches jugados</span>
          </div>
        </div>

        {/* Global Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(currentRole === 'organizer' || currentRole === 'admin') && (
            <>
              <button
                onClick={() => rebalanceGroups(stage.id, stage.config.groupSize || 4)}
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-300 hover:bg-neutral-100 text-neutral-800 transition-colors flex items-center gap-1.5"
                title="Subdivide y equilibra automáticamente los grupos según el número de bladers totales"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Subdividir Grupos
              </button>

              {stage.status === 'pending' && (
                <button
                  onClick={() => startStage(stage.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-neutral-900 hover:bg-neutral-800 text-white transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Iniciar Fase de Grupos
                </button>
              )}

              {stage.status === 'in_progress' && (
                <button
                  onClick={() => advanceCurrentStage(stage.id)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 shadow-xs"
                  title="Calcula los clasificados y genera el cuadro de playoffs de eliminación directa"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  Avanzar a Playoffs (Top {advanceCount * stageGroups.length})
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Group Selector Tabs + Group Referee Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {stageGroups.map((g) => {
            const isSelected = (activeGroup?.id === g.id);
            const gMatches = stageMatches.filter((m) => m.groupId === g.id);
            const gCompleted = gMatches.filter((m) => m.status === 'completed').length;

            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                }`}
              >
                <span>{g.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono tabular-nums ${
                    isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-600'
                  }`}
                >
                  {gCompleted}/{gMatches.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Referee Assigned to this specific Group */}
        {activeGroup && (
          <div className="flex items-center gap-2 text-xs bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200">
            <Scale className="w-3.5 h-3.5 text-neutral-600" />
            <span className="font-semibold text-neutral-700">Árbitro del {activeGroup.name}:</span>
            
            {(currentRole === 'organizer' || currentRole === 'admin' || currentRole === 'referee') ? (
              <select
                value={activeGroup.refereeId || ''}
                onChange={(e) => assignRefereeToGroup(activeGroup.id, e.target.value || null)}
                className="border border-neutral-300 rounded px-2 py-0.5 text-xs font-medium bg-white"
              >
                <option value="">Sin árbitro asignado</option>
                {users.filter(u => u.role === 'referee' || u.role === 'organizer' || u.role === 'admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-neutral-900">
                {groupReferee ? groupReferee.displayName : 'Sin asignar'}
              </span>
            )}

            {currentRole === 'referee' && activeGroup.refereeId !== currentUser.id && (
              <button
                onClick={() => assignRefereeToGroup(activeGroup.id, currentUser.id)}
                className="px-2 py-0.5 text-[11px] font-bold rounded bg-neutral-900 text-white hover:bg-neutral-800 transition-colors flex items-center gap-1"
                title="Asignarme a mí mismo como árbitro de este grupo completo"
              >
                <UserCheck className="w-3 h-3" />
                Asignarme Grupo
              </button>
            )}
          </div>
        )}
      </div>

      {activeGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Standings Table with Manual Group Reassignment */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{activeGroup.name} — Tabla de Posiciones</h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Falta: Punto al rival tras 3 faltas acumuladas · Pasan primeros {advanceCount}
                </p>
                {stage.config.tiebreakers && (
                  <p className="text-[10px] text-neutral-600 font-mono mt-0.5 flex items-center gap-1">
                    <span className="font-semibold text-neutral-800">Reglas desempate:</span>
                    {stage.config.tiebreakers.map((t, idx) => {
                      const label =
                        t === 'head_to_head'
                          ? 'Duelo Directo'
                          : t === 'point_diff'
                          ? 'DIF'
                          : t === 'points_for'
                          ? 'PF Totales'
                          : t === 'points_average'
                          ? 'Promedio'
                          : t === 'points_ratio'
                          ? 'Ratio'
                          : t === 'points'
                          ? 'PTS'
                          : t === 'buchholz'
                          ? 'Buchholz'
                          : 'Siembra';
                      return (
                        <span key={t} className="inline-flex items-center">
                          {idx > 0 && <span className="text-neutral-400 mx-0.5">→</span>}
                          <span className="bg-neutral-200/70 text-neutral-800 px-1 rounded text-[9px] font-semibold">{label}</span>
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                Clasifican Top {advanceCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] uppercase font-bold text-neutral-500 bg-neutral-100/70 border-b border-neutral-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Blader</th>
                    <th className="py-2.5 px-2 text-center" title="Partidos Jugados">PJ</th>
                    <th className="py-2.5 px-2 text-center" title="Partidos Ganados">PG</th>
                    <th className="py-2.5 px-2 text-center" title="Partidos Empatados">PE</th>
                    <th className="py-2.5 px-2 text-center" title="Partidos Perdidos">PP</th>
                    <th className="py-2.5 px-2 text-center" title="Puntos a Favor">PF</th>
                    <th className="py-2.5 px-2 text-center" title="Puntos en Contra">PC</th>
                    <th className="py-2.5 px-2 text-center" title="Diferencia de Puntos (PF - PC)">DIF</th>
                    <th className="py-2.5 px-2 text-center" title="Puntos Promedio por Partido (PF / PJ)">PROM</th>
                    <th className="py-2.5 px-3 text-center font-bold text-neutral-900" title="Puntos en la tabla (3 por victoria, 1 por empate)">PTS</th>
                    {(currentRole === 'organizer' || currentRole === 'admin') && (
                      <th className="py-2.5 px-2 text-right">Mover Grupo</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {standings.map((row) => (
                    <tr
                      key={row.participantId}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        row.advances ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                            row.advances
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-neutral-500'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-neutral-900">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{row.participant.displayName}</span>
                          {row.advances && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                              Clasifica
                            </span>
                          )}
                        </div>
                        {row.participant.deckCombos?.[0] && (
                          <div className="text-[10px] text-neutral-500 font-mono truncate max-w-xs mt-0.5">
                            {row.participant.deckCombos[0]}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-neutral-700">{row.played}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-emerald-600 font-semibold">{row.won}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-neutral-500">{row.drawn}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-red-600">{row.lost}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-neutral-700">{row.pointsFor}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-neutral-500">{row.pointsAgainst}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums font-semibold">
                        <span className={row.pointDiff > 0 ? 'text-emerald-600' : row.pointDiff < 0 ? 'text-red-600' : 'text-neutral-500'}>
                          {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-indigo-700 font-medium">
                        {row.pointsAverage !== undefined ? row.pointsAverage.toFixed(1) : '0.0'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-sm text-neutral-900">
                        {row.points}
                      </td>

                      {/* Manual Group Reassignment Selector */}
                      {(currentRole === 'organizer' || currentRole === 'admin') && (
                        <td className="py-3 px-2 text-right">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                moveParticipantToGroup(row.participantId, e.target.value);
                              }
                            }}
                            className="border border-neutral-300 rounded text-[11px] px-1.5 py-0.5 bg-neutral-50 text-neutral-700 hover:bg-white font-medium"
                          >
                            <option value="" disabled>Mover a...</option>
                            {stageGroups
                              .filter(g => g.id !== activeGroup.id)
                              .map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Matches Fixtures for this group */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
              <h4 className="text-sm font-bold text-neutral-900">Partidas de {activeGroup.name}</h4>
              <span className="text-xs text-neutral-500 font-mono">
                {groupMatches.length} enfrentamientos
              </span>
            </div>

            <div className="space-y-2.5">
              {groupMatches.map((match) => {
                const p1 = getParticipant(match.participant1Id);
                const p2 = getParticipant(match.participant2Id);
                const isCompleted = match.status === 'completed';
                const isLive = match.status === 'in_progress';
                const matchRef = users.find(u => u.id === match.refereeId);

                return (
                  <div
                    key={match.id}
                    className={`p-3 rounded-lg border bg-white shadow-2xs transition-all ${
                      isLive
                        ? 'border-amber-400 ring-1 ring-amber-300'
                        : isCompleted
                        ? 'border-neutral-200'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2">
                      <span className="font-mono">Match #{match.position}</span>
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <span className="text-amber-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            EN VIVO
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-emerald-700 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Finalizado
                          </span>
                        )}
                        {matchRef && (
                          <span className="text-[10px] bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded font-mono">
                            ⚖️ {matchRef.displayName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Participant 1 */}
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className={`font-medium ${match.winnerId === p1?.id ? 'font-bold text-emerald-950' : 'text-neutral-800'}`}>
                        {p1?.displayName || 'TBD'}
                      </span>
                      <span className={`font-mono font-bold tabular-nums px-2 py-0.5 rounded ${
                        match.winnerId === p1?.id ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {match.score1}
                      </span>
                    </div>

                    {/* Participant 2 */}
                    <div className="flex items-center justify-between py-1 text-xs border-t border-neutral-100 mt-1 pt-1">
                      <span className={`font-medium ${match.winnerId === p2?.id ? 'font-bold text-emerald-950' : 'text-neutral-800'}`}>
                        {p2?.displayName || 'TBD'}
                      </span>
                      <span className={`font-mono font-bold tabular-nums px-2 py-0.5 rounded ${
                        match.winnerId === p2?.id ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {match.score2}
                      </span>
                    </div>

                    {/* Button to open referee console */}
                    {onOpenMatchInReferee && currentRole !== 'public' && (
                      <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-end">
                        <button
                          onClick={() => onOpenMatchInReferee(match.id)}
                          className="text-[11px] text-neutral-700 hover:text-neutral-900 font-semibold flex items-center gap-1"
                        >
                          <Scale className="w-3 h-3" />
                          Arbitrar / Ver Batallas
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
