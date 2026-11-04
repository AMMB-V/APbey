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
  const pairedIds = new Set<string>();
  const scoreGroups = new Map<number, Participant[]>();
  for (const standing of standings) {
    const group = scoreGroups.get(standing.points) || [];
    group.push(standing.participant);
    scoreGroups.set(standing.points, group);
  }
  const groupedParticipants = [...scoreGroups.entries()]
    .sort(([left], [right]) => right - left)
    .flatMap(([, group]) => group);

  for (let i = 0; i < groupedParticipants.length; i++) {
    const p1 = groupedParticipants[i];
    if (pairedIds.has(p1.id)) continue;
    let opponent: Participant | null = null;
    for (let j = i + 1; j < groupedParticipants.length; j++) {
      const candidate = groupedParticipants[j];
      if (pairedIds.has(candidate.id)) continue;
      if (!playedPairs.has(`${p1.id}_${candidate.id}`)) {
        opponent = candidate;
        break;
      }
    }
    if (!opponent) {
      for (let j = i + 1; j < groupedParticipants.length; j++) {
        const candidate = groupedParticipants[j];
        if (!pairedIds.has(candidate.id)) {
          opponent = candidate;
          break;
        }
      }
    }
    if (opponent) {
      pairedIds.add(p1.id);
      pairedIds.add(opponent.id);

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
