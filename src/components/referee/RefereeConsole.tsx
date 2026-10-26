import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { FinishType, Match, Participant } from '../../types/tournament';
import { getMatchPointsToWin } from '../../lib/engine/arbitration';
import { AceroIcon } from '../common/AceroIcon';
import {
  RotateCcw,
  Zap,
  Flame,
  Shield,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  History,
  Scale,
  RefreshCw,
  UserCheck,
  Filter,
} from 'lucide-react';

interface RefereeConsoleProps {
  initialMatchId?: string;
  onClose?: () => void;
}

export const RefereeConsole: React.FC<RefereeConsoleProps> = ({
  initialMatchId,
  onClose,
}) => {
  const {
    matches,
    stages,
    groups,
    activeTournament,
    participants,
    battles,
    penalties,
    recordBattle,
    recordPenalty,
    undoBattle,
    toggleInspected,
    assignReferee,
    claimMatchAsReferee,
    assignStationToMatch,
    callMatchToStation,
    currentUser,
    currentRole,
    users,
  } = useTournament();

  const canArbitrate = currentRole === 'referee' || currentRole === 'organizer' || currentRole === 'admin';

  const [filterMode, setFilterMode] = useState<'all' | 'mine' | 'group'>('all');
  const [filterGroupId, setFilterGroupId] = useState<string>('');

  // Active matches for this tournament
  const allTournamentMatches = matches.filter(
    (m) => m.tournamentId === activeTournament?.id && m.participant1Id && m.participant2Id && !m.isBye
  );

  // Filtered matches based on referee selection
  const filteredMatches = allTournamentMatches.filter((m) => {
    if (filterMode === 'mine') {
      return m.refereeId === currentUser.id;
    }
    if (filterMode === 'group' && filterGroupId) {
      return m.groupId === filterGroupId;
    }
    return true;
  });

  const activeMatches = filteredMatches.length > 0 ? filteredMatches : allTournamentMatches;

  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    initialMatchId || activeMatches.find(m => m.status === 'in_progress')?.id || activeMatches[0]?.id || ''
  );

  const [selectedScorer, setSelectedScorer] = useState<'p1' | 'p2' | null>(null);
  const [foulReason, setFoulReason] = useState<string>('Lanzamiento sin contacto reglamentario');
  const [showFoulModal, setShowFoulModal] = useState<boolean>(false);
  const [penaltyTarget, setPenaltyTarget] = useState<'p1' | 'p2'>('p1');

  const match = matches.find((m) => m.id === selectedMatchId) || activeMatches[0];
  const stage = match ? stages.find((s) => s.id === match.stageId) : undefined;
  const matchGroup = match?.groupId ? groups.find((g) => g.id === match.groupId) : undefined;

  const p1: Participant | undefined = match?.participant1Id
    ? participants.find((p) => p.id === match.participant1Id)
    : undefined;

  const p2: Participant | undefined = match?.participant2Id
    ? participants.find((p) => p.id === match.participant2Id)
    : undefined;

  const matchBattles = match
    ? battles.filter((b) => b.matchId === match.id).sort((a, b) => b.battleNumber - a.battleNumber)
    : [];

  const matchPenalties = match
    ? penalties.filter((p) => p.matchId === match.id)
    : [];

  // Count accumulated fouls per participant in this match
  const p1Fouls = matchPenalties.filter((p) => p.participantId === p1?.id && p.isFoul).length;
  const p2Fouls = matchPenalties.filter((p) => p.participantId === p2?.id && p.isFoul).length;

  const targetPointsToWin = match && stage && activeTournament
    ? getMatchPointsToWin(match, stage, activeTournament)
    : 4;

  const isCompleted = match?.status === 'completed';

  const handleFinishClick = (finish: FinishType) => {
    if (!canArbitrate || !match || !selectedScorer || isCompleted) return;
    const scorerId = (selectedScorer === 'p1' ? match.participant1Id : match.participant2Id) ?? null;
    recordBattle(match.id, scorerId, finish);
    setSelectedScorer(null);
  };

  const handleDrawClick = () => {
    if (!canArbitrate || !match || isCompleted) return;
    recordBattle(match.id, null, null, 'Empate simultáneo (ambos conservan combo)');
    setSelectedScorer(null);
  };

  const handleFoulSubmit = () => {
    if (!canArbitrate || !match) return;
    const offenderId = penaltyTarget === 'p1' ? match.participant1Id! : match.participant2Id!;
    // Register foul without card selection: rival gets point on every 3 accumulated fouls
    recordPenalty(match.id, offenderId, undefined, true, foulReason);
    setShowFoulModal(false);
  };

  if (!match || !stage || !activeTournament) {
    return (
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-8 text-center max-w-lg mx-auto text-[var(--hueso)]">
        <Scale className="w-10 h-10 text-[var(--acero)] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[var(--hueso)] font-display">No hay matches listos para arbitrar</h3>
        <p className="text-xs text-[var(--acero)] mt-1">
          Asegúrate de haber iniciado una etapa con participantes asignados.
        </p>
      </div>
    );
  }

  const targetBlader = penaltyTarget === 'p1' ? p1 : p2;
  const targetCurrentFouls = penaltyTarget === 'p1' ? p1Fouls : p2Fouls;
  const willTriggerPoint = (targetCurrentFouls + 1) % (activeTournament.foulsPerPoint || 3) === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4 text-[var(--hueso)]">
      {/* Top Filter and Match Selector Bar */}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-3.5 shadow-xs space-y-3">
        {/* Filter modes for referees */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--costura)]">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--acero)]" />
            <span className="text-[11px] font-bold text-[var(--acero)] uppercase">Filtro de Arbitraje:</span>
            <div className="flex items-center gap-1 bg-[var(--grafito)] p-0.5 rounded-[var(--r-chip)] border border-[var(--costura)]">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 text-[11px] rounded-[var(--r-chip)] font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold shadow-xs' : 'text-[var(--acero)]'
                }`}
              >
                Todos ({allTournamentMatches.length})
              </button>
              <button
                onClick={() => setFilterMode('mine')}
                className={`px-2 py-0.5 text-[11px] rounded-[var(--r-chip)] font-medium transition-colors ${
                  filterMode === 'mine' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold shadow-xs' : 'text-[var(--acero)]'
                }`}
              >
                Mis Asignados ({allTournamentMatches.filter(m => m.refereeId === currentUser.id).length})
              </button>
              {groups.length > 0 && (
                <button
                  onClick={() => {
                    setFilterMode('group');
                    if (!filterGroupId && groups[0]) setFilterGroupId(groups[0].id);
                  }}
                  className={`px-2 py-0.5 text-[11px] rounded-[var(--r-chip)] font-medium transition-colors ${
                    filterMode === 'group' ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold shadow-xs' : 'text-[var(--acero)]'
                  }`}
                >
                  Por Grupo
                </button>
              )}
            </div>
          </div>

          {filterMode === 'group' && (
            <select
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              className="text-xs border border-[var(--costura)] rounded px-2 py-1 bg-[var(--grafito)] text-[var(--hueso)] font-medium focus:outline-hidden"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-[var(--acero)] hover:text-white font-bold text-xs"
            >
              ✕ Cerrar
            </button>
          )}
        </div>

        {/* Match Selector Dropdown + Referee Assignment */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 grow w-full sm:w-auto">
            <Scale className="w-4 h-4 text-[var(--cobalto)] shrink-0" />
            <select
              value={match.id}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                setSelectedScorer(null);
              }}
              className="w-full sm:w-80 border border-[var(--costura)] rounded-[var(--r-control)] px-2.5 py-1.5 bg-[var(--grafito)] text-xs font-semibold text-[var(--hueso)] focus:outline-hidden"
            >
              {activeMatches.map((m) => {
                const b1 = participants.find((p) => p.id === m.participant1Id)?.displayName || 'TBD';
                const b2 = participants.find((p) => p.id === m.participant2Id)?.displayName || 'TBD';
                const grp = groups.find((g) => g.id === m.groupId);
                return (
                  <option key={m.id} value={m.id}>
                    {grp ? `[${grp.name}] ` : ''}#{m.position}: {b1} vs {b2} ({m.status === 'completed' ? 'Finalizado' : `${m.score1}-${m.score2}`})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Current Referee & Claim button */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-xs text-[var(--acero)] flex items-center gap-1.5">
              <span>Árbitro:</span>
              <select
                value={match.refereeId || ''}
                onChange={(e) => assignReferee(match.id, e.target.value || null)}
                className="border border-[var(--costura)] rounded px-2 py-1 text-xs font-medium bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden"
              >
                <option value="">Sin asignar</option>
                {users.filter(u => u.role === 'referee' || u.role === 'organizer' || u.role === 'admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            {match.refereeId !== currentUser.id && canArbitrate && (
              <button
                onClick={() => claimMatchAsReferee(match.id)}
                className="btn btn--secondary text-xs px-2.5 py-1 flex items-center gap-1"
                title="Tomar el control del match como juez"
              >
                <UserCheck className="w-3 h-3 text-[var(--cobalto)]" />
                Asignarme
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEC-01 Broken Access Control Protection Banner */}
      {!canArbitrate && (
        <div className="bg-amber-950/30 border border-amber-600/50 text-amber-300 rounded-[var(--r-control)] p-3 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Modo Solo Lectura (Espectador / Blader):</span> Tu rol actual es "{currentRole}". El registro de asaltos, faltas y asignación de mesa requiere rol de Árbitro u Organizador oficial (OWASP ASVS SEC-01).
            </div>
          </div>
        </div>
      )}

      {/* Main Stadium Board (Player 1 vs Player 2) */}
      <div className="bg-[var(--grafito)] text-[var(--hueso)] rounded-[var(--r-card)] p-4 sm:p-6 shadow-xl border border-[var(--costura)] relative overflow-hidden">
        {/* Match Header Bar with Station Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[var(--acero)] mb-4 pb-2 border-b border-[var(--costura)] gap-2">
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span>{matchGroup ? matchGroup.name : stage.name}</span>
            <span>·</span>
            <span className="text-[var(--tarjeta-amarilla)] font-bold">Meta: {targetPointsToWin} pts</span>
            <span>·</span>
            {/* Station dropdown */}
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-[var(--acero)] font-sans text-[11px]">Estadio:</span>
              <select
                value={match.station || 'Estadio 1'}
                onChange={(e) => assignStationToMatch(match.id, e.target.value)}
                disabled={!canArbitrate}
                className="bg-[var(--chasis)] border border-[var(--costura)] text-[var(--tarjeta-amarilla)] rounded px-2 py-0.5 text-xs font-semibold focus:outline-hidden"
              >
                <option value="Estadio 1">Estadio 1</option>
                <option value="Estadio 2">Estadio 2</option>
                <option value="Estadio 3">Estadio 3</option>
                <option value="Mesa Xtreme A">Mesa Xtreme A</option>
                <option value="Mesa Xtreme B">Mesa Xtreme B</option>
              </select>

              {canArbitrate && (
                <button
                  type="button"
                  onClick={() => callMatchToStation(match.id)}
                  className="px-2 py-0.5 rounded bg-[var(--tarjeta-amarilla)] text-[var(--tinta)] font-bold text-[11px] transition-colors flex items-center gap-1"
                  title="Convocar a los bladers por altavoces y pantalla de estadio"
                >
                  📢 Llamar
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-[var(--r-chip)] flex items-center gap-1">
                <Trophy className="w-3 h-3 text-emerald-400" /> MATCH FINALIZADO
              </span>
            ) : (
              <span className="font-bold text-[var(--en-vivo)] bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-[var(--r-chip)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--en-vivo)] animate-pulse" /> EN VIVO
              </span>
            )}
          </div>
        </div>

        {/* Dual Scoreboard */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 items-stretch">
          {/* Player 1 Card (Cobalto / Azul) */}
          <div
            onClick={() => !isCompleted && canArbitrate && setSelectedScorer('p1')}
            className={`p-4 rounded-[var(--r-card)] border transition-all cursor-pointer flex flex-col justify-between ${
              selectedScorer === 'p1'
                ? 'bg-blue-950/70 border-[var(--cobalto)] ring-2 ring-[var(--cobalto)]'
                : match.winnerId === p1?.id
                ? 'bg-blue-950/40 border-emerald-500'
                : 'bg-[var(--chasis)] border-[var(--costura)] hover:border-[var(--cobalto)]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--cobalto)] uppercase tracking-wider">
                  BLADER 1 (AZUL)
                </span>
                {p1?.seed && (
                  <span className="text-[10px] font-mono text-[var(--acero)]">
                    Siembra #{p1.seed}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-[var(--hueso)] mt-1 truncate font-display">
                {p1?.displayName || 'TBD'}
              </div>

              {p1?.deckCombos?.[0] && (
                <div className="text-[11px] text-[var(--acero)] mt-1 font-mono truncate">
                  {p1.deckCombos[0]}
                </div>
              )}
            </div>

            {/* Score & Foul Count */}
            <div className="my-3 text-center">
              <div className="text-5xl sm:text-6xl font-black font-display tracking-tight text-[var(--hueso)] tabular-nums">
                {match.score1}
              </div>
              
              {/* Accumulated Fouls Tracker */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--grafito)] border border-[var(--costura)] text-[11px] font-mono">
                <span className="text-[var(--acero)]">Faltas acumuladas:</span>
                <span className={`font-bold ${p1Fouls % 3 === 2 ? 'text-[var(--tarjeta-amarilla)] animate-pulse' : 'text-[var(--hueso)]'}`}>
                  {p1Fouls % 3}/3
                </span>
                {p1Fouls > 0 && <span className="text-[10px] text-[var(--acero)]">({p1Fouls} tot)</span>}
              </div>
            </div>

            {/* Actions for P1 */}
            <div className="pt-2 border-t border-[var(--costura)] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (p1 && canArbitrate) toggleInspected(p1.id);
                }}
                disabled={!canArbitrate}
                className={`flex items-center gap-1 px-2 py-1 rounded-[var(--r-chip)] text-[11px] font-medium transition-colors ${
                  p1?.inspected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-white'
                }`}
              >
                <AceroIcon id="i-beycheck" size="sm" />
                {p1?.inspected ? 'Bey Checked' : 'Inspeccionar'}
              </button>

              {canArbitrate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPenaltyTarget('p1');
                    setShowFoulModal(true);
                  }}
                  className="text-[11px] text-[var(--tarjeta-amarilla)] hover:brightness-110 flex items-center gap-1 font-semibold"
                >
                  <AceroIcon id="i-alerta" size="sm" />
                  +1 Falta
                </button>
              )}
            </div>
          </div>

          {/* Player 2 Card (Cobre / Rojo) */}
          <div
            onClick={() => !isCompleted && canArbitrate && setSelectedScorer('p2')}
            className={`p-4 rounded-[var(--r-card)] border transition-all cursor-pointer flex flex-col justify-between ${
              selectedScorer === 'p2'
                ? 'bg-orange-950/70 border-[var(--cobre)] ring-2 ring-[var(--cobre)]'
                : match.winnerId === p2?.id
                ? 'bg-orange-950/40 border-emerald-500'
                : 'bg-[var(--chasis)] border-[var(--costura)] hover:border-[var(--cobre)]/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--cobre)] uppercase tracking-wider">
                  BLADER 2 (ROJO)
                </span>
                {p2?.seed && (
                  <span className="text-[10px] font-mono text-[var(--acero)]">
                    Siembra #{p2.seed}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-[var(--hueso)] mt-1 truncate font-display">
                {p2?.displayName || 'TBD'}
              </div>

              {p2?.deckCombos?.[0] && (
                <div className="text-[11px] text-[var(--acero)] mt-1 font-mono truncate">
                  {p2.deckCombos[0]}
                </div>
              )}
            </div>

            {/* Score & Foul Count */}
            <div className="my-3 text-center">
              <div className="text-5xl sm:text-6xl font-black font-display tracking-tight text-[var(--hueso)] tabular-nums">
                {match.score2}
              </div>

              {/* Accumulated Fouls Tracker */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--grafito)] border border-[var(--costura)] text-[11px] font-mono">
                <span className="text-[var(--acero)]">Faltas acumuladas:</span>
                <span className={`font-bold ${p2Fouls % 3 === 2 ? 'text-[var(--tarjeta-amarilla)] animate-pulse' : 'text-[var(--hueso)]'}`}>
                  {p2Fouls % 3}/3
                </span>
                {p2Fouls > 0 && <span className="text-[10px] text-[var(--acero)]">({p2Fouls} tot)</span>}
              </div>
            </div>

            {/* Actions for P2 */}
            <div className="pt-2 border-t border-[var(--costura)] flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (p2 && canArbitrate) toggleInspected(p2.id);
                }}
                disabled={!canArbitrate}
                className={`flex items-center gap-1 px-2 py-1 rounded-[var(--r-chip)] text-[11px] font-medium transition-colors ${
                  p2?.inspected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-white'
                }`}
              >
                <AceroIcon id="i-beycheck" size="sm" />
                {p2?.inspected ? 'Bey Checked' : 'Inspeccionar'}
              </button>

              {canArbitrate && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPenaltyTarget('p2');
                    setShowFoulModal(true);
                  }}
                  className="text-[11px] text-[var(--tarjeta-amarilla)] hover:brightness-110 flex items-center gap-1 font-semibold"
                >
                  <AceroIcon id="i-alerta" size="sm" />
                  +1 Falta
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Prompt banner */}
        {!isCompleted && canArbitrate && (
          <div className="mt-4 text-center">
            {selectedScorer ? (
              <div className="text-xs text-[var(--tinta)] font-bold bg-[var(--tarjeta-amarilla)] py-1.5 px-3 rounded-[var(--r-control)] inline-block">
                Seleccionado: {selectedScorer === 'p1' ? p1?.displayName : p2?.displayName} → Elige tipo de finish abajo (1 toque)
              </div>
            ) : (
              <div className="text-xs text-[var(--acero)] font-medium">
                👉 Toca al ganador de la batalla (Blader 1 Azul o Blader 2 Rojo) para anotar los puntos
              </div>
            )}
          </div>
        )}

        {/* Victory Celebration */}
        {isCompleted && (
          <div className="mt-4 p-4 rounded-[var(--r-card)] bg-emerald-950/80 border border-emerald-600 text-center animate-in zoom-in-95">
            <Trophy className="w-8 h-8 text-[var(--tarjeta-amarilla)] mx-auto mb-1" />
            <div className="text-lg font-bold text-white font-display">
              ¡Ganador: {match.winnerId === p1?.id ? p1?.displayName : p2?.displayName}!
            </div>
            <div className="text-xs text-emerald-200 mt-1">
              Resultado final: {match.score1} - {match.score2}. Meta de {targetPointsToWin} puntos alcanzada.
            </div>
          </div>
        )}
      </div>

      {/* Big Touch Buttons for Finishes (min-h-[56px] for fast arena scoring) */}
      {!isCompleted && canArbitrate && (
        <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-4 shadow-xs space-y-3">
          <div className="text-xs font-bold text-[var(--acero)] uppercase tracking-wider flex items-center justify-between">
            <span>Botonera Oficial BeyScore (56px táctil de 1 toque)</span>
            <span className="text-[10px] text-[var(--acero)]">Reglamento WBO Beyblade X</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Xtreme Finish (+3 pts) */}
            <button
              onClick={() => handleFinishClick('xtreme')}
              disabled={!selectedScorer}
              className={`min-h-[56px] p-3 rounded-[var(--r-control)] font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border ${
                selectedScorer
                  ? 'bg-[#3b236b] hover:bg-[#4d2f8c] border-[#d3c4ff] text-[#d3c4ff] shadow-md'
                  : 'bg-[var(--grafito)] text-[var(--acero)]/40 border-[var(--costura)] cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AceroIcon id="i-xtreme" size="md" className="text-[#d3c4ff]" />
                <span className="text-xs">Xtreme Finish</span>
              </div>
              <span className="text-[11px] font-mono font-black">+{activeTournament.finishPoints.xtreme} Pts</span>
            </button>

            {/* Burst Finish (+2 pts) */}
            <button
              onClick={() => handleFinishClick('burst')}
              disabled={!selectedScorer}
              className={`min-h-[56px] p-3 rounded-[var(--r-control)] font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border ${
                selectedScorer
                  ? 'bg-[#5c1c3f] hover:bg-[#782453] border-[#cc5290] text-[#cc5290] shadow-md'
                  : 'bg-[var(--grafito)] text-[var(--acero)]/40 border-[var(--costura)] cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AceroIcon id="i-burst" size="md" className="text-[#cc5290]" />
                <span className="text-xs">Burst Finish</span>
              </div>
              <span className="text-[11px] font-mono font-black">+{activeTournament.finishPoints.burst} Pts</span>
            </button>

            {/* Over Finish (+2 pts) */}
            <button
              onClick={() => handleFinishClick('over')}
              disabled={!selectedScorer}
              className={`min-h-[56px] p-3 rounded-[var(--r-control)] font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border ${
                selectedScorer
                  ? 'bg-[#13493e] hover:bg-[#1a6152] border-[#62d2b6] text-[#62d2b6] shadow-md'
                  : 'bg-[var(--grafito)] text-[var(--acero)]/40 border-[var(--costura)] cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AceroIcon id="i-over" size="md" className="text-[#62d2b6]" />
                <span className="text-xs">Over Finish</span>
              </div>
              <span className="text-[11px] font-mono font-black">+{activeTournament.finishPoints.over} Pts</span>
            </button>

            {/* Spin Finish (+1 pt) */}
            <button
              onClick={() => handleFinishClick('spin')}
              disabled={!selectedScorer}
              className={`min-h-[56px] p-3 rounded-[var(--r-control)] font-bold flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 border ${
                selectedScorer
                  ? 'bg-[#2a3038] hover:bg-[#39414c] border-[#a3abb5] text-[#ece8e0] shadow-md'
                  : 'bg-[var(--grafito)] text-[var(--acero)]/40 border-[var(--costura)] cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <AceroIcon id="i-spin" size="md" className="text-[#a3abb5]" />
                <span className="text-xs">Spin Finish</span>
              </div>
              <span className="text-[11px] font-mono font-black">+{activeTournament.finishPoints.spin} Pt</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--costura)]">
            <button
              onClick={handleDrawClick}
              className="btn btn--secondary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Empate Simultáneo (0 pts)
            </button>

            <button
              onClick={() => undoBattle(match.id)}
              disabled={matchBattles.length === 0}
              className={`btn btn--secondary text-xs px-3.5 py-2 flex items-center gap-1.5 ${
                matchBattles.length > 0
                  ? 'hover:text-amber-400'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <AceroIcon id="i-deshacer" size="sm" />
              Deshacer Batalla (Undo)
            </button>
          </div>
        </div>
      )}

      {/* Battle History */}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-[var(--costura)]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--hueso)]">
            <History className="w-4 h-4 text-[var(--cobalto)]" />
            Acta de Combate Oficial ({matchBattles.length} batallas)
          </div>
          {isCompleted && canArbitrate && (
            <button
              onClick={() => undoBattle(match.id)}
              className="text-xs text-[var(--tarjeta-amarilla)] hover:underline font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reabrir / Deshacer Último Asalto
            </button>
          )}
        </div>

        {matchBattles.length === 0 ? (
          <div className="text-center py-6 text-xs text-[var(--acero)]">
            Aún no se han registrado batallas en este match.
          </div>
        ) : (
          <div className="divide-y divide-[var(--costura)]">
            {matchBattles.map((b) => {
              const scorer = participants.find((p) => p.id === b.scorerId);
              return (
                <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[var(--acero)]">#{b.battleNumber}</span>
                    <span className="font-bold text-[var(--hueso)]">
                      {scorer ? scorer.displayName : 'Empate'}
                    </span>
                    {b.finish && (
                      <span className="chip-finish" data-finish={b.finish}>
                        <span className="chip-finish__key uppercase font-mono font-bold">{b.finish}</span>
                        <span>+{b.points}</span>
                      </span>
                    )}
                    {b.note && <span className="text-[11px] text-[var(--acero)] italic">({b.note})</span>}
                  </div>
                  <span className="text-[10px] text-[var(--acero)] font-mono">
                    {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Foul Registration Modal (Direct Foul without card selection, rival gets point on 3 fouls) */}
      {showFoulModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] shadow-2xl max-w-md w-full p-5 space-y-4 text-[var(--hueso)]">
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--costura)]">
              <AlertTriangle className="w-5 h-5 text-[var(--tarjeta-amarilla)]" />
              <h3 className="text-sm font-bold text-[var(--hueso)] font-display">
                Registrar Falta a {targetBlader?.displayName}
              </h3>
            </div>

            <div className={`p-3 rounded-[var(--r-control)] border text-xs ${
              willTriggerPoint
                ? 'bg-amber-950/40 border-amber-500/70 text-amber-200'
                : 'bg-[var(--grafito)] border-[var(--costura)] text-[var(--acero)]'
            }`}>
              <div className="font-bold">
                Conteo actual: {targetCurrentFouls % 3}/3 faltas acumuladas
              </div>
              <div className="mt-1">
                {willTriggerPoint
                  ? '⚠️ ¡ATENCIÓN! Esta es la 3ª falta acumulada. El rival recibirá automáticamente +1 punto reglamentario.'
                  : 'Regla WBO: El rival recibe 1 punto tras acumular 3 faltas.'}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--acero)]">Motivo de la infracción:</label>
              <select
                value={foulReason}
                onChange={(e) => setFoulReason(e.target.value)}
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] p-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden"
              >
                <option value="Lanzamiento sin contacto reglamentario">Lanzamiento sin contacto reglamentario</option>
                <option value="Lanzamiento fuera de tiempo (Shoot delay)">Lanzamiento fuera de tiempo (Shoot delay)</option>
                <option value="Contacto corporal o invasión de arena">Contacto corporal o invasión de arena</option>
                <option value="Lanzador no autorizado o posición antirreglamentaria">Lanzador no autorizado o posición antirreglamentaria</option>
                <option value="Conducta antideportiva menor">Conducta antideportiva menor</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--costura)]">
              <button
                type="button"
                onClick={() => setShowFoulModal(false)}
                className="btn btn--secondary text-xs px-3 py-1.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFoulSubmit}
                className="btn btn--primary text-xs px-3 py-1.5"
              >
                Confirmar Falta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
