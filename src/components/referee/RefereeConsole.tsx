import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { FinishType, Match, Participant } from '../../types/tournament';
import { getMatchPointsToWin } from '../../lib/engine/arbitration';
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
    assignRefereeToGroup,
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
  const assignedRef = users.find((u) => u.id === match?.refereeId);

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
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center max-w-lg mx-auto">
        <Scale className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-900">No hay matches listos para arbitrar</h3>
        <p className="text-xs text-neutral-500 mt-1">
          Asegúrate de haber iniciado una etapa con participantes asignados.
        </p>
      </div>
    );
  }

  const targetBlader = penaltyTarget === 'p1' ? p1 : p2;
  const targetCurrentFouls = penaltyTarget === 'p1' ? p1Fouls : p2Fouls;
  const willTriggerPoint = (targetCurrentFouls + 1) % (activeTournament.foulsPerPoint || 3) === 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top Filter and Match Selector Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-3.5 shadow-2xs space-y-3">
        {/* Filter modes for referees */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-[11px] font-bold text-neutral-600 uppercase">Filtro de Arbitraje:</span>
            <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                  filterMode === 'all' ? 'bg-white shadow-2xs text-neutral-900 font-bold' : 'text-neutral-600'
                }`}
              >
                Todos ({allTournamentMatches.length})
              </button>
              <button
                onClick={() => setFilterMode('mine')}
                className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                  filterMode === 'mine' ? 'bg-white shadow-2xs text-neutral-900 font-bold' : 'text-neutral-600'
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
                  className={`px-2 py-0.5 text-[11px] rounded font-medium transition-colors ${
                    filterMode === 'group' ? 'bg-white shadow-2xs text-neutral-900 font-bold' : 'text-neutral-600'
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
              className="text-xs border border-neutral-300 rounded px-2 py-1 bg-neutral-50 font-medium"
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
              className="text-neutral-400 hover:text-neutral-700 font-bold text-xs"
            >
              ✕ Cerrar
            </button>
          )}
        </div>

        {/* Match Selector Dropdown + Referee Assignment */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 grow w-full sm:w-auto">
            <Scale className="w-4 h-4 text-neutral-700 shrink-0" />
            <select
              value={match.id}
              onChange={(e) => {
                setSelectedMatchId(e.target.value);
                setSelectedScorer(null);
              }}
              className="w-full sm:w-80 border border-neutral-300 rounded-lg px-2.5 py-1.5 bg-neutral-50 text-xs font-semibold text-neutral-900 focus:ring-1 focus:ring-neutral-900"
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
            <div className="text-xs text-neutral-600 flex items-center gap-1.5">
              <span>Árbitro:</span>
              <select
                value={match.refereeId || ''}
                onChange={(e) => assignReferee(match.id, e.target.value || null)}
                className="border border-neutral-300 rounded px-2 py-1 text-xs font-medium bg-white"
              >
                <option value="">Sin asignar</option>
                {users.filter(u => u.role === 'referee' || u.role === 'organizer' || u.role === 'admin').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.displayName}
                  </option>
                ))}
              </select>
            </div>

            {match.refereeId !== currentUser.id && (
              <button
                onClick={() => claimMatchAsReferee(match.id)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-neutral-900 hover:bg-neutral-800 text-white transition-colors flex items-center gap-1"
                title="Tomar el control del match como juez"
              >
                <UserCheck className="w-3 h-3" />
                Asignarme
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SEC-01 Broken Access Control Protection Banner */}
      {!canArbitrate && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Modo Solo Lectura (Espectador / Blader):</span> Tu rol actual es "{currentRole}". El registro de asaltos, faltas y asignación de mesa requiere rol de Árbitro u Organizador oficial (OWASP ASVS SEC-01).
            </div>
          </div>
        </div>
      )}

      {/* Main Stadium Board (Player 1 vs Player 2) */}
      <div className="bg-neutral-950 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-neutral-800 relative overflow-hidden">
        {/* Match Header Bar with Station Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-neutral-400 mb-4 pb-2 border-b border-neutral-800 gap-2">
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <span>{matchGroup ? matchGroup.name : stage.name}</span>
            <span>·</span>
            <span className="text-amber-400 font-bold">Meta: {targetPointsToWin} pts</span>
            <span>·</span>
            {/* Station dropdown */}
            <div className="flex items-center gap-1.5 ml-1">
              <span className="text-neutral-500 font-sans text-[11px]">Estadio:</span>
              <select
                value={match.station || 'Estadio 1'}
                onChange={(e) => assignStationToMatch(match.id, e.target.value)}
                disabled={!canArbitrate}
                className="bg-neutral-900 border border-neutral-700 text-amber-300 rounded px-2 py-0.5 text-xs font-semibold"
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
                  className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-[11px] transition-colors flex items-center gap-1"
                  title="Convocar a los bladers por altavoces y pantalla de estadio"
                >
                  📢 Llamar
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded flex items-center gap-1">
                <Trophy className="w-3 h-3" /> MATCH FINALIZADO
              </span>
            ) : (
              <span className="font-bold text-amber-400 bg-amber-950/60 border border-amber-700/40 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> EN VIVO
              </span>
            )}
          </div>
        </div>

        {/* Dual Scoreboard */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 items-stretch">
          {/* Player 1 Card (Blue) */}
          <div
            onClick={() => !isCompleted && setSelectedScorer('p1')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedScorer === 'p1'
                ? 'bg-blue-950/80 border-blue-400 ring-2 ring-blue-500'
                : match.winnerId === p1?.id
                ? 'bg-blue-950/40 border-emerald-500'
                : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  BLADER 1 (AZUL)
                </span>
                {p1?.seed && (
                  <span className="text-[10px] font-mono text-neutral-400">
                    Siembra #{p1.seed}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                {p1?.displayName || 'TBD'}
              </div>

              {p1?.deckCombos?.[0] && (
                <div className="text-[11px] text-neutral-400 mt-1 font-mono truncate">
                  {p1.deckCombos[0]}
                </div>
              )}
            </div>

            {/* Score & Foul Count */}
            <div className="my-3 text-center">
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white tabular-nums">
                {match.score1}
              </div>
              
              {/* Accumulated Fouls Tracker */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] font-mono">
                <span className="text-neutral-400">Faltas acumuladas:</span>
                <span className={`font-bold ${p1Fouls % 3 === 2 ? 'text-amber-400 animate-pulse' : 'text-neutral-200'}`}>
                  {p1Fouls % 3}/3
                </span>
                {p1Fouls > 0 && <span className="text-[10px] text-neutral-500">({p1Fouls} tot)</span>}
              </div>
            </div>

            {/* Actions for P1 */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (p1) toggleInspected(p1.id);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  p1?.inspected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {p1?.inspected ? 'Bey Checked' : 'Inspeccionar'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPenaltyTarget('p1');
                  setShowFoulModal(true);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <AlertTriangle className="w-3 h-3" />
                +1 Falta
              </button>
            </div>
          </div>

          {/* Player 2 Card (Red) */}
          <div
            onClick={() => !isCompleted && setSelectedScorer('p2')}
            className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              selectedScorer === 'p2'
                ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-500'
                : match.winnerId === p2?.id
                ? 'bg-rose-950/40 border-emerald-500'
                : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  BLADER 2 (ROJO)
                </span>
                {p2?.seed && (
                  <span className="text-[10px] font-mono text-neutral-400">
                    Siembra #{p2.seed}
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                {p2?.displayName || 'TBD'}
              </div>

              {p2?.deckCombos?.[0] && (
                <div className="text-[11px] text-neutral-400 mt-1 font-mono truncate">
                  {p2.deckCombos[0]}
                </div>
              )}
            </div>

            {/* Score & Foul Count */}
            <div className="my-3 text-center">
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white tabular-nums">
                {match.score2}
              </div>

              {/* Accumulated Fouls Tracker */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px] font-mono">
                <span className="text-neutral-400">Faltas acumuladas:</span>
                <span className={`font-bold ${p2Fouls % 3 === 2 ? 'text-amber-400 animate-pulse' : 'text-neutral-200'}`}>
                  {p2Fouls % 3}/3
                </span>
                {p2Fouls > 0 && <span className="text-[10px] text-neutral-500">({p2Fouls} tot)</span>}
              </div>
            </div>

            {/* Actions for P2 */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (p2) toggleInspected(p2.id);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                  p2?.inspected
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                {p2?.inspected ? 'Bey Checked' : 'Inspeccionar'}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPenaltyTarget('p2');
                  setShowFoulModal(true);
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <AlertTriangle className="w-3 h-3" />
                +1 Falta
              </button>
            </div>
          </div>
        </div>

        {/* Prompt banner */}
        {!isCompleted && (
          <div className="mt-4 text-center">
            {selectedScorer ? (
              <div className="text-xs text-amber-300 font-semibold bg-neutral-900/90 py-1.5 px-3 rounded-lg border border-neutral-700 inline-block">
                Seleccionado: {selectedScorer === 'p1' ? p1?.displayName : p2?.displayName} → Elige tipo de finish abajo
              </div>
            ) : (
              <div className="text-xs text-neutral-400 font-medium">
                👉 Toca al ganador de la batalla (Blader 1 o Blader 2) para anotar los puntos
              </div>
            )}
          </div>
        )}

        {/* Victory Celebration */}
        {isCompleted && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/80 border border-emerald-600 text-center animate-in zoom-in-95">
            <Trophy className="w-8 h-8 text-amber-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-white">
              ¡Ganador: {match.winnerId === p1?.id ? p1?.displayName : p2?.displayName}!
            </div>
            <div className="text-xs text-emerald-200 mt-1">
              Resultado final: {match.score1} - {match.score2}. Meta de {targetPointsToWin} puntos alcanzada.
            </div>
          </div>
        )}
      </div>

      {/* Big Touch Buttons for Finishes */}
      {!isCompleted && (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs space-y-3">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
            Registrar Resultado de Batalla
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => handleFinishClick('xtreme')}
              disabled={!selectedScorer}
              className={`p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                selectedScorer
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span className="text-xs">Xtreme Finish</span>
              <span className="text-[11px] font-mono opacity-90">+{activeTournament.finishPoints.xtreme} Pts</span>
            </button>

            <button
              onClick={() => handleFinishClick('burst')}
              disabled={!selectedScorer}
              className={`p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                selectedScorer
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Flame className="w-5 h-5 text-amber-200" />
              <span className="text-xs">Burst Finish</span>
              <span className="text-[11px] font-mono opacity-90">+{activeTournament.finishPoints.burst} Pts</span>
            </button>

            <button
              onClick={() => handleFinishClick('over')}
              disabled={!selectedScorer}
              className={`p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                selectedScorer
                  ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Shield className="w-5 h-5 text-sky-200" />
              <span className="text-xs">Over Finish</span>
              <span className="text-[11px] font-mono opacity-90">+{activeTournament.finishPoints.over} Pts</span>
            </button>

            <button
              onClick={() => handleFinishClick('spin')}
              disabled={!selectedScorer}
              className={`p-3.5 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                selectedScorer
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CircleDot className="w-5 h-5 text-emerald-200" />
              <span className="text-xs">Spin Finish</span>
              <span className="text-[11px] font-mono opacity-90">+{activeTournament.finishPoints.spin} Pt</span>
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-neutral-100">
            <button
              onClick={handleDrawClick}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Empate Simultáneo (0 pts)
            </button>

            <button
              onClick={() => undoBattle(match.id)}
              disabled={matchBattles.length === 0}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                matchBattles.length > 0
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                  : 'bg-neutral-50 text-neutral-300 cursor-not-allowed'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Deshacer Batalla
            </button>
          </div>
        </div>
      )}

      {/* Battle History */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700">
            <History className="w-4 h-4 text-neutral-500" />
            Bitácora de Batallas ({matchBattles.length})
          </div>
          {isCompleted && (
            <button
              onClick={() => undoBattle(match.id)}
              className="text-xs text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Reabrir / Deshacer
            </button>
          )}
        </div>

        {matchBattles.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-400">
            Aún no se han registrado batallas en este match.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {matchBattles.map((b) => {
              const scorer = participants.find((p) => p.id === b.scorerId);
              return (
                <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-neutral-400 text-[11px]">
                      Batalla #{b.battleNumber}
                    </span>
                    {b.finish ? (
                      <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-neutral-100 border border-neutral-200">
                        {b.finish} Finish
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-neutral-100 text-neutral-600">
                        Empate
                      </span>
                    )}
                    <span className="font-medium text-neutral-800">
                      {scorer ? scorer.displayName : 'Sin anotador'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-neutral-900 tabular-nums">
                      +{b.points} pts
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simplified Foul Modal (Eliminated Card Selection) */}
      {showFoulModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-neutral-200 animate-in zoom-in-95">
            <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Registrar Falta Reglamentaria
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Reglamento: El punto se le otorga al rival tras acumular 3 faltas.
            </p>

            <div className="space-y-4 my-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Blader infractor:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPenaltyTarget('p1')}
                    className={`p-2.5 rounded-lg font-medium border text-center transition-all ${
                      penaltyTarget === 'p1' ? 'bg-blue-50 border-blue-600 text-blue-900 font-bold' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div>{p1?.displayName || 'Blader 1'}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      Faltas previas: {p1Fouls % 3}/3
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenaltyTarget('p2')}
                    className={`p-2.5 rounded-lg font-medium border text-center transition-all ${
                      penaltyTarget === 'p2' ? 'bg-rose-50 border-rose-600 text-rose-900 font-bold' : 'bg-neutral-50 border-neutral-200'
                    }`}
                  >
                    <div>{p2?.displayName || 'Blader 2'}</div>
                    <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      Faltas previas: {p2Fouls % 3}/3
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Motivo de la falta:</label>
                <select
                  value={foulReason}
                  onChange={(e) => setFoulReason(e.target.value)}
                  className="w-full border border-neutral-300 rounded-md p-2 bg-white text-xs font-medium"
                >
                  <option value="Lanzamiento fallido o fuera del riel Xtreme">
                    Lanzamiento fallido o fuera del riel Xtreme
                  </option>
                  <option value="Lanzamiento prematuro o fuera de orden">
                    Lanzamiento prematuro o fuera de orden
                  </option>
                  <option value="Tocar el estadio durante la batalla">
                    Tocar el estadio durante la batalla
                  </option>
                  <option value="Infracción en el ángulo o posición de lanzamiento">
                    Infracción en el ángulo o posición de lanzamiento
                  </option>
                  <option value="Retraso reiterado de juego">Retraso reiterado de juego</option>
                </select>
              </div>

              {/* Consequence Box */}
              <div className={`p-3 rounded-lg border text-xs ${
                willTriggerPoint
                  ? 'bg-red-50 border-red-300 text-red-900 font-medium'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-700'
              }`}>
                {willTriggerPoint ? (
                  <div>
                    ⚠️ <strong>¡Esta será la 3ª falta acumulada!</strong> Se otorgará automáticamente <strong>+1 punto</strong> al rival ({penaltyTarget === 'p1' ? p2?.displayName : p1?.displayName}).
                  </div>
                ) : (
                  <div>
                    ℹ️ Esta falta sumará <strong>{(targetCurrentFouls % 3) + 1}/3 faltas</strong>. Faltan {3 - ((targetCurrentFouls % 3) + 1)} falta(s) para que el rival reciba 1 punto.
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setShowFoulModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFoulSubmit}
                className="px-4 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
              >
                Registrar Falta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
