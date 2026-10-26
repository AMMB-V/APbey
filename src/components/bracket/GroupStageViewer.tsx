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
    <div className="w-full space-y-6 text-[var(--hueso)]">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--costura)]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[var(--hueso)] tracking-tight font-display">
              {stage.name}
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-[var(--r-chip)] font-semibold ${
                stage.status === 'in_progress'
                  ? 'bg-amber-500 text-black font-bold'
                  : stage.status === 'completed'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--grafito)] text-[var(--acero)] border border-[var(--costura)]'
              }`}
            >
              {stage.status === 'in_progress' ? 'En Curso' : stage.status === 'completed' ? 'Completada' : 'Pendiente'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--acero)] mt-1">
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
                className="btn btn--secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                title="Subdivide y equilibra automáticamente los grupos según el número de bladers totales"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Subdividir Grupos
              </button>

              {stage.status === 'pending' && (
                <button
                  onClick={() => startStage(stage.id)}
                  className="btn btn--primary text-xs px-3.5 py-1.5 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Iniciar Fase de Grupos
                </button>
              )}

              {stage.status === 'in_progress' && (
                <button
                  onClick={() => advanceCurrentStage(stage.id)}
                  className="btn btn--primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--costura)] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {stageGroups.map((g) => {
            const isSelected = (activeGroup?.id === g.id);
            const gMatches = stageMatches.filter((m) => m.groupId === g.id);
            const gCompleted = gMatches.filter((m) => m.status === 'completed').length;

            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-[var(--r-control)] transition-all flex items-center gap-2 whitespace-nowrap ${
                  isSelected
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold shadow-xs'
                    : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-white border border-[var(--costura)]'
                }`}
              >
                <span>{g.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono tabular-nums ${
                    isSelected ? 'bg-neutral-800 text-white' : 'bg-[var(--costura)] text-[var(--acero)]'
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
          <div className="flex items-center gap-2 text-xs bg-[var(--grafito)] px-3 py-1.5 rounded-[var(--r-control)] border border-[var(--costura)]">
            <Scale className="w-3.5 h-3.5 text-[var(--cobalto)]" />
            <span className="font-semibold text-[var(--acero)]">Árbitro del {activeGroup.name}:</span>
            
            {(currentRole === 'organizer' || currentRole === 'admin' || currentRole === 'referee') ? (
              <select
                value={activeGroup.refereeId || ''}
                onChange={(e) => assignRefereeToGroup(activeGroup.id, e.target.value || null)}
                className="border border-[var(--costura)] rounded px-2 py-0.5 text-xs font-medium bg-[var(--chasis)] text-[var(--hueso)] focus:outline-hidden"
              >
                <option value="">Sin árbitro asignado</option>
                {users.filter(u => u.role === 'referee' || u.role === 'organizer' || u.role === 'admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium text-[var(--hueso)]">
                {groupReferee ? groupReferee.displayName : 'Sin asignar'}
              </span>
            )}

            {currentRole === 'referee' && activeGroup.refereeId !== currentUser.id && (
              <button
                onClick={() => assignRefereeToGroup(activeGroup.id, currentUser.id)}
                className="btn btn--secondary text-[11px] px-2 py-0.5 flex items-center gap-1 font-bold"
                title="Asignarme a mí mismo como árbitro de este grupo completo"
              >
                <UserCheck className="w-3 h-3 text-[var(--cobalto)]" />
                Asignarme Grupo
              </button>
            )}
          </div>
        )}
      </div>

      {activeGroup && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Standings Table with Manual Group Reassignment */}
          <div className="lg:col-span-7 bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[var(--costura)] bg-[var(--grafito)] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--hueso)] font-display">{activeGroup.name} — Tabla de Posiciones</h3>
                <p className="text-[11px] text-[var(--acero)] mt-0.5">
                  Falta: Punto al rival tras 3 faltas acumuladas · Pasan primeros {advanceCount}
                </p>
                {stage.config.tiebreakers && (
                  <p className="text-[10px] text-[var(--acero)] font-mono mt-0.5 flex items-center gap-1">
                    <span className="font-semibold text-[var(--hueso)]">Reglas desempate:</span>
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
                          {idx > 0 && <span className="text-[var(--costura)] mx-0.5">→</span>}
                          <span className="bg-[var(--chasis)] border border-[var(--costura)] text-[var(--hueso)] px-1 rounded text-[9px] font-semibold">{label}</span>
                        </span>
                      );
                    })}
                  </p>
                )}
              </div>
              <span className="text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded-[var(--r-chip)]">
                Clasifican Top {advanceCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="tabla">
                <thead>
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
                    <th className="py-2.5 px-3 text-center font-bold text-[var(--hueso)]" title="Puntos en la tabla (3 por victoria, 1 por empate)">PTS</th>
                    {(currentRole === 'organizer' || currentRole === 'admin') && (
                      <th className="py-2.5 px-2 text-right">Mover Grupo</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr
                      key={row.participantId}
                      className={row.advances ? 'bg-emerald-950/20' : ''}
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs ${
                            row.advances
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'text-[var(--acero)]'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--hueso)]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{row.participant.displayName}</span>
                          {row.advances && (
                            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-700/60 px-1.5 py-0.2 rounded-[var(--r-chip)]">
                              Clasifica
                            </span>
                          )}
                        </div>
                        {row.participant.deckCombos?.[0] && (
                          <div className="text-[10px] text-[var(--acero)] font-mono truncate max-w-xs mt-0.5">
                            {row.participant.deckCombos[0]}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-[var(--hueso)]">{row.played}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-emerald-400 font-semibold">{row.won}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-[var(--acero)]">{row.drawn}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-rose-400">{row.lost}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-[var(--hueso)]">{row.pointsFor}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-[var(--acero)]">{row.pointsAgainst}</td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums font-semibold">
                        <span className={row.pointDiff > 0 ? 'text-emerald-400' : row.pointDiff < 0 ? 'text-rose-400' : 'text-[var(--acero)]'}>
                          {row.pointDiff > 0 ? `+${row.pointDiff}` : row.pointDiff}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-mono tabular-nums text-[var(--cobalto)] font-medium">
                        {row.pointsAverage !== undefined ? row.pointsAverage.toFixed(1) : '0.0'}
                      </td>
                      <td className="py-3 px-3 text-center font-mono tabular-nums font-bold text-sm text-[var(--hueso)]">
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
                            className="border border-[var(--costura)] rounded text-[11px] px-1.5 py-0.5 bg-[var(--grafito)] text-[var(--hueso)] hover:border-[var(--cobalto)] font-medium focus:outline-hidden"
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
            <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
              <h4 className="text-sm font-bold text-[var(--hueso)] font-display">Partidas de {activeGroup.name}</h4>
              <span className="text-xs text-[var(--acero)] font-mono">
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
                    className={`p-3 rounded-[var(--r-control)] border bg-[var(--chasis)] shadow-xs transition-all ${
                      isLive
                        ? 'border-[var(--tarjeta-amarilla)] ring-1 ring-[var(--tarjeta-amarilla)]/50'
                        : isCompleted
                        ? 'border-[var(--costura)]'
                        : 'border-[var(--costura)] hover:border-[var(--acero)]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[var(--acero)] mb-2">
                      <span className="font-mono">Match #{match.position}</span>
                      <div className="flex items-center gap-1.5">
                        {isLive && (
                          <span className="text-[var(--en-vivo)] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--en-vivo)] animate-pulse" />
                            EN VIVO
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-emerald-300 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Finalizado
                          </span>
                        )}
                        {matchRef && (
                          <span className="text-[10px] bg-[var(--grafito)] border border-[var(--costura)] text-[var(--acero)] px-1.5 py-0.2 rounded font-mono">
                            ⚖️ {matchRef.displayName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Participant 1 */}
                    <div className="flex items-center justify-between py-1 text-xs">
                      <span className={`font-medium ${match.winnerId === p1?.id ? 'font-bold text-emerald-300' : 'text-[var(--hueso)]'}`}>
                        {p1?.displayName || 'TBD'}
                      </span>
                      <span className={`font-mono font-bold tabular-nums px-2 py-0.5 rounded-[var(--r-chip)] ${
                        match.winnerId === p1?.id ? 'bg-emerald-600 text-white' : 'bg-[var(--grafito)] text-[var(--hueso)] border border-[var(--costura)]'
                      }`}>
                        {match.score1}
                      </span>
                    </div>

                    {/* Participant 2 */}
                    <div className="flex items-center justify-between py-1 text-xs border-t border-[var(--costura)] mt-1 pt-1">
                      <span className={`font-medium ${match.winnerId === p2?.id ? 'font-bold text-emerald-300' : 'text-[var(--hueso)]'}`}>
                        {p2?.displayName || 'TBD'}
                      </span>
                      <span className={`font-mono font-bold tabular-nums px-2 py-0.5 rounded-[var(--r-chip)] ${
                        match.winnerId === p2?.id ? 'bg-emerald-600 text-white' : 'bg-[var(--grafito)] text-[var(--hueso)] border border-[var(--costura)]'
                      }`}>
                        {match.score2}
                      </span>
                    </div>

                    {/* Button to open referee console */}
                    {onOpenMatchInReferee && currentRole !== 'public' && (
                      <div className="mt-2 pt-2 border-t border-[var(--costura)] flex items-center justify-end">
                        <button
                          onClick={() => onOpenMatchInReferee(match.id)}
                          className="text-[11px] text-[var(--cobalto)] hover:underline font-semibold flex items-center gap-1"
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
