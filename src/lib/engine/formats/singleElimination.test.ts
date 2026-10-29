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

    const firstRoundId = result.rounds.find((round) => round.number === 1)?.id;
    const finalRoundId = result.rounds.find((round) => round.number === 2)?.id;
    const firstRound = result.matches.filter((match) => match.roundId === firstRoundId);
    const final = result.matches.find((match) => match.roundId === finalRoundId);
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
    const thirdPlaceRoundId = result.rounds.find((round) => round.name === 'Tercer Lugar')?.id;
    expect(result.matches.some((match) => match.roundId === thirdPlaceRoundId)).toBe(true);
  });

  it('propagates byes through later rounds for non-power-of-two brackets', () => {
    const result = generateSingleElimination(
      'tournament-1',
      'stage-1',
      [1, 2, 3, 4, 5].map((seed) => participant(`p${seed}`, seed))
    );

    const roundTwoId = result.rounds.find((round) => round.number === 2)?.id;
    const roundThreeId = result.rounds.find((round) => round.number === 3)?.id;
    const roundTwo = result.matches.filter((match) => match.roundId === roundTwoId);
    const roundThree = result.matches.filter((match) => match.roundId === roundThreeId);

    expect(roundTwo.some((match) => match.participant1Id === 'p1')).toBe(true);
    expect(roundTwo.some((match) => match.participant1Id === 'p2' || match.participant2Id === 'p2')).toBe(true);
    expect(roundThree.every((match) => match.status === 'pending')).toBe(true);
  });
});
