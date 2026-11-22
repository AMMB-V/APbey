import { describe, expect, it } from 'vitest';
import { advanceGroupStageToPlayoffs, advanceSwissStageToPlayoffs } from './advancement';
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

  it('defaults generated playoff stages to best-of-three', () => {
    const result = advanceSwissStageToPlayoffs(
    't1',
    stage,
    [
      completedMatch('m1', 'p1', 'p2', 'p1'),
      completedMatch('m2', 'p3', 'p4', 'p3'),
    ],
    participants
    );

    expect(result.nextStage.bestOf).toBe(3);
  });
});

describe('configured tournament transitions', () => {
  const results = [completedMatch('m1', 'p1', 'p2', 'p1'), completedMatch('m2', 'p3', 'p4', 'p3')];
  const groups = ['g1', 'g2'].map((id, index) => ({
    id, name: id, position: index + 1, stageId: stage.id,
    participantIds: participants.slice(index * 2, index * 2 + 2).map(p => p.id),
  }));
  const grouped = results.map((m, i) => ({ ...m, groupId: groups[i].id }));
  const source = { ...stage, config: { ...stage.config, advanceCount: 1 } };

  it.each(['swiss', 'single_elimination', 'double_elimination', 'round_robin'] as const)(
    'uses the scheduled %s stage and exactly one qualifier per group', type => {
      const destination: Stage = { ...stage, id: 'next', position: 2, status: 'pending', type };
      const { nextStage, qualifiers, nextMatches, nextRounds } = advanceGroupStageToPlayoffs(
        't1', source, groups, grouped, participants, { destination }
      );
      expect(nextStage).toMatchObject({ id: 'next', position: 2, type, status: 'in_progress' });
      expect(qualifiers.map(p => p.id)).toEqual(['p1', 'p3']);
      expect(nextRounds.every(r => r.stageId === destination.id)).toBe(true);
      expect(nextMatches.length).toBeGreaterThan(0);
      expect(nextMatches.every(m => m.stageId === destination.id)).toBe(true);
      if (type === 'swiss') expect(nextStage.config).toMatchObject({ pointsPerBye: 1, pointsPerMatchWin: 1 });
    }
  );

  it('keeps pending group matches from producing qualifiers', () => {
    expect(() => advanceGroupStageToPlayoffs('t1', source, groups,
      [{ ...grouped[0], status: 'pending' }], participants)).toThrow('Completa todos');
  });
});
