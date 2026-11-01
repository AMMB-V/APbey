import { describe, expect, it } from 'vitest';
import { applyBattle, applyPenalty, undoLastBattle } from './arbitration';
import { Battle, Match, Penalty, Round, Stage, Tournament } from '../../types/tournament';

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

  it('uses the playoff target instead of the group target', () => {
    const playoffStage: Stage = {
      ...stage,
      type: 'single_elimination',
      name: 'Fase Final (Eliminación Directa)',
      pointsToWin: tournament.pointsToWinPlayoffs,
    };
    const playoffRound: Round = {
      id: 'round-playoff',
      stageId: playoffStage.id,
      number: 1,
      bracket: 'winners',
      name: 'Semifinales',
    };
    const first = applyBattle(
      match({ stageId: playoffStage.id, roundId: playoffRound.id }),
      playoffStage,
      tournament,
      'p1',
      'xtreme',
      'referee-1',
      [],
      playoffRound
    );

    expect(first.updatedMatch.score1).toBe(3);
    expect(first.updatedMatch.status).toBe('in_progress');
    expect(first.updatedMatch.winnerId).toBeNull();
  });

  it('records a draw without assigning a scorer or points', () => {
    const result = applyBattle(match(), stage, tournament, null, null, 'referee-1', []);

    expect(result.newBattle.scorerId).toBeNull();
    expect(result.newBattle.points).toBe(0);
    expect(result.updatedMatch.score1).toBe(0);
    expect(result.updatedMatch.score2).toBe(0);
    expect(result.updatedMatch.status).toBe('in_progress');
  });

  it('rejects a penalty for a participant outside the match', () => {
    expect(() => applyPenalty(
      match(),
      stage,
      tournament,
      'other-participant',
      'yellow',
      true,
      'No contacto',
      'referee-1',
      []
    )).toThrow('El infractor no corresponde');
  });

  it('replays battles and penalties in chronological order when undoing', () => {
    const first = applyBattle(match(), stage, tournament, 'p1', 'spin', 'referee-1', []);
    const penalty: Penalty = {
      id: 'penalty-later',
      matchId: 'match-1',
      participantId: 'p1',
      card: 'yellow',
      isFoul: true,
      pointsAwarded: 1,
      awardedTo: 'p2',
      issuedBy: 'referee-1',
      createdAt: '2026-01-01T00:00:02.000Z',
    };
    const second = applyBattle(
      first.updatedMatch,
      stage,
      tournament,
      'p1',
      'spin',
      'referee-1',
      [first.newBattle]
    );
    const undo = undoLastBattle(
      second.updatedMatch,
      stage,
      [first.newBattle, second.newBattle],
      [penalty],
      tournament
    );

    expect(undo.updatedMatch.score1).toBe(1);
    expect(undo.updatedMatch.score2).toBe(1);
  });
});
