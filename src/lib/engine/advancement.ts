import {
  Group,
  GroupStandingRow,
  Match,
  Participant,
  Round,
  Stage,
} from '../../types/tournament';
import { generateSingleElimination } from './formats/singleElimination';
import { computeStandings } from './tiebreakers';

export interface AdvanceStageResult {
  nextStage: Stage;
  nextRounds: Round[];
  nextMatches: Match[];
  qualifiers: Participant[];
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
  nextStageConfig: {
    pointsToWin?: number;
    bestOf?: number;
    thirdPlaceMatch?: boolean;
    name?: string;
  } = {}
): AdvanceStageResult {
  const qualifiers: Participant[] = [];
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
      advanceCount
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

  // Assign clean seeds for the playoff bracket
  // E.g. for 4 groups with 2 advancing (8 players):
  // Seed 1: A1, Seed 2: B1, Seed 3: C1, Seed 4: D1
  // Seed 5: D2, Seed 6: C2, Seed 7: B2, Seed 8: A2 (inversion prevents same-group rematch until finals)
  const finalPlayoffParticipants: Participant[] = [];
  let seedCounter = 1;

  // Winners
  for (let g = 0; g < groupCount; g++) {
    const p = groupStandings[g].standings.find(s => s.rank === 1)?.participant;
    if (p) {
      finalPlayoffParticipants.push({ ...p, seed: seedCounter++ });
    }
  }

  // Second places reversed to avoid early group rematches
  for (let g = groupCount - 1; g >= 0; g--) {
    const p = groupStandings[g].standings.find(s => s.rank === 2)?.participant;
    if (p) {
      finalPlayoffParticipants.push({ ...p, seed: seedCounter++ });
    }
  }

  // If more than 2 advance, add rest
  if (advanceCount > 2) {
    for (let rank = 3; rank <= advanceCount; rank++) {
      for (let g = 0; g < groupCount; g++) {
        const p = groupStandings[g].standings.find(s => s.rank === rank)?.participant;
        if (p) {
          finalPlayoffParticipants.push({ ...p, seed: seedCounter++ });
        }
      }
    }
  }

  qualifiers.push(...finalPlayoffParticipants);

  // Next stage object
  const nextStageId = `stage_playoffs_${Date.now()}`;
  const nextStage: Stage = {
    id: nextStageId,
    tournamentId,
    position: currentStage.position + 1,
    name: nextStageConfig.name || 'Fase Final (Eliminación Directa)',
    type: 'single_elimination',
    status: 'in_progress',
    matchType: currentStage.matchType,
    pointsToWin: nextStageConfig.pointsToWin || 7, // Standard 7 pts for finals
    bestOf: nextStageConfig.bestOf || 1,           // default best_of = 1
    config: {
      tiebreakers: ['points', 'point_diff', 'seed'],
      thirdPlaceMatch: nextStageConfig.thirdPlaceMatch !== false,
    },
  };

  const { rounds, matches } = generateSingleElimination(
    tournamentId,
    nextStageId,
    finalPlayoffParticipants,
    { thirdPlaceMatch: nextStage.config.thirdPlaceMatch }
  );

  return {
    nextStage,
    nextRounds: rounds,
    nextMatches: matches,
    qualifiers: finalPlayoffParticipants,
  };
}
