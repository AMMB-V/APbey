import { describe, expect, it } from 'vitest';
import { assignSwissRoundResources, generateNextSwissRound, generateSwiss } from './swiss';
import { Match, Participant } from '../../../types/tournament';

const participants: Participant[] = [1, 2, 3, 4].map((seed) => ({
  id: `p${seed}`,
  tournamentId: 't1',
  displayName: `Player ${seed}`,
  seed,
  checkedIn: true,
  inspected: true,
  status: 'active',
}));

describe('Swiss round generation', () => {
  it('distributes matches across configured tables and available referees', () => {
    const generated = generateSwiss('t1', 's1', participants, { randomFn: () => 0.5 });
    const scheduled = assignSwissRoundResources(generated.matches, 2, ['ref-1', 'ref-2']);
    const playable = scheduled.filter((match) => !match.isBye);
    expect(playable.map((match) => match.station)).toEqual(['Mesa 1', 'Mesa 2']);
    expect(playable.map((match) => match.refereeId)).toEqual(['ref-1', 'ref-2']);
  });

  it('generates later rounds only after the previous round is complete', () => {
    const first = generateSwiss('t1', 's1', participants);
    expect(() => generateNextSwissRound('t1', 's1', first.rounds, participants, first.matches))
      .toThrow('matches pendientes');
  });

  it('avoids rematches when a valid pairing exists', () => {
    const first = generateSwiss('t1', 's1', participants);
    const completed: Match[] = first.matches.map((match, index) => ({
      ...match,
      status: 'completed',
      winnerId: index % 2 === 0 ? match.participant1Id : match.participant2Id,
      score1: index % 2 === 0 ? 4 : 0,
      score2: index % 2 === 0 ? 0 : 4,
    }));
    const next = generateNextSwissRound('t1', 's1', first.rounds, participants, completed);
    const previousPairs = new Set(completed.map((match) => [match.participant1Id, match.participant2Id].sort().join(':')));
    expect(next.matches.filter((match) => !match.isBye).every((match) =>
      !previousPairs.has([match.participant1Id, match.participant2Id].sort().join(':'))
    )).toBe(true);
  });

  it('uses configured tiebreakers and scoring for later rounds', () => {
    const first = generateSwiss('t1', 's1', participants, {
      tiebreakers: ['points', 'seed'],
      scoring: { pointsPerMatchWin: 2 },
    });
    const completed: Match[] = first.matches.map((match) => ({
      ...match,
      status: 'completed',
      winnerId: match.participant1Id,
      score1: 4,
      score2: 0,
    }));

    const next = generateNextSwissRound(
      't1',
      's1',
      first.rounds,
      participants,
      completed,
      { tiebreakers: ['points', 'seed'], scoring: { pointsPerMatchWin: 2 } }
    );

    expect(next.round.number).toBe(2);
    expect(next.matches).toHaveLength(2);
  });

  it('performs random draw in round 1 and pairs winners with winners in round 2', () => {
    // 4 participants: reverse order shuffle
    const reverseRng = () => 0; // always picks 0, effectively shuffling/reversing
    const round1 = generateSwiss('t1', 's1', participants, { randomFn: reverseRng });
    expect(round1.matches).toHaveLength(2);

    // Round 1 matches: let participant1 in match 1 win, and participant2 in match 2 win
    const m1 = round1.matches[0];
    const m2 = round1.matches[1];
    const completedR1: Match[] = [
      {
        ...m1,
        status: 'completed',
        winnerId: m1.participant1Id,
        score1: 4,
        score2: 1,
      },
      {
        ...m2,
        status: 'completed',
        winnerId: m2.participant2Id,
        score1: 1,
        score2: 4,
      },
    ];

    const round2 = generateNextSwissRound('t1', 's1', round1.rounds, participants, completedR1);
    expect(round2.matches).toHaveLength(2);

    // The winners (m1.participant1Id and m2.participant2Id) must be paired together!
    const winnersMatch = round2.matches.find(
      (m) =>
        (m.participant1Id === m1.participant1Id && m.participant2Id === m2.participant2Id) ||
        (m.participant1Id === m2.participant2Id && m.participant2Id === m1.participant1Id)
    );
    expect(winnersMatch).toBeDefined();

    // And the losers (m1.participant2Id and m2.participant1Id) must be paired together!
    const losersMatch = round2.matches.find(
      (m) =>
        (m.participant1Id === m1.participant2Id && m.participant2Id === m2.participant1Id) ||
        (m.participant1Id === m2.participant1Id && m.participant2Id === m1.participant2Id)
    );
    expect(losersMatch).toBeDefined();
  });

  it('handles odd participant counts with BYE in round 1', () => {
    const fiveParticipants = [...participants, {
      id: 'p5',
      tournamentId: 't1',
      displayName: 'Player 5',
      seed: 5,
      checkedIn: true,
      inspected: true,
      status: 'active' as const,
    }];
    const round1 = generateSwiss('t1', 's1', fiveParticipants);
    const byeMatch = round1.matches.find((m) => m.isBye);
    expect(byeMatch).toBeDefined();
    expect(byeMatch?.status).toBe('completed');
    expect(round1.matches.filter((m) => !m.isBye)).toHaveLength(2);
  });

  it('excludes disqualified and withdrawn participants from Swiss pairing', () => {
    const first = generateSwiss('t1', 's1', participants);
    const completed: Match[] = first.matches.map((match) => ({
      ...match,
      status: 'completed',
      winnerId: match.participant1Id,
      score1: 4,
      score2: 0,
    }));

    // Mark p4 as disqualified and p3 as withdrawn
    const updatedParticipants: Participant[] = participants.map((p) => {
      if (p.id === 'p4') return { ...p, status: 'disqualified' as const };
      if (p.id === 'p3') return { ...p, status: 'withdrawn' as const };
      return p;
    });

    const next = generateNextSwissRound(
      't1',
      's1',
      first.rounds,
      updatedParticipants,
      completed
    );

    // Only p1 and p2 remain, so they should be paired (1 match, 0 byes)
    const pairedParticipantIds = next.matches.flatMap((m) => [m.participant1Id, m.participant2Id].filter(Boolean));
    expect(pairedParticipantIds).not.toContain('p4');
    expect(pairedParticipantIds).not.toContain('p3');
    expect(pairedParticipantIds).toContain('p1');
    expect(pairedParticipantIds).toContain('p2');
  });
});
