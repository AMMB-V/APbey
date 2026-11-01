import { describe, expect, it } from 'vitest';
import { migratePersistedTournamentData } from './localDataMigration';

describe('migratePersistedTournamentData', () => {
  it('converts legacy IDs and preserves all entity relationships', () => {
    const result = migratePersistedTournamentData({
      tournaments: [{
        id: 'tourney_legacy',
        slug: 'legacy',
        name: 'Legacy',
        organizerId: 'user_admin',
        status: 'draft',
        isPublic: true,
        checkInRequired: false,
        entryFee: 0,
        foulPoints: 1,
        foulsPerPoint: 3,
        country: 'PA',
        startsAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        finishPoints: { spin: 1, over: 2, burst: 2, xtreme: 3 },
        assignedReferees: [],
        pointsToWinGroup: 4,
        pointsToWinPlayoffs: 5,
        pointsToWinFinal: 7,
      }],
      stages: [{
        id: 'stage_legacy',
        tournamentId: 'tourney_legacy',
        position: 1,
        name: 'Stage',
        type: 'single_elimination',
        status: 'pending',
        matchType: '3on3',
        pointsToWin: 4,
        bestOf: 1,
        config: { tiebreakers: [] },
      }],
      rounds: [{
        id: 'round_legacy',
        stageId: 'stage_legacy',
        number: 1,
        bracket: 'winners',
        name: 'Round 1',
      }],
      participants: [{
        id: 'participant_legacy',
        tournamentId: 'tourney_legacy',
        displayName: 'Blader',
        seed: 1,
        checkedIn: true,
        inspected: true,
        status: 'registered',
      }],
      matches: [{
        id: 'match_legacy',
        tournamentId: 'tourney_legacy',
        stageId: 'stage_legacy',
        roundId: 'round_legacy',
        position: 1,
        participant1Id: 'participant_legacy',
        participant2Id: null,
        winnerId: null,
        isDraw: false,
        isBye: false,
        score1: 0,
        score2: 0,
        sets1: 0,
        sets2: 0,
        status: 'pending',
        version: 1,
      }],
    });

    expect(result.migrated).toBe(true);
    expect(result.data.tournaments[0].id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.data.stages[0].tournamentId).toBe(result.data.tournaments[0].id);
    expect(result.data.matches[0].stageId).toBe(result.data.stages[0].id);
    expect(result.data.matches[0].roundId).toBe(result.data.rounds[0].id);
    expect(result.data.matches[0].participant1Id).toBe(result.data.participants[0].id);
  });
});
