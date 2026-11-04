import { describe, expect, it } from 'vitest';
import { generateRoundRobin } from './roundRobin';
import { Participant } from '../../../types/tournament';

const participants: Participant[] = [1, 2, 3].map((seed) => ({
  id: `p${seed}`,
  tournamentId: 'tournament-1',
  displayName: `Blader ${seed}`,
  seed,
  checkedIn: true,
  inspected: true,
  status: 'active',
}));

describe('generateRoundRobin', () => {
  it('does not persist dummy byes as matches', () => {
    const result = generateRoundRobin('tournament-1', 'stage-1', participants);
    expect(result.matches).toHaveLength(3);
    expect(result.matches.every((match) => !match.isBye)).toBe(true);
    expect(result.matches.every((match) => match.participant1Id && match.participant2Id)).toBe(true);
  });
});
