import {
  Group,
  GroupStandingRow,
  Match,
  Participant,
  Round,
  Stage,
} from '../../types/tournament';
import { generateSingleElimination } from './formats/singleElimination';
import { generateDoubleElimination } from './formats/doubleElimination';
import { generateSwiss } from './formats/swiss';
import { generateRoundRobin } from './formats/roundRobin';
import { computeStandings, type MatchPointTotals } from './tiebreakers';
import { createEntityId } from '../storage/entityIds';

export interface AdvanceStageResult {
  nextStage: Stage;
  nextRounds: Round[];
  nextMatches: Match[];
  qualifiers: Participant[];
}

interface TransitionOptions {
  destination?: Stage;
  pointsToWin?: number;
  bestOf?: number;
  thirdPlaceMatch?: boolean;
  name?: string;
  getMatchPoints?: MatchPointTotals;
}

function createQualifiedStage(current: Stage, qualifiers: Participant[], options: TransitionOptions): AdvanceStageResult {
  if (qualifiers.length < 2) throw new Error('Se requieren al menos dos clasificados.');
  const configured = options.destination;
  if (configured && (configured.status !== 'pending' || configured.tournamentId !== current.tournamentId)) {
    throw new Error('La siguiente etapa debe estar pendiente en este torneo.');
  }
  const nextStage: Stage = configured ? { ...configured, status: 'in_progress' } : {
    id: createEntityId(), tournamentId: current.tournamentId, position: current.position + 1,
    name: options.name || 'Fase Final (Eliminación Directa)', type: 'single_elimination',
    status: 'in_progress', matchType: current.matchType, pointsToWin: options.pointsToWin || 7,
    bestOf: options.bestOf ?? 3, config: { tiebreakers: ['points', 'point_diff', 'seed'], thirdPlaceMatch: options.thirdPlaceMatch !== false },
  };
  const args = [current.tournamentId, nextStage.id, qualifiers] as const;
  let schedule;
  switch (nextStage.type) {
    case 'single_elimination': schedule = generateSingleElimination(...args, nextStage.config); break;
    case 'double_elimination': schedule = generateDoubleElimination(...args, nextStage.config); break;
    case 'round_robin': schedule = generateRoundRobin(...args); break;
    case 'swiss':
      nextStage.config = { pointsPerMatchWin: 1, pointsPerBye: 1, pointsPerMatchDraw: 0, ...nextStage.config };
      schedule = generateSwiss(...args, { scoring: nextStage.config });
      break;
    default: throw new Error('Selecciona un formato final compatible antes de avanzar.');
  }
  return { nextStage, nextRounds: schedule.rounds, nextMatches: schedule.matches, qualifiers };
}

export function advanceSwissStageToPlayoffs(
  tournamentId: string,
  currentStage: Stage,
  allMatches: Match[],
  allParticipants: Participant[],
  nextStageConfig: TransitionOptions = {}
): AdvanceStageResult {
  const stageMatches = allMatches.filter((match) => match.stageId === currentStage.id);
  if (stageMatches.some((match) => match.status !== 'completed')) {
    throw new Error('No se puede avanzar desde Swiss mientras existan matches pendientes.');
  }

  const advanceCount = Math.max(2, currentStage.config.advanceCount || 2);
  const standings = computeStandings(
    stageMatches,
    allParticipants,
    currentStage.config.tiebreakers,
    advanceCount,
    currentStage.config,
    nextStageConfig.getMatchPoints
  );
  const qualified = standings
    .filter((row) => row.advances)
    .map((row, index) => ({ ...row.participant, seed: index + 1 }));

  if (qualified.length < 2) {
    throw new Error('Swiss debe clasificar al menos a 2 participantes para crear playoffs.');
  }

  return createQualifiedStage(currentStage, qualified, nextStageConfig);
}

/**
 * Calculates qualified bladers from a Group Stage and generates the subsequent Single Elimination bracket.
 * Cross-seeds group winners against second places (A1 vs B2, B1 vs A2, C1 vs D2, D1 vs C2...).
 */
export function advanceGroupStageToPlayoffs(
  tournamentId: string,
  currentStage: Stage,
  groups: Group[],
  allMatches: Match[],
  allParticipants: Participant[],
  nextStageConfig: TransitionOptions = {}
): AdvanceStageResult {
  const stageMatches = allMatches.filter(match => match.stageId === currentStage.id);
  if (!stageMatches.length || stageMatches.some(match => match.status !== 'completed')) {
    throw new Error('Completa todos los combates de grupos antes de avanzar.');
  }
  const advanceCount = currentStage.config.advanceCount || 2;

  // Compute standings for each group
  const groupStandings: { group: Group; standings: GroupStandingRow[] }[] = [];

  for (const group of groups) {
    const groupParticipants = allParticipants.filter(p => group.participantIds.includes(p.id));
    const groupMatches = allMatches.filter(m => m.groupId === group.id);
    const standings = computeStandings(
      groupMatches,
      groupParticipants,
      currentStage.config.tiebreakers,
      advanceCount,
      currentStage.config,
      nextStageConfig.getMatchPoints
    );
    groupStandings.push({ group, standings });
  }

  // Cross-seeding: 1st of Group A vs 2nd of Group B, etc.
  // Sort qualifiers by rank (all 1st places, then all 2nd places...)
  const seededQualifiers: Participant[] = [];
  const groupCount = groups.length;

  for (let rank = 1; rank <= advanceCount; rank++) {
    for (let g = 0; g < groupCount; g++) {
      const row = groupStandings[g].standings.find(s => s.rank === rank);
      if (row) {
        seededQualifiers.push(row.participant);
      }
    }
  }

  const qualifiers = seededQualifiers.map((p, i) => ({ ...p, seed: i + 1 }));
  return createQualifiedStage(currentStage, qualifiers, nextStageConfig);
}

export function getAdvancementSlot(
  sourceMatch: Match,
  targetMatch: Match,
  sourceType: 'winner' | 'loser',
  rounds: Round[] = []
): 0 | 1 {
  const sourceRound = rounds.find((round) => round.id === sourceMatch.roundId);
  const targetRound = rounds.find((round) => round.id === targetMatch.roundId);
  if (targetRound?.bracket === 'grand_final') {
    return sourceRound?.bracket === 'winners' ? 0 : 1;
  }
  const lastLosersRoundNumber = rounds
    .filter((round) => round.bracket === 'losers')
    .reduce((max, round) => Math.max(max, round.number), 0);
  if (
    sourceType === 'loser' &&
    sourceRound?.bracket === 'winners' &&
    targetRound?.bracket === 'losers' &&
    targetRound.number === lastLosersRoundNumber
  ) {
    return 1;
  }
  return ((sourceMatch.position - 1) % 2) === 0 ? 0 : 1;
}

