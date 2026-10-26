import { Match, Participant, Round } from '../../../types/tournament';
import { generateSingleElimination } from './singleElimination';

export interface DoubleEliminationResult {
  rounds: Round[];
  matches: Match[];
}

export function generateDoubleElimination(
  tournamentId: string,
  stageId: string,
  participants: Participant[],
  options: { grandFinalReset?: boolean } = { grandFinalReset: true }
): DoubleEliminationResult {
  // Use single elimination as the base for the Winners Bracket
  const winnersResult = generateSingleElimination(tournamentId, stageId, participants, { thirdPlaceMatch: false });
  const rounds: Round[] = [];
  const matches: Match[] = [];

  // Re-tag winners rounds
  for (const r of winnersResult.rounds) {
    rounds.push({
      ...r,
      bracket: 'winners',
      name: `WB - ${r.name}`,
    });
  }
  matches.push(...winnersResult.matches);

  // Generate Losers Bracket rounds (simplified & robust for tournament flow)
  const wbRoundsCount = winnersResult.rounds.length;
  const lbRoundsCount = Math.max(1, (wbRoundsCount - 1) * 2);

  for (let r = 1; r <= lbRoundsCount; r++) {
    const lbRoundId = `${stageId}_lb_r_${r}`;
    rounds.push({
      id: lbRoundId,
      stageId,
      number: r,
      bracket: 'losers',
      name: `LB - Ronda ${r}`,
    });

    const matchCount = Math.max(1, Math.floor(participants.length / Math.pow(2, Math.floor((r + 1) / 2) + 1)));
    for (let m = 0; m < matchCount; m++) {
      matches.push({
        id: `${stageId}_lb_m_r${r}_p${m + 1}`,
        tournamentId,
        stageId,
        roundId: lbRoundId,
        position: m + 1,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
        isDraw: false,
        isBye: false,
        score1: 0,
        score2: 0,
        sets1: 0,
        sets2: 0,
        status: 'pending',
        refereeId: null,
        nextMatchWinnerId: null,
        nextMatchLoserId: null,
        version: 1,
      });
    }
  }

  // Grand Finals
  const gfRoundId = `${stageId}_gf_round`;
  rounds.push({
    id: gfRoundId,
    stageId,
    number: 1,
    bracket: 'grand_final',
    name: 'Gran Final',
  });

  const gfMatch: Match = {
    id: `${stageId}_gf_match`,
    tournamentId,
    stageId,
    roundId: gfRoundId,
    position: 1,
    participant1Id: null, // Winner of WB
    participant2Id: null, // Winner of LB
    winnerId: null,
    isDraw: false,
    isBye: false,
    score1: 0,
    score2: 0,
    sets1: 0,
    sets2: 0,
    status: 'pending',
    refereeId: null,
    nextMatchWinnerId: null,
    nextMatchLoserId: null,
    version: 1,
  };
  matches.push(gfMatch);

  // Optional Grand Finals Reset
  if (options.grandFinalReset) {
    const gfResetMatch: Match = {
      id: `${stageId}_gf_reset_match`,
      tournamentId,
      stageId,
      roundId: gfRoundId,
      position: 2,
      participant1Id: null,
      participant2Id: null,
      winnerId: null,
      isDraw: false,
      isBye: false,
      score1: 0,
      score2: 0,
      sets1: 0,
      sets2: 0,
      status: 'pending',
      refereeId: null,
      nextMatchWinnerId: null,
      nextMatchLoserId: null,
      version: 1,
    };
    matches.push(gfResetMatch);
  }

  return { rounds, matches };
}
