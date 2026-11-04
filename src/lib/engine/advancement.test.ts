import { describe, expect, it } from 'vitest';
import { advanceSwissStageToPlayoffs } from './advancement';
import { Match, Participant, Stage } from '../../types/tournament';

const participants: Participant[] = [1, 2, 3, 4].map((seed) => ({
  id: `p${seed}`,
  tournamentId: 't1',
  displayName: `Player ${seed}`,
  seed,
  checkedIn: true,
  inspected: true,
  status: 'active',
}));

const stage: Stage = {
  id: 'swiss-stage',
  tournamentId: 't1',
  position: 1,
  name: 'Swiss',
  type: 'swiss',
  status: 'in_progress',
  matchType: '1on1',
  pointsToWin: 4,
  bestOf: 1,
  config: {
    advanceCount: 2,
    swissRounds: 1,
    tiebreakers: ['points', 'median_buchholz', 'point_diff', 'seed'],
  },
};

function completedMatch(id: string, p1: string, p2: string, winner: string): Match {
  return {
    id,
    tournamentId: 't1',
    stageId: stage.id,
    roundId: 'round-1',
    position: Number(id.replace('m', '')),
    participant1Id: p1,
    participant2Id: p2,
    winnerId: winner,
    isDraw: false,
    isBye: false,
    score1: winner === p1 ? 4 : 0,
    score2: winner === p2 ? 4 : 0,
    sets1: winner === p1 ? 1 : 0,
    sets2: winner === p2 ? 1 : 0,
    status: 'completed',
    version: 1,
  };
}

describe('Swiss stage advancement', () => {
  it('creates a playoff stage from completed Swiss standings', () => {
    const result = advanceSwissStageToPlayoffs(
      't1',
      stage,
      [
        completedMatch('m1', 'p1', 'p2', 'p1'),
        completedMatch('m2', 'p3', 'p4', 'p3'),
      ],
      participants,
      { pointsToWin: 5, bestOf: 1, thirdPlaceMatch: false }
    );

    expect(result.qualifiers).toHaveLength(2);
    expect(result.qualifiers.map((participant) => participant.id)).toEqual(['p1', 'p3']);
    expect(result.nextStage.type).toBe('single_elimination');
    expect(result.nextMatches).toHaveLength(1);
  });

  it('rejects advancement while a Swiss match is pending', () => {
    expect(() => advanceSwissStageToPlayoffs('t1', stage, [{
      ...completedMatch('m1', 'p1', 'p2', 'p1'),
      status: 'pending',
      winnerId: null,
    }], participants)).toThrow('matches pendientes');
  });
});
