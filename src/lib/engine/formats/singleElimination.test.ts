import { describe, expect, it } from 'vitest';
import { generateSingleElimination } from './singleElimination';
import { Participant } from '../../../types/tournament';

function participant(id: string, seed: number): Participant {
  return {
    id,
    tournamentId: 'tournament-1',
    displayName: `Blader ${seed}`,
    seed,
    checkedIn: true,
    inspected: true,
    status: 'registered',
  };
}

describe('generateSingleElimination', () => {
  it('creates a complete power-of-two bracket and links winners', () => {
    const result = generateSingleElimination(
      'tournament-1',
      'stage-1',
      [participant('p1', 1), participant('p2', 2), participant('p3', 3)]
    );

    expect(result.rounds).toHaveLength(2);
    expect(result.matches).toHaveLength(3);
    expect(result.matches.filter((match) => match.isBye)).toHaveLength(1);

    const firstRound = result.matches.filter((match) => match.roundId === 'stage-1_r_1');
    const final = result.matches.find((match) => match.roundId === 'stage-1_r_2');
    expect(firstRound.every((match) => match.nextMatchWinnerId === final?.id)).toBe(true);
    expect([final?.participant1Id, final?.participant2Id]).toContain('p1');
    expect([final?.participant1Id, final?.participant2Id]).toContain(null);
  });

  it('adds an optional third-place match without changing the final bracket', () => {
    const result = generateSingleElimination(
      'tournament-1',
      'stage-1',
      [participant('p1', 1), participant('p2', 2), participant('p3', 3), participant('p4', 4)],
      { thirdPlaceMatch: true }
    );

    expect(result.rounds.some((round) => round.name === 'Tercer Lugar')).toBe(true);
    expect(result.matches.some((match) => match.id.includes('_3rd'))).toBe(true);
  });

  it('propagates byes through later rounds for non-power-of-two brackets', () => {
    const result = generateSingleElimination(
      'tournament-1',
      'stage-1',
      [1, 2, 3, 4, 5].map((seed) => participant(`p${seed}`, seed))
    );

    const roundTwo = result.matches.filter((match) => match.roundId === 'stage-1_r_2');
    const roundThree = result.matches.filter((match) => match.roundId === 'stage-1_r_3');

    expect(roundTwo.some((match) => match.participant1Id === 'p1')).toBe(true);
    expect(roundTwo.some((match) => match.participant1Id === 'p2' || match.participant2Id === 'p2')).toBe(true);
    expect(roundThree.every((match) => match.status === 'pending')).toBe(true);
  });
});
