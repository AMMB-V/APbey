import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Match, Participant, Round, Stage } from '../../types/tournament';
import { useTournament } from '../../context/TournamentContext';
import { MatchQueue, type QueueFilter } from './MatchQueue';
import { BracketConnections } from './BracketConnections';
import { swissScoringDefaults } from '../../lib/engine/formats/swiss';
import { computeStandings, matchPointTotals } from '../../lib/engine/tiebreakers';
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

type BracketFilter = 'all' | 'winners' | 'losers' | 'finals';

interface BracketViewerProps {
  stage: Stage;
  queueFilter?: QueueFilter;
  demo?: { matches: Match[]; rounds: Round[]; participants: Participant[] };
  onOpenMatchInReferee?: (matchId: string) => void;
}

export const BracketViewer: React.FC<BracketViewerProps> = ({
  stage,
  queueFilter,
  demo,
  onOpenMatchInReferee,
}) => {
  const {
    activeTournament,
    matches: tournamentMatches,
    rounds: tournamentRounds,
    participants: tournamentParticipants,
    currentRole,
    currentUser,
    users,
    assignReferee,
    assignStationToMatch,
    callMatchToStation,
    startStage,
    generateNextSwissRound, advanceCurrentStage, stages, battles, penalties,
  } = useTournament();

  const { matches, rounds, participants } = demo ?? {
    matches: tournamentMatches, rounds: tournamentRounds, participants: tournamentParticipants,
  };

  const scrollKey = `apbey-bracket-scroll-${stage.id}`;
  const [restored] = useState(() => {
    const saved = sessionStorage.getItem(scrollKey);
    return saved ? JSON.parse(saved) as { left: number; top: number; zoom: number; filter: BracketFilter; mineOnly: boolean } : null;
  });
  const [listView, setListView] = useState(Boolean(queueFilter));
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [routeTarget, setRouteTarget] = useState<string | null>(null);
  const [mineOnly, setMineOnly] = useState(restored?.mineOnly ?? false);
  const board = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState(restored?.zoom ?? 1);
  const [bracketFilter, setBracketFilter] = useState<BracketFilter>(restored?.filter ?? 'all');
  const [stationInput, setStationInput] = useState<string>('Estadio 1');

  // Filter rounds for this stage
  const allStageRounds = rounds
    .filter((r) => r.stageId === stage.id && (stage.type === 'round_robin' || r.bracket !== 'group'))
    .sort((a, b) => {
      const lane = (round: Round) => round.bracket === 'losers' ? 1 : round.bracket === 'grand_final' ? 2 : 0;
      return lane(a) - lane(b) || a.number - b.number;
    });

  // Apply bracket filter (Winners / Losers / Finals) if double elimination
  const stageRounds = allStageRounds.filter((r) => {
    if (stage.type !== 'double_elimination' || bracketFilter === 'all') return true;
    if (bracketFilter === 'finals') return r.bracket === 'grand_final';
    return r.bracket === bracketFilter;
  });

  const stageMatches = matches.filter((m) => m.stageId === stage.id);

  const roster = new Set(stageMatches.flatMap(m => [m.participant1Id, m.participant2Id]));
  const ranked = stage.type === 'swiss' || stage.type === 'round_robin';
  const showDirectResult = stage.config.tiebreakers?.includes('head_to_head');
  const standingsTitle = stage.status === 'completed' ? 'Clasificación final' : 'Clasificación provisional';
  const standings = ranked ? computeStandings(stageMatches, participants.filter(p => roster.has(p.id)),
    stage.config.tiebreakers, stage.config.advanceCount,
    stage.type === 'swiss' ? { ...swissScoringDefaults, ...stage.config } : stage.config,
    matchPointTotals(stageMatches, battles, penalties)) : [];
  const roundsRemaining = stage.type === 'swiss' && allStageRounds.length < (stage.config.swissRounds || 3);
  const hasNextStage = stages.some(s => s.tournamentId === stage.tournamentId && s.position > stage.position) ||
    (stage.position === 1 && stage.config.stageStructure === 'two_stage');
  const canManage = !demo && (currentRole === 'admin' ||
    (currentRole === 'organizer' && Boolean(currentUser && activeTournament?.organizerId === currentUser.id)));
  const canScore = (match: Match) => stage.status === 'in_progress' && match.status !== 'completed' &&
    (canManage || (currentRole === 'referee' && Boolean(currentUser && match.refereeId === currentUser.id)));
  const selectedMatch = stageMatches.find(match => match.id === selectedMatchId);
  const matchLabels = new Map(allStageRounds.flatMap((round, index) =>
    stageMatches.filter(match => match.roundId === round.id).map(match => [match.id, `R${index + 1}–C${match.position}`] as const)
  ));
  const visibleMatches = mineOnly ? stageMatches.filter(match => match.refereeId === currentUser?.id) : stageMatches;
  const hasLoserRoutes = stageMatches.some(match => match.nextMatchLoserId);
  const hasRoutes = hasLoserRoutes || stageMatches.some(match => match.nextMatchWinnerId);

  useEffect(() => {
    if (!routeTarget) return;
    const target = Array.from(board.current?.querySelectorAll<HTMLElement>('[data-bracket-match]') ?? [])
      .find(card => card.dataset.bracketMatch === routeTarget);
    target?.scrollIntoView({ block: 'nearest', inline: 'center' });
    target?.querySelector('button')?.focus({ preventScroll: true });
    setRouteTarget(null);
  }, [routeTarget, bracketFilter, mineOnly, listView]);

  useLayoutEffect(() => {
    const element = viewport.current;
    const saved = sessionStorage.getItem(scrollKey);
    if (!element || !saved || !allStageRounds.length) return;
    sessionStorage.removeItem(scrollKey);
    const { left, top } = JSON.parse(saved);
    element.scrollLeft = left;
    window.scrollTo(0, top);
  }, [scrollKey, allStageRounds.length]);

  function openMarker(matchId: string) {
    if (!onOpenMatchInReferee) return;
    sessionStorage.setItem(scrollKey, JSON.stringify({
      left: viewport.current?.scrollLeft ?? 0, top: window.scrollY, zoom: zoomLevel, filter: bracketFilter, mineOnly,
    }));
    onOpenMatchInReferee(matchId);
  }

  function openDetails(match: Match) {
    setSelectedMatchId(match.id);
    setStationInput(match.station || '');
  }

  function followRoute(id: string) {
    setListView(false);
    setMineOnly(false);
    setBracketFilter('all');
    setRouteTarget(id);
  }

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

  const handleGenerateSwissRound = () => {
    try {
      generateNextSwissRound(stage.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No se pudo generar la ronda Swiss.');
    }
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
                aria-pressed={tab === bracketFilter}
                className={`px-2.5 py-1 text-xs rounded-[var(--r-chip)] font-semibold transition-colors ${
                  bracketFilter === tab
                    ? 'bg-[var(--hueso)] text-[var(--tinta)] shadow-xs'
                    : 'text-[var(--acero)] hover:text-white'
                }`}
              >
                {tab === 'all'
                  ? 'Todos'
                  : tab === 'winners'
                  ? 'Ganadores'
                  : tab === 'losers'
                  ? 'Perdedores'
                  : 'Gran Final'}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AceroIcon id="i-trofeo" size="md" className="text-[var(--cobalto)]" />
            <h3 className="font-bold text-sm tracking-tight font-display">
              {stage.type === 'swiss' ? 'Sistema suizo' : stage.type === 'round_robin' ? 'Todos contra todos' : 'Cuadro eliminatorio'} · Al mejor de {stage.bestOf || 1}
            </h3>
          </div>
        )}

        {/* Right: Ergonomic Zoom Controls & Print Button */}
        <div className="flex items-center gap-2">
          {canManage && roundsRemaining && stage.status === 'in_progress' && (
            <button
              type="button"
              disabled={stageMatches.some(m => m.status !== 'completed')}
              onClick={handleGenerateSwissRound}
              className="acero-btn acero-btn--primary text-xs px-3 py-1.5"
            >
              Generar siguiente ronda Swiss
            </button>
          )}
          {canManage && ranked && hasNextStage && !roundsRemaining && stage.status === 'in_progress' && (
            <button className="acero-btn acero-btn--primary" disabled={!stageMatches.length || stageMatches.some(m => m.status !== 'completed')}
              onClick={() => { try { advanceCurrentStage(stage.id); } catch (e) { window.alert(e instanceof Error ? e.message : 'No se pudo avanzar.'); } }}>
              Avanzar a la siguiente etapa
            </button>
          )}
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] p-1 text-xs text-[var(--acero)]">
            <button
              onClick={() => handleZoom(-0.15)}
              className="p-1 hover:text-white hover:bg-[var(--chasis)] rounded"
              title="Reducir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1.5 min-w-[3.5rem] text-center font-bold text-[var(--hueso)]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.15)}
              className="p-1 hover:text-white hover:bg-[var(--chasis)] rounded"
              title="Aumentar zoom"
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
            className="acero-btn acero-btn--secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Imprimir cuadro de emparejamientos"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imprimir Cuadro</span>
          </button>
          {canManage && stage.status === 'pending' && (
            <button
              type="button"
              onClick={() => { try { startStage(stage.id); } catch (e) { window.alert(e instanceof Error ? e.message : 'No se pudo iniciar.'); } }}
              disabled={participants.filter((participant) => participant.tournamentId === stage.tournamentId).length < 2}
              className="acero-btn acero-btn--primary text-xs px-3 py-1.5 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generar la llave y habilitar el arbitraje"
            >
              <Radio className="w-3.5 h-3.5" />
              Iniciar etapa
            </button>
          )}
        </div>
      </div>

      {standings.length > 0 && (
        <div
          role="region"
          aria-label={standingsTitle}
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-[var(--r-card)] border border-[var(--costura)] bg-[var(--chasis)] focus-visible:outline-2 focus-visible:outline-[var(--cobalto-texto)]"
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <caption className="sticky left-0 w-max px-3 py-3 text-left text-base font-semibold">
              {standingsTitle}
            </caption>
            <thead className="bg-[var(--grafito)] text-xs text-[var(--acero)] [&_th]:border-y [&_th]:border-[var(--costura)] [&_th]:px-3 [&_th]:py-2.5">
              <tr>
                <th scope="col">Puesto</th>
                <th scope="col" className="sticky left-0 bg-[var(--grafito)] text-left">Blader</th>
                <th scope="col">Victorias</th>
                <th scope="col">Puntos</th>
                {stage.type === 'swiss' && <th scope="col">Buchholz medio</th>}
                {showDirectResult && <th scope="col">Directo</th>}
                <th scope="col">Diferencia</th>
              </tr>
            </thead>
            <tbody className="tabular-nums [&_td]:px-3 [&_td]:py-2.5 [&_td]:text-center [&_tr:not(:last-child)>*]:border-b [&_tr>*]:border-[var(--costura)]">
              {standings.map(row => (
                <tr key={row.participantId}>
                  <td className="text-[var(--acero)]">{row.rank}</td>
                  <th scope="row" className="sticky left-0 min-w-28 max-w-36 bg-[var(--chasis)] px-3 py-2.5 text-left font-medium [overflow-wrap:anywhere] sm:max-w-64">
                    {row.participant.displayName}
                  </th>
                  <td>{row.won}</td>
                  <td className="font-bold">{row.points}</td>
                  {stage.type === 'swiss' && <td>{row.medianBuchholz}</td>}
                  {showDirectResult && <td>{row.directWins ?? '—'}</td>}
                  <td>{row.pointDiff}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(hasRoutes || currentRole === 'referee') && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--acero)]">
          {hasRoutes && <>
            <span><span className="mr-2 inline-block w-6 align-middle border-t-2 border-[var(--cobalto-texto)]" />Avance del ganador</span>
            <span><span className="mr-2 inline-block w-6 align-middle border-t-2 border-dashed border-[var(--cobre)]" />Destino del perdedor</span>
          </>}
          {!demo && currentRole === 'referee' && <button type="button" aria-pressed={mineOnly}
            className="acero-btn acero-btn--secondary min-h-11" onClick={() => setMineOnly(!mineOnly)}>Mis combates</button>}
        </div>
      )}
      {mineOnly && visibleMatches.length === 0 && (
        <p className="text-sm text-[var(--acero)]">Todavía no tienes combates asignados en esta etapa.</p>
      )}
      <div className="flex flex-wrap gap-2" aria-label="Vista de combates">
        {([false, true] as const).map(list => <button key={String(list)} type="button" aria-pressed={listView === list}
          onClick={() => setListView(list)}
          className="min-h-11 rounded-xl border border-[var(--costura)] px-3 text-sm aria-pressed:bg-[var(--hueso)] aria-pressed:text-[var(--tinta)]">
          {list ? 'Lista' : 'Cuadro'}
        </button>)}
      </div>
      {visibleMatches.length > 0 && <MatchQueue key={`${stage.id}-${listView}`} initialFilter={listView ? queueFilter ?? "all" : "ready"} listView={listView} matches={visibleMatches} canManage={canManage}
        label={match => matchLabels.get(match.id)} playerName={id => getParticipant(id)?.displayName}
        onLocate={followRoute} onManage={openDetails} onOpen={onOpenMatchInReferee && openMarker}
        canScore={canScore} />}
      {!listView && hasRoutes && (
        <div aria-label="Leyenda de rutas" className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--hueso)]">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="w-6 border-t-2 border-[var(--cobalto-texto)]" /> Ruta del ganador
          </span>
          {hasLoserRoutes && <span className="flex items-center gap-2">
            <span aria-hidden="true" className="w-6 border-t-2 border-dashed border-[var(--cobre)]" /> Pasa a llave inferior
          </span>}
        </div>
      )}
      {/* Scalable Canvas with Zoom Transform */}
      <div hidden={listView} ref={viewport} className="overflow-x-auto overflow-y-hidden pb-8 pt-2 rounded-[var(--r-card)] bg-[var(--grafito)] border border-[var(--costura)] p-4">
        <div
          ref={board}
          className="relative flex gap-10 w-max min-w-full items-start px-4"
          style={{ zoom: zoomLevel }}
        >
          {hasRoutes && <BracketConnections board={board} matches={visibleMatches} highlightedMatchId={highlightedMatchId} />}
          {stageRounds.map((round) => {
            const roundMatches = visibleMatches
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
                    const p1IsWinner = Boolean(p1 && match.winnerId === p1.id);
                    const p2IsWinner = Boolean(p2 && match.winnerId === p2.id);
                    const ref = getReferee(match.refereeId);

                    return (
                      <div
                        key={match.id}
                        data-bracket-match={match.id}
                        onFocus={() => setHighlightedMatchId(match.id)}
                        className={`group relative rounded-[var(--r-control)] border bg-[var(--chasis)] p-3.5 shadow-xs transition-all focus-within:ring-1 focus-within:ring-[var(--hueso)] ${
                          isLive
                            ? 'border-[var(--en-vivo)]'
                            : isCompleted
                            ? 'border-[var(--costura)] hover:border-[var(--acero)]'
                            : 'border-dashed border-[var(--costura)] hover:border-[var(--acero)]'
                        }`}
                      >
                        {/* Match Status Bar */}
                        <div className="flex items-center justify-between text-[11px] mb-2 text-[var(--acero)]">
                          <button type="button" className="min-h-8 font-mono font-semibold text-[var(--hueso)] hover:underline"
                            aria-label={`Detalles del combate ${matchLabels.get(match.id)}`}
                            onClick={() => openDetails(match)}>
                            {matchLabels.get(match.id)}
                          </button>
                          <div className="flex items-center gap-1.5">
                            {match.station && (
                              <span className="text-[10px] font-bold text-[var(--hueso)] bg-[var(--grafito)] px-1.5 py-0.2 rounded font-mono">
                                {match.station}
                              </span>
                            )}
                            {isLive && (
                              <span className="font-bold text-[var(--en-vivo)] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--en-vivo)] animate-pulse" />
                                EN VIVO
                              </span>
                            )}
                            {isCompleted && !match.isBye && <span className="text-[var(--completado)]">Finalizado</span>}
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

                        {(match.nextMatchWinnerId || match.nextMatchLoserId) && (
                          <div className="mt-2 flex flex-wrap gap-x-3 text-xs">
                            {([[match.nextMatchWinnerId, 'Ganador', 'text-[var(--cobalto-texto)]'],
                               [match.nextMatchLoserId, 'Perdedor', 'text-[var(--cobre)]']] as const).map(([id, label, color]) =>
                              id && matchLabels.has(id) && <button key={label} type="button"
                                className={`min-h-8 font-semibold hover:underline ${color}`}
                                onClick={() => followRoute(id)}>{label} → {stageMatches.find(destination => destination.id === id)?.station || matchLabels.get(id)}</button>
                            )}
                          </div>
                        )}

                        {/* Action link to Referee */}
                        {onOpenMatchInReferee && !match.isBye && p1 && p2 && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--costura)] flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-[var(--acero)]">
                              {match.sets1 > 0 || match.sets2 > 0 ? `Sets: ${match.sets1}-${match.sets2}` : `Al mejor de ${stage.bestOf || 1}`}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openMarker(match.id);
                              }}
                              className="text-[var(--cobalto-texto)] hover:underline font-bold flex items-center gap-0.5"
                            >
                              {isCompleted ? 'Ver resultado' : canScore(match) ? 'Arbitrar' : 'Ver combate'} <ChevronRight className="w-3 h-3" />
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
                Combate {matchLabels.get(selectedMatch.id)}
              </h3>
              <button
                onClick={() => setSelectedMatchId(null)}
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

              {canManage && <>
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
                    onClick={() => assignStationToMatch(selectedMatch.id, stationInput.trim())}
                    className="acero-btn acero-btn--secondary text-xs px-3 py-1.5"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => {
                      assignStationToMatch(selectedMatch.id, stationInput.trim());
                      callMatchToStation(selectedMatch.id, stationInput.trim());
                      setSelectedMatchId(null);
                    }}
                    className="acero-btn acero-btn--primary text-xs px-3 py-1.5 flex items-center gap-1"
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
              </>}
            </div>

            <div className="pt-2 border-t border-[var(--costura)] flex items-center justify-end gap-2">
              {onOpenMatchInReferee && selectedMatch.participant1Id && selectedMatch.participant2Id && !selectedMatch.isBye && (
                <button
                  onClick={() => {
                    const mId = selectedMatch.id;
                    setSelectedMatchId(null);
                    openMarker(mId);
                  }}
                  className="acero-btn acero-btn--primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5" />
                  {canScore(selectedMatch) ? 'Abrir marcador para arbitrar' : 'Ver marcador'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
