import { expect, it } from 'vitest';
import type { Match, Participant } from '../../types/tournament';
import { liveSeasonRanking } from './liveSeasonRanking';

it('updates a ranked blader and a newcomer once and restores the baseline after reopening', () => {
  const row = {id: 'a', name: 'Yorch', points: 43, elo: 0, wins: 8, losses: 3, tournamentsWon: 0};
  const officialElo = {...row, id: 'imported-elo:1', elo: 1158, wins: 49};
  const players = [{id: 'a', tournamentId: 't', displayName: 'yorch'}, {id: 'b', tournamentId: 't', displayName: 'Nuevo'}] as Participant[];
  const game = {id: 'm', tournamentId: 't', participant1Id: 'a', participant2Id: 'b',
    status: 'completed', winnerId: 'a', manualSetScores: [[4, 1], [4, 2]]} as Match;
  const result = liveSeasonRanking([row, officialElo], [game, game], players, [], []);
  expect(result.points.map(player => player.points)).toEqual([48, -5]);
  expect(result.elo.map(player => player.elo)).toEqual([1164, 994]);
  expect(row.points).toBe(43);
  expect(liveSeasonRanking([row, officialElo], [{...game, status: 'pending'}], players, [], []).points).toEqual([row]);
});
