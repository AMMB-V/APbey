import { describe, expect, it } from 'vitest';
import { generateSingleElimination } from './formats/singleElimination';
import { applyBattle } from './arbitration';
import { getAdvancementSlot } from './advancement';
import type { Battle, Match, Participant, Round, Stage, Tournament } from '../../types/tournament';

describe('Technical Dry Run: 4-Player Live Tournament Simulation', () => {
  const tournamentId = 'tourn-dry-run-001';
  const stageId = 'stage-playoffs-001';

  const tournament: Tournament = {
    id: tournamentId,
    name: 'Dry Run Championship',
    slug: 'dry-run-championship',
    description: 'Technical dry run before production rollout',
    organizerId: 'org-admin-001',
    status: 'in_progress',
    isPublic: true,
    checkInRequired: false,
    entryFee: 0,
    foulPoints: 1,
    foulsPerPoint: 3,
    country: 'PA',
    startsAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    assignedReferees: ['ref-001'],
    pointsToWinGroup: 3,
    pointsToWinPlayoffs: 3,
    pointsToWinFinal: 4,
    finishPoints: {
      spin: 1,
      over: 2,
      burst: 2,
      xtreme: 3,
    },
  };

  const stage: Stage = {
    id: stageId,
    tournamentId,
    name: 'Fase Final (Eliminación Directa)',
    type: 'single_elimination',
    status: 'in_progress',
    position: 1,
    matchType: '1on1',
    bestOf: 1,
    pointsToWin: 3,
    config: {
      tiebreakers: ['points', 'point_diff', 'seed'],
    },
  };

  const participants: Participant[] = [
    { id: 'p1', tournamentId, displayName: 'Blader Alpha', seed: 1, checkedIn: true, inspected: true, status: 'active' },
    { id: 'p2', tournamentId, displayName: 'Blader Beta', seed: 2, checkedIn: true, inspected: true, status: 'active' },
    { id: 'p3', tournamentId, displayName: 'Blader Gamma', seed: 3, checkedIn: true, inspected: true, status: 'active' },
    { id: 'p4', tournamentId, displayName: 'Blader Delta', seed: 4, checkedIn: true, inspected: true, status: 'active' },
  ];

  function placeAdvancement(sourceMatch: Match, targetMatch: Match, participantId: string, sourceType: 'winner' | 'loser', roundsList: Round[] = []): Match {
    const slot = getAdvancementSlot(sourceMatch, targetMatch, sourceType, roundsList);
    if (slot === 0 && !targetMatch.participant1Id) {
      return { ...targetMatch, participant1Id: participantId, version: targetMatch.version + 1 };
    }
    if (slot === 1 && !targetMatch.participant2Id) {
      return { ...targetMatch, participant2Id: participantId, version: targetMatch.version + 1 };
    }
    if (!targetMatch.participant1Id) {
      return { ...targetMatch, participant1Id: participantId, version: targetMatch.version + 1 };
    }
    if (!targetMatch.participant2Id) {
      return { ...targetMatch, participant2Id: participantId, version: targetMatch.version + 1 };
    }
    return targetMatch;
  }

  it('executes end-to-end tournament dry run: bracket creation, referee arbitration, realtime score, and final conclusion', () => {
    // 1. Bracket generation
    const { rounds, matches } = generateSingleElimination(tournamentId, stageId, participants);

    expect(rounds).toHaveLength(2);
    expect(rounds[0].name).toBe('Semifinales');
    expect(rounds[1].name).toBe('Gran Final');

    expect(matches).toHaveLength(3);
    const m1 = matches.find((m) => m.position === 1 && m.roundId === rounds[0].id)!;
    const m2 = matches.find((m) => m.position === 2 && m.roundId === rounds[0].id)!;
    const grandFinal = matches.find((m) => m.roundId === rounds[1].id)!;

    expect(m1.participant1Id).toBe('p1');
    expect(m1.participant2Id).toBe('p4');
    expect(m1.nextMatchWinnerId).toBe(grandFinal.id);

    expect(m2.participant1Id).toBe('p2');
    expect(m2.participant2Id).toBe('p3');
    expect(m2.nextMatchWinnerId).toBe(grandFinal.id);

    expect(grandFinal.participant1Id).toBeNull();
    expect(grandFinal.participant2Id).toBeNull();

    // 2. Referee arbitrates Match 1 (p1 vs p4) from mobile
    const battles: Battle[] = [];
    let activeM1 = { ...m1 };

    // Battle 1: p1 scores Spin Finish (1 pt)
    const b1Result = applyBattle(activeM1, stage, tournament, 'p1', 'spin', 'referee-1', battles, rounds[0]);
    activeM1 = b1Result.updatedMatch;
    battles.push(b1Result.newBattle);
    expect(activeM1.score1).toBe(1);
    expect(activeM1.score2).toBe(0);
    expect(activeM1.status).toBe('in_progress');

    // Battle 2: p4 scores Spin Finish (1 pt)
    const b2Result = applyBattle(activeM1, stage, tournament, 'p4', 'spin', 'referee-1', battles, rounds[0]);
    activeM1 = b2Result.updatedMatch;
    battles.push(b2Result.newBattle);
    expect(activeM1.score1).toBe(1);
    expect(activeM1.score2).toBe(1);

    // Battle 3: p1 scores Burst Finish (2 pts) -> total 3 points (target reached)
    const b3Result = applyBattle(activeM1, stage, tournament, 'p1', 'burst', 'referee-1', battles, rounds[0]);
    activeM1 = b3Result.updatedMatch;
    battles.push(b3Result.newBattle);
    expect(activeM1.score1).toBe(3);
    expect(activeM1.score2).toBe(1);
    expect(activeM1.status).toBe('completed');
    expect(activeM1.winnerId).toBe('p1');

    // Advance M1 winner (p1) to Grand Final
    let activeGrandFinal = placeAdvancement(activeM1, grandFinal, activeM1.winnerId!, 'winner');
    expect(activeGrandFinal.participant1Id).toBe('p1');
    expect(activeGrandFinal.participant2Id).toBeNull();

    // 3. Referee arbitrates Match 2 (p2 vs p3)
    let activeM2 = { ...m2 };
    // Battle: p2 scores Xtreme Finish (3 pts) -> target reached immediately
    const b4Result = applyBattle(activeM2, stage, tournament, 'p2', 'xtreme', 'referee-2', battles, rounds[0]);
    activeM2 = b4Result.updatedMatch;
    battles.push(b4Result.newBattle);
    expect(activeM2.score1).toBe(3);
    expect(activeM2.score2).toBe(0);
    expect(activeM2.status).toBe('completed');
    expect(activeM2.winnerId).toBe('p2');

    // Advance M2 winner (p2) to Grand Final
    activeGrandFinal = placeAdvancement(activeM2, activeGrandFinal, activeM2.winnerId!, 'winner');
    expect(activeGrandFinal.participant1Id).toBe('p1');
    expect(activeGrandFinal.participant2Id).toBe('p2');

    // 4. Live Display / Projector view confirms both finalists seated
    expect(activeGrandFinal.participant1Id).toBe('p1');
    expect(activeGrandFinal.participant2Id).toBe('p2');

    // 5. Arbitrate Grand Final (Target points: pointsToWinFinal = 4)
    expect(rounds[1].name).toBe('Gran Final');
    const gfRound = rounds[1];

    // Battle 1: p1 scores Over Finish (2 pts)
    const gfB1 = applyBattle(activeGrandFinal, stage, tournament, 'p1', 'over', 'head-referee', battles, gfRound);
    activeGrandFinal = gfB1.updatedMatch;
    battles.push(gfB1.newBattle);
    expect(activeGrandFinal.score1).toBe(2);
    expect(activeGrandFinal.score2).toBe(0);

    // Battle 2: p2 scores Burst Finish (2 pts) -> tied 2-2
    const gfB2 = applyBattle(activeGrandFinal, stage, tournament, 'p2', 'burst', 'head-referee', battles, gfRound);
    activeGrandFinal = gfB2.updatedMatch;
    battles.push(gfB2.newBattle);
    expect(activeGrandFinal.score1).toBe(2);
    expect(activeGrandFinal.score2).toBe(2);

    // Battle 3: p1 scores Xtreme Finish (3 pts) -> total 5 points (>= pointsToWinFinal 4)
    const gfB3 = applyBattle(activeGrandFinal, stage, tournament, 'p1', 'xtreme', 'head-referee', battles, gfRound);
    activeGrandFinal = gfB3.updatedMatch;
    battles.push(gfB3.newBattle);
    expect(activeGrandFinal.score1).toBe(5);
    expect(activeGrandFinal.score2).toBe(2);
    expect(activeGrandFinal.status).toBe('completed');
    expect(activeGrandFinal.winnerId).toBe('p1');

    // 6. Conclude Tournament
    const allMatches = [activeM1, activeM2, activeGrandFinal];
    const allCompleted = allMatches.every((m) => m.status === 'completed');
    expect(allCompleted).toBe(true);

    const tournamentWinner = activeGrandFinal.winnerId;
    const runnerUp = activeGrandFinal.winnerId === activeGrandFinal.participant1Id
      ? activeGrandFinal.participant2Id
      : activeGrandFinal.participant1Id;

    expect(tournamentWinner).toBe('p1'); // Blader Alpha wins!
    expect(runnerUp).toBe('p2'); // Blader Beta runner up!

    const concludedTournament: Tournament = {
      ...tournament,
      status: 'completed',
    };

    expect(concludedTournament.status).toBe('completed');
    expect(battles).toHaveLength(7);
  });
});
