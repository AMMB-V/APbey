import { describe, expect, it } from 'vitest';
import { generateDoubleElimination } from './doubleElimination';
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

describe('generateDoubleElimination', () => {
  it('connects winners and losers brackets for a full eight-player bracket', () => {
    const result = generateDoubleElimination(
      'tournament-1',
      'stage-1',
      Array.from({ length: 8 }, (_, index) => participant(`p${index + 1}`, index + 1))
    );

    const winnersRounds = result.rounds.filter((round) => round.bracket === 'winners');
    const losersRounds = result.rounds.filter((round) => round.bracket === 'losers');
    const winnersMatches = result.matches.filter((match) =>
      winnersRounds.some((round) => round.id === match.roundId)
    );
    const losersMatches = result.matches.filter((match) =>
      losersRounds.some((round) => round.id === match.roundId)
    );

    expect(winnersRounds).toHaveLength(3);
    expect(losersRounds).toHaveLength(4);
    expect(losersMatches).toHaveLength(6);
    expect(winnersMatches.filter((match) => match.nextMatchLoserId)).toHaveLength(7);
    const lastLosersRoundId = losersRounds[losersRounds.length - 1]?.id;
    expect(losersMatches.every((match) => match.nextMatchWinnerId || match.roundId === lastLosersRoundId)).toBe(true);

    const grandFinal = result.matches.find((match) => match.position === 1 && match.roundId ===
      result.rounds.find((round) => round.bracket === 'grand_final')?.id);
    expect(grandFinal).toBeDefined();
    expect(winnersMatches.find((match) => match.nextMatchWinnerId === grandFinal?.id)).toBeDefined();
    expect(losersMatches.find((match) => match.nextMatchWinnerId === grandFinal?.id)).toBeDefined();
  });

  it('creates a reset match only when requested', () => {
    const participants = [1, 2, 3, 4].map((seed) => participant(`p${seed}`, seed));
    const withoutReset = generateDoubleElimination('tournament-1', 'stage-1', participants, {
      grandFinalReset: false,
    });
    const withReset = generateDoubleElimination('tournament-1', 'stage-1', participants, {
      grandFinalReset: true,
    });

    const withoutResetFinalRoundId = withoutReset.rounds[withoutReset.rounds.length - 1]?.id;
    const withResetFinalRoundId = withReset.rounds[withReset.rounds.length - 1]?.id;
    expect(withoutReset.matches.filter((match) => match.roundId === withoutResetFinalRoundId)).toHaveLength(1);
    expect(withReset.matches.filter((match) => match.roundId === withResetFinalRoundId)).toHaveLength(2);
  });
});
