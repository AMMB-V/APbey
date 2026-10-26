import { describe, expect, it } from 'vitest';
import { applyBattle, applyPenalty, undoLastBattle } from './arbitration';
import { Battle, Match, Penalty, Stage, Tournament } from '../../types/tournament';

const tournament: Tournament = {
  id: 'tournament-1',
  slug: 'arena',
  name: 'Arena',
  organizerId: 'organizer-1',
  status: 'in_progress',
  isPublic: true,
  checkInRequired: false,
  entryFee: 0,
  foulPoints: 1,
  foulsPerPoint: 3,
  country: 'PA',
  startsAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  finishPoints: { spin: 1, over: 2, burst: 2, xtreme: 3 },
  assignedReferees: ['referee-1'],
  pointsToWinGroup: 2,
  pointsToWinPlayoffs: 5,
  pointsToWinFinal: 7,
};

const stage: Stage = {
  id: 'stage-1',
  tournamentId: tournament.id,
  position: 1,
  name: 'Grupos',
  type: 'group_stage',
  status: 'in_progress',
  matchType: '1on1',
  pointsToWin: 2,
  bestOf: 1,
  config: { tiebreakers: ['points'] },
};

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    tournamentId: tournament.id,
    stageId: stage.id,
    roundId: 'round-1',
    position: 1,
    participant1Id: 'p1',
    participant2Id: 'p2',
    winnerId: null,
    isDraw: false,
    isBye: false,
    score1: 0,
    score2: 0,
    sets1: 0,
    sets2: 0,
    status: 'pending',
    refereeId: 'referee-1',
    version: 1,
    ...overrides,
  };
}

describe('arbitration engine', () => {
  it('awards finish points and closes a best-of-one match at the target', () => {
    const result = applyBattle(match(), stage, tournament, 'p1', 'over', 'referee-1', []);

    expect(result.newBattle.points).toBe(2);
    expect(result.updatedMatch.score1).toBe(2);
    expect(result.updatedMatch.sets1).toBe(1);
    expect(result.updatedMatch.status).toBe('completed');
    expect(result.updatedMatch.winnerId).toBe('p1');
  });

  it('awards a foul point only on the configured foul threshold', () => {
    const penalties: Penalty[] = [1, 2].map((id) => ({
      id: `penalty-${id}`,
      matchId: 'match-1',
      participantId: 'p1',
      card: 'yellow',
      isFoul: true,
      pointsAwarded: 0,
      awardedTo: null,
      issuedBy: 'referee-1',
      createdAt: '2026-01-01T00:00:00.000Z',
    }));

    const result = applyPenalty(
      match(),
      stage,
      tournament,
      'p1',
      'yellow',
      true,
      'No contacto',
      'referee-1',
      penalties
    );

    expect(result.newPenalty.pointsAwarded).toBe(1);
    expect(result.newPenalty.awardedTo).toBe('p2');
    expect(result.updatedMatch.score2).toBe(1);
  });

  it('recalculates the match after undoing the last battle', () => {
    const first = applyBattle(match(), stage, tournament, 'p1', 'spin', 'referee-1', []);
    const second = applyBattle(first.updatedMatch, stage, tournament, 'p2', 'spin', 'referee-1', [first.newBattle]);
    const undo = undoLastBattle(
      second.updatedMatch,
      stage,
      [first.newBattle, second.newBattle] as Battle[],
      [],
      tournament
    );

    expect(undo.removedBattleId).toBe(second.newBattle.id);
    expect(undo.updatedMatch.score1).toBe(1);
    expect(undo.updatedMatch.score2).toBe(0);
    expect(undo.updatedMatch.status).toBe('in_progress');
  });
});
