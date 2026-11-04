import { Match, Participant, Round } from '../../../types/tournament';
import { computeStandings } from '../tiebreakers';
import { createEntityId } from '../../storage/entityIds';

export interface SwissRoundResult {
  round: Round;
  matches: Match[];
}

export function generateSwissRound(
  tournamentId: string,
  stageId: string,
  roundNumber: number,
  participants: Participant[],
  previousMatches: Match[]
): SwissRoundResult {
  const roundId = createEntityId();
  const round: Round = {
    id: roundId,
    stageId,
    number: roundNumber,
    bracket: 'swiss',
    name: `Ronda Suiza ${roundNumber}`,
  };

  // Find pairings that have already occurred
  const playedPairs = new Set<string>();
  const receivedByes = new Set<string>();

  for (const m of previousMatches) {
    if (m.isBye && m.winnerId) {
      receivedByes.add(m.winnerId);
    }
    if (m.participant1Id && m.participant2Id) {
      const key1 = `${m.participant1Id}_${m.participant2Id}`;
      const key2 = `${m.participant2Id}_${m.participant1Id}`;
      playedPairs.add(key1);
      playedPairs.add(key2);
    }
  }

  // Get current standings to pair by record
  const standings = computeStandings(previousMatches, participants, ['points', 'median_buchholz', 'point_diff', 'seed']);
  const availableParticipants = standings.map((s) => s.participant);

  const matches: Match[] = [];
  let position = 1;

  // If odd count, award bye to the lowest ranked player who hasn't had one yet
  if (availableParticipants.length % 2 !== 0) {
    let byeCandidateIndex = availableParticipants.length - 1;
    while (byeCandidateIndex >= 0 && receivedByes.has(availableParticipants[byeCandidateIndex].id)) {
      byeCandidateIndex--;
    }
    if (byeCandidateIndex < 0) byeCandidateIndex = availableParticipants.length - 1;

    const byeBlader = availableParticipants.splice(byeCandidateIndex, 1)[0];
    matches.push({
      id: createEntityId(),
      tournamentId,
      stageId,
      roundId,
      position: position++,
      participant1Id: byeBlader.id,
      participant2Id: null,
      winnerId: byeBlader.id,
      isDraw: false,
      isBye: true,
      score1: 0,
      score2: 0,
      sets1: 0,
      sets2: 0,
      status: 'completed',
      refereeId: null,
      nextMatchWinnerId: null,
      nextMatchLoserId: null,
      version: 1,
    });
  }

  // Pair within identical score groups first, with deterministic float-downs only
  // when a score group has an odd number of players.
  const byeId = matches.find((match) => match.isBye)?.participant1Id;
  const remainingParticipants = standings
    .map((standing) => standing.participant)
    .filter((participant) => participant.id !== byeId);
  const standingPoints = new Map(standings.map((standing) => [standing.participant.id, standing.points]));

  const findPairing = (unpaired: Participant[], avoidRematches: boolean): [Participant, Participant][] | null => {
    if (unpaired.length === 0) return [];
    const first = unpaired[0];
    const candidates = unpaired
      .slice(1)
      .filter((candidate) => !avoidRematches || !playedPairs.has(`${first.id}_${candidate.id}`))
      .sort((left, right) => {
        const leftDelta = Math.abs((standingPoints.get(first.id) || 0) - (standingPoints.get(left.id) || 0));
        const rightDelta = Math.abs((standingPoints.get(first.id) || 0) - (standingPoints.get(right.id) || 0));
        return leftDelta - rightDelta || (left.seed - right.seed);
      });

    for (const opponent of candidates) {
      const rest = unpaired.filter((participant) => participant.id !== first.id && participant.id !== opponent.id);
      const pairing = findPairing(rest, avoidRematches);
      if (pairing) return [[first, opponent], ...pairing];
    }
    return null;
  };

  const pairing = findPairing(remainingParticipants, true) || findPairing(remainingParticipants, false);
  for (const [p1, opponent] of pairing || []) {
    matches.push({
        id: createEntityId(),
        tournamentId,
        stageId,
        roundId,
        position: position++,
        participant1Id: p1.id,
        participant2Id: opponent.id,
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

  return { round, matches };
}

export function generateSwiss(
  tournamentId: string,
  stageId: string,
  participants: Participant[],
  _options?: { roundsCount?: number }
): { rounds: Round[]; matches: Match[] } {
  const round1 = generateSwissRound(tournamentId, stageId, 1, participants, []);
  return {
    rounds: [round1.round],
    matches: round1.matches,
  };
}

export function generateNextSwissRound(
  tournamentId: string,
  stageId: string,
  previousRounds: Round[],
  participants: Participant[],
  previousMatches: Match[]
): SwissRoundResult {
  const nextRoundNumber = previousRounds
    .filter((round) => round.stageId === stageId && round.bracket === 'swiss')
    .reduce((highest, round) => Math.max(highest, round.number), 0) + 1;

  if (previousMatches.some((match) => match.stageId === stageId && match.status !== 'completed')) {
    throw new Error('No se puede generar la siguiente ronda Swiss mientras existan matches pendientes.');
  }

  return generateSwissRound(
    tournamentId,
    stageId,
    nextRoundNumber,
    participants,
    previousMatches.filter((match) => match.stageId === stageId)
  );
}
