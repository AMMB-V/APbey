import { describe, expect, it } from 'vitest';
import type { Match, Participant, Round, Stage, Tournament } from '../../types/tournament';
import { officialPlacementPoints, tournamentRankingPlacements } from './tournamentRankingPoints';

describe('official tournament ranking points', () => {
  it('matches every published placement band', () => {
    expect([1,2,3,4,5,6,7,8,9,16,17,32,33].map(position => officialPlacementPoints('super', position)))
      .toEqual([50,45,40,35,30,25,20,15,11,11,3,3,3]);
    expect([1,2,3,4,5,6,7,8,9,16,17,32,33].map(position => officialPlacementPoints('twisted', position)))
      .toEqual([30,26,24,21,20,18,17,15,11,11,5,5,3]);
  });

  it('awards final positions once from a completed Clash', () => {
    const tournament = { id: 't', isPublic: true, status: 'completed', category: 'clash' } as Tournament;
    const stage = { id: 's', tournamentId: 't', type: 'single_elimination', status: 'completed', position: 1 } as Stage;
    const round = { id: 'r', stageId: 's', bracket: 'grand_final', name: 'Gran Final', number: 1 } as Round;
    const players = ['winner', 'runner'].map((id, index) => ({ id, tournamentId: 't', displayName: id, seed: index + 1 })) as Participant[];
    const match = { id: 'm', tournamentId: 't', stageId: 's', roundId: 'r', position: 1, status: 'completed',
      participant1Id: 'winner', participant2Id: 'runner', winnerId: 'winner' } as Match;
    expect(tournamentRankingPlacements(tournament, [stage], [round], [match], players, [], []).map(row =>
      ({ name: row.participant.displayName, position: row.position, points: row.points })))
      .toEqual([{ name: 'winner', position: 1, points: 30 }, { name: 'runner', position: 2, points: 26 }]);
  });
});
