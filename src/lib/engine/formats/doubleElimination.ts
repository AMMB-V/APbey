import { Match, Participant, Round } from '../../../types/tournament';
import { generateSingleElimination } from './singleElimination';
import { createEntityId } from '../../storage/entityIds';

export interface DoubleEliminationResult {
  rounds: Round[];
  matches: Match[];
}

export function generateDoubleElimination(
  tournamentId: string,
  stageId: string,
  participants: Participant[],
  { grandFinalReset = true }: { grandFinalReset?: boolean } = {}
): DoubleEliminationResult {
  // Use single elimination as the base for the Winners Bracket
  const winnersResult = generateSingleElimination(tournamentId, stageId, participants, { thirdPlaceMatch: false });
  const rounds: Round[] = [];
  const matches: Match[] = [];
  const newId = () => createEntityId();

  // Re-tag winners rounds
  for (const r of winnersResult.rounds) {
    rounds.push({
      ...r,
      bracket: 'winners',
      name: `WB - ${r.name}`,
    });
  }
  matches.push(...winnersResult.matches);

  // Generate the standard alternating losers bracket:
  // odd rounds receive losers from the winners bracket, while even rounds
  // consolidate the previous losers round.
  const wbRoundsCount = winnersResult.rounds.length;
  const lbRoundsCount = Math.max(1, (wbRoundsCount - 1) * 2);
  const winnersRoundMatches = new Map<number, Match[]>();
  const losersRoundMatches = new Map<number, Match[]>();

  for (const round of winnersResult.rounds) {
    winnersRoundMatches.set(
      round.number,
      winnersResult.matches.filter((match) => match.roundId === round.id)
    );
  }

  for (let r = 1; r <= lbRoundsCount; r++) {
    const lbRoundId = newId();
    rounds.push({
      id: lbRoundId,
      stageId,
      number: r,
      bracket: 'losers',
      name: `LB - Ronda ${r}`,
    });

    const matchCount = Math.max(
      1,
      Math.floor((Math.pow(2, wbRoundsCount - 1)) / Math.pow(2, Math.ceil(r / 2)))
    );
    const roundMatches: Match[] = [];
    for (let m = 0; m < matchCount; m++) {
      roundMatches.push({
        id: newId(),
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
    losersRoundMatches.set(r, roundMatches);
    matches.push(...roundMatches);
  }

  // Winners of the losers bracket advance through its alternating rounds.
  for (let r = 1; r < lbRoundsCount; r++) {
    const currentMatches = losersRoundMatches.get(r) || [];
    const nextMatches = losersRoundMatches.get(r + 1) || [];
    for (let index = 0; index < currentMatches.length; index++) {
      const nextIndex = r % 2 === 1 ? index : Math.floor(index / 2);
      currentMatches[index].nextMatchWinnerId = nextMatches[nextIndex]?.id || null;
    }
  }

  // Every winners-bracket loss enters the appropriate odd losers round.
  // The winners-bracket final feeds the last losers round directly.
  for (let wbRound = 1; wbRound <= wbRoundsCount; wbRound++) {
    const currentMatches = winnersRoundMatches.get(wbRound) || [];
    const targetRound = wbRound === wbRoundsCount ? lbRoundsCount : (wbRound * 2) - 1;
    const targetMatches = losersRoundMatches.get(targetRound) || [];
    for (let index = 0; index < currentMatches.length; index++) {
      currentMatches[index].nextMatchLoserId = targetMatches[
        wbRound === wbRoundsCount ? 0 : Math.floor(index / 2)
      ]?.id || null;
    }
  }

  // Grand Finals
  const gfRoundId = newId();
  rounds.push({
    id: gfRoundId,
    stageId,
    number: 1,
    bracket: 'grand_final',
    name: 'Gran Final',
  });

  const gfMatch: Match = {
    id: newId(),
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

  const winnersFinal = winnersRoundMatches.get(wbRoundsCount)?.[0];
  const losersFinal = losersRoundMatches.get(lbRoundsCount)?.[0];
  if (winnersFinal) winnersFinal.nextMatchWinnerId = gfMatch.id;
  if (losersFinal) losersFinal.nextMatchWinnerId = gfMatch.id;

  // Optional Grand Finals Reset
  if (grandFinalReset) {
    const gfResetMatch: Match = {
      id: newId(),
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
