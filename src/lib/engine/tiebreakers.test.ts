import { describe, expect, it } from 'vitest';
import { computeStandings } from './tiebreakers';
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
});
