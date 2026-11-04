import { describe, expect, it } from 'vitest';
import { generateNextSwissRound, generateSwiss } from './swiss';
import { Match, Participant } from '../../../types/tournament';

const participants: Participant[] = [1, 2, 3, 4].map((seed) => ({
  id: `p${seed}`,
  tournamentId: 't1',
  displayName: `Player ${seed}`,
  seed,
  checkedIn: true,
  inspected: true,
  status: 'active',
}));

describe('Swiss round generation', () => {
  it('generates later rounds only after the previous round is complete', () => {
    const first = generateSwiss('t1', 's1', participants);
    expect(() => generateNextSwissRound('t1', 's1', first.rounds, participants, first.matches))
      .toThrow('matches pendientes');
  });

  it('avoids rematches when a valid pairing exists', () => {
    const first = generateSwiss('t1', 's1', participants);
    const completed: Match[] = first.matches.map((match, index) => ({
      ...match,
      status: 'completed',
      winnerId: index % 2 === 0 ? match.participant1Id : match.participant2Id,
      score1: index % 2 === 0 ? 4 : 0,
      score2: index % 2 === 0 ? 0 : 4,
    }));
    const next = generateNextSwissRound('t1', 's1', first.rounds, participants, completed);
    const previousPairs = new Set(completed.map((match) => [match.participant1Id, match.participant2Id].sort().join(':')));
    expect(next.matches.filter((match) => !match.isBye).every((match) =>
      !previousPairs.has([match.participant1Id, match.participant2Id].sort().join(':'))
    )).toBe(true);
  });
});
