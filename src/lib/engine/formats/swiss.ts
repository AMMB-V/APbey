import { Match, Participant, Round, StandingsScoringConfig, TiebreakerCriteria } from '../../../types/tournament';
import { computeStandings, type MatchPointTotals } from '../tiebreakers';
import { createEntityId } from '../../storage/entityIds';

export const swissScoringDefaults: StandingsScoringConfig = {
  pointsPerMatchWin: 1,
  pointsPerBye: 1,
  pointsPerMatchDraw: 0,
};

export interface SwissRoundResult {
  round: Round;
  matches: Match[];
}

export function assignSwissRoundResources(
  matches: Match[],
  stationCount = 1,
  refereeIds: string[] = [],
): Match[] {
  const tables = Math.max(1, Math.floor(stationCount));
  const officials = [...new Set(refereeIds.filter(Boolean))];
  let scheduledIndex = 0;
  return matches.map((match) => {
    if (match.isBye) return match;
    const index = scheduledIndex++;
    return {
      ...match,
      station: `Mesa ${(index % tables) + 1}`,
      refereeId: officials.length ? officials[index % officials.length] : null,
    };
  });
}

export function generateSwissRound(
  tournamentId: string,
  stageId: string,
  roundNumber: number,
  participants: Participant[],
  previousMatches: Match[],
  options: {
    tiebreakers?: TiebreakerCriteria[];
    scoring?: StandingsScoringConfig;
    getMatchPoints?: MatchPointTotals;
    randomFn?: () => number;
    stationCount?: number;
    refereeIds?: string[];
  } = {}
): SwissRoundResult {
  const roundId = createEntityId();
  const round: Round = {
    id: roundId,
    stageId,
    number: roundNumber,
    bracket: 'swiss',
    name: `Ronda Suiza ${roundNumber}`,
  };

  // Ronda 1: Sorteo aleatorio inicial de emparejamientos
  if (roundNumber === 1 || previousMatches.length === 0) {
    const rng = options.randomFn || Math.random;
    const pool = [...participants];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const matches: Match[] = [];
    let position = 1;

    // Si el número de participantes es impar, un blader recibe BYE
    if (pool.length % 2 !== 0) {
      const byeBlader = pool.pop()!;
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

    for (let i = 0; i < pool.length; i += 2) {
      matches.push({
        id: createEntityId(),
        tournamentId,
        stageId,
        roundId,
        position: position++,
        participant1Id: pool[i].id,
        participant2Id: pool[i + 1].id,
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

    return { round, matches: assignSwissRoundResources(matches, options.stationCount, options.refereeIds) };
  }

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

  // Get current standings to pair by record (Wins / Points descending, tiebroken by Buchholz -> H2H -> PointDiff)
  const standings = computeStandings(
    previousMatches,
    participants,
    options.tiebreakers || ['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed'],
    2,
    { ...swissScoringDefaults, ...options.scoring },
    options.getMatchPoints
  );
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
  const standingRanks = new Map(standings.map((standing, idx) => [standing.participant.id, idx + 1]));

  const findPairing = (unpaired: Participant[], avoidRematches: boolean): [Participant, Participant][] | null => {
    if (unpaired.length === 0) return [];
    const first = unpaired[0];
    const candidates = unpaired
      .slice(1)
      .filter((candidate) => !avoidRematches || !playedPairs.has(`${first.id}_${candidate.id}`))
      .sort((left, right) => {
        const leftDelta = Math.abs((standingPoints.get(first.id) || 0) - (standingPoints.get(left.id) || 0));
        const rightDelta = Math.abs((standingPoints.get(first.id) || 0) - (standingPoints.get(right.id) || 0));
        if (leftDelta !== rightDelta) return leftDelta - rightDelta;
        const rankDeltaLeft = Math.abs((standingRanks.get(first.id) || 0) - (standingRanks.get(left.id) || 0));
        const rankDeltaRight = Math.abs((standingRanks.get(first.id) || 0) - (standingRanks.get(right.id) || 0));
        return rankDeltaLeft - rankDeltaRight || (left.seed - right.seed);
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

  return { round, matches: assignSwissRoundResources(matches, options.stationCount, options.refereeIds) };
}

export function generateSwiss(
  tournamentId: string,
  stageId: string,
  participants: Participant[],
  options?: {
    tiebreakers?: TiebreakerCriteria[];
    scoring?: StandingsScoringConfig;
    getMatchPoints?: MatchPointTotals;
    randomFn?: () => number;
    stationCount?: number;
    refereeIds?: string[];
  }
): { rounds: Round[]; matches: Match[] } {
  const round1 = generateSwissRound(tournamentId, stageId, 1, participants, [], options);
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
  previousMatches: Match[],
  options?: {
    tiebreakers?: TiebreakerCriteria[];
    scoring?: StandingsScoringConfig;
    getMatchPoints?: MatchPointTotals;
    randomFn?: () => number;
    stationCount?: number;
    refereeIds?: string[];
  }
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
    previousMatches.filter((match) => match.stageId === stageId),
    options
  );
}
