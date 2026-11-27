import { describe, expect, it } from 'vitest';
import { computeStandings, matchPointTotals } from './tiebreakers';
import { Match, Participant } from '../../types/tournament';

const participants: Participant[] = [1, 2, 3].map((seed) => ({
  id: `p${seed}`,
  tournamentId: 'tournament-1',
  displayName: `Blader ${seed}`,
  seed,
  checkedIn: true,
  inspected: true,
  status: 'active',
}));

function completedMatch(
  id: string,
  p1: string,
  p2: string,
  winnerId: string,
  score1: number,
  score2: number
): Match {
  return {
    id,
    tournamentId: 'tournament-1',
    stageId: 'stage-1',
    roundId: 'round-1',
    position: 1,
    participant1Id: p1,
    participant2Id: p2,
    winnerId,
    isDraw: false,
    isBye: false,
    score1,
    score2,
    sets1: 1,
    sets2: 0,
    status: 'completed',
    version: 2,
  };
}

describe('computeStandings', () => {
  it('uses wins, point difference and head-to-head consistently', () => {
    const matches = [
      completedMatch('m1', 'p1', 'p2', 'p1', 4, 2),
      completedMatch('m2', 'p2', 'p3', 'p2', 4, 1),
      completedMatch('m3', 'p3', 'p1', 'p3', 4, 2),
    ];

    const standings = computeStandings(matches, participants, ['points', 'head_to_head', 'seed']);

    expect(standings.map((row) => row.participantId)).toEqual(['p1', 'p2', 'p3']);
    expect(standings.every((row) => row.played === 2)).toBe(true);
    expect(standings[0].points).toBe(3);
  });

  it('computes Buchholz from opponents final standings points', () => {
    const matches = [
      completedMatch('m1', 'p1', 'p2', 'p1', 4, 2),
      completedMatch('m2', 'p2', 'p3', 'p2', 4, 1),
    ];

    const standings = computeStandings(matches, participants, ['buchholz', 'seed']);
    expect(standings.find((row) => row.participantId === 'p1')?.buchholz).toBe(3);
    expect(standings.find((row) => row.participantId === 'p2')?.buchholz).toBe(3);
  });

  it('computes Median-Buchholz without counting byes and discards extremes', () => {
    const fourParticipants = [
      ...participants,
      {
        id: 'p4',
        tournamentId: 'tournament-1',
        displayName: 'Blader 4',
        seed: 4,
        checkedIn: true,
        inspected: true,
        status: 'active' as const,
      },
    ];
    const matches = [
      completedMatch('m1', 'p1', 'p2', 'p1', 4, 2),
      completedMatch('m2', 'p1', 'p3', 'p1', 4, 2),
      completedMatch('m4', 'p1', 'p4', 'p1', 4, 2),
      completedMatch('m5', 'p2', 'p3', 'p2', 4, 2),
      completedMatch('m6', 'p3', 'p4', 'p3', 4, 2),
      {
        ...completedMatch('m3', 'p1', 'p2', 'p1', 0, 0),
        isBye: true,
        participant2Id: null,
      },
    ];

    const standings = computeStandings(matches, fourParticipants, ['median_buchholz', 'seed']);
    expect(standings.find((row) => row.participantId === 'p1')?.medianBuchholz).toBe(3);
  });

  it('applies configurable match, set and bye points', () => {
    const matches = [
      {
        ...completedMatch('m1', 'p1', 'p2', 'p1', 4, 2),
        sets1: 2,
        sets2: 1,
      },
      {
        ...completedMatch('bye', 'p3', 'p1', 'p3', 0, 0),
        isBye: true,
        participant2Id: null,
      },
    ];

    const standings = computeStandings(matches, participants, ['points', 'seed'], 2, {
      pointsPerMatchWin: 2,
      pointsPerSetWin: 0.5,
      pointsPerBye: 1,
    });

    expect(standings.find((row) => row.participantId === 'p1')?.points).toBe(3);
    expect(standings.find((row) => row.participantId === 'p3')?.points).toBe(1);
  });

  it('calculates median buchholz discarding single best and single worst opponent score (Zirox example: 1, 4, 2, 3, 4 -> 9)', () => {
    // 6 participants: p1 (focus) and op1..op5
    const participantsList: Participant[] = [
      { id: 'p1', tournamentId: 't1', displayName: 'Hero', seed: 1, checkedIn: true, inspected: true, status: 'active' },
      { id: 'op1', tournamentId: 't1', displayName: 'Opponent 1', seed: 2, checkedIn: true, inspected: true, status: 'active' },
      { id: 'op2', tournamentId: 't1', displayName: 'Opponent 2', seed: 3, checkedIn: true, inspected: true, status: 'active' },
      { id: 'op3', tournamentId: 't1', displayName: 'Opponent 3', seed: 4, checkedIn: true, inspected: true, status: 'active' },
      { id: 'op4', tournamentId: 't1', displayName: 'Opponent 4', seed: 5, checkedIn: true, inspected: true, status: 'active' },
      { id: 'op5', tournamentId: 't1', displayName: 'Opponent 5', seed: 6, checkedIn: true, inspected: true, status: 'active' },
    ];

    // op1 has 1 point, op2 has 4 points, op3 has 2 points, op4 has 3 points, op5 has 4 points
    // p1 played against each of op1..op5 (and also had a BYE)
    const matches: Match[] = [
      // p1 vs each opponent
      completedMatch('m1', 'p1', 'op1', 'p1', 4, 0),
      completedMatch('m2', 'p1', 'op2', 'p1', 4, 0),
      completedMatch('m3', 'p1', 'op3', 'p1', 4, 0),
      completedMatch('m4', 'p1', 'op4', 'p1', 4, 0),
      completedMatch('m5', 'p1', 'op5', 'p1', 4, 0),
      // p1 BYE match
      {
        ...completedMatch('m_bye', 'p1', 'op1', 'p1', 0, 0),
        isBye: true,
        participant2Id: null,
      },
      // op1 wins 1 match (1 pt)
      completedMatch('m_op1_win', 'op1', 'op2', 'op1', 4, 0),
      // op2 wins 4 matches (4 pts)
      completedMatch('m_op2_1', 'op2', 'op1', 'op2', 4, 0),
      completedMatch('m_op2_2', 'op2', 'op1', 'op2', 4, 0),
      completedMatch('m_op2_3', 'op2', 'op1', 'op2', 4, 0),
      completedMatch('m_op2_4', 'op2', 'op1', 'op2', 4, 0),
      // op3 wins 2 matches (2 pts)
      completedMatch('m_op3_1', 'op3', 'op1', 'op3', 4, 0),
      completedMatch('m_op3_2', 'op3', 'op1', 'op3', 4, 0),
      // op4 wins 3 matches (3 pts)
      completedMatch('m_op4_1', 'op4', 'op1', 'op4', 4, 0),
      completedMatch('m_op4_2', 'op4', 'op1', 'op4', 4, 0),
      completedMatch('m_op4_3', 'op4', 'op1', 'op4', 4, 0),
      // op5 wins 4 matches (4 pts)
      completedMatch('m_op5_1', 'op5', 'op1', 'op5', 4, 0),
      completedMatch('m_op5_2', 'op5', 'op1', 'op5', 4, 0),
      completedMatch('m_op5_3', 'op5', 'op1', 'op5', 4, 0),
      completedMatch('m_op5_4', 'op5', 'op1', 'op5', 4, 0),
    ];

    const standings = computeStandings(matches, participantsList, ['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed'], 2, {
      pointsPerMatchWin: 1,
      pointsPerBye: 1,
    });

    const p1Row = standings.find((r) => r.participantId === 'p1');
    expect(p1Row).toBeDefined();
    // Opponent scores are [1, 4, 2, 3, 4]. Sorted: [1, 2, 3, 4, 4].
    // Dropping lowest (1) and highest (4) leaves [2, 3, 4].
    // Median Buchholz sum = 2 + 3 + 4 = 9.
    expect(p1Row?.medianBuchholz).toBe(9);
    // BYE gave 1 point + 5 wins from matches = 6 points total
    expect(p1Row?.points).toBe(6);
    expect(p1Row?.won).toBe(6);
  });
});

it('counts tied and deciding sets in the standings', () => {
  const match: Match = {
    ...completedMatch('m1', 'p1', 'p2', 'p1', 4, 2),
    manualSetScores: [[2, 2], [4, 2]],
  };
  const standings = computeStandings([match], participants);
  expect(standings.find(row => row.participant.id === 'p1')).toMatchObject({
    won: 1, pointsFor: 6, pointsAgainst: 4, pointDiff: 2,
  });
  expect(standings.find(row => row.participant.id === 'p2')).toMatchObject({
    lost: 1, pointsFor: 4, pointsAgainst: 6,
  });
});

it('aggregates points from setCheckpoint and current set in recordedMatchPoints', () => {
  const match: Match = {
    ...completedMatch('m1', 'p1', 'p2', 'p1', 5, 2),
    setCheckpoint: {
      scores: [[3, 1], [2, 4]],
      battleNumber: 4,
      penaltyIds: [],
    },
  };
  const standings = computeStandings([match], participants);
  // Total points for p1: 3 + 2 + 5 = 10
  // Total points for p2: 1 + 4 + 2 = 7
  // Point difference: 10 - 7 = 3
  expect(standings.find(row => row.participant.id === 'p1')).toMatchObject({
    won: 1, pointsFor: 10, pointsAgainst: 7, pointDiff: 3,
  });
  expect(standings.find(row => row.participant.id === 'p2')).toMatchObject({
    lost: 1, pointsFor: 7, pointsAgainst: 10, pointDiff: -3,
  });
});

it('combines the saved partial with later scoring events without counting earlier or voided points twice', () => {
  const match: Match = {
    ...completedMatch('m1', 'p1', 'p2', 'p1', 4, 2),
    setCheckpoint: { scores: [[2, 2], [1, 2]], battleNumber: 1, penaltyIds: [] },
  };
  const battles = [1, 2, 3].map(battleNumber => ({
    id: String(battleNumber), matchId: match.id, battleNumber, setNumber: 2,
    scorerId: 'p1', finish: 'xtreme' as const, points: 3, voided: battleNumber === 3,
    recordedBy: 'referee', createdAt: '2026-11-22',
  }));
  expect(matchPointTotals([match], battles, [])(match)).toEqual([6, 4]);
});

it('awards a round-robin bye to the winner in the second slot', () => {
  const bye: Match = { ...completedMatch('bye', 'p1', 'p2', 'p2', 0, 0), participant1Id: null, isBye: true };
  const rows = computeStandings([bye], participants);
  expect(rows.find(row => row.participantId === 'p2')).toMatchObject({ won: 1, points: 1, medianBuchholz: 0 });
});
