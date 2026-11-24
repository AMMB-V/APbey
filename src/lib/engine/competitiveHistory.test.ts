import { expect, it } from 'vitest';
import type { Match, Participant, Round, Stage, Tournament } from '../../types/tournament';
import { competitiveHistory } from './competitiveHistory';

it('uses the deciding reset, ignores BYEs and recomputes after reopening', () => {
  const tournament = { id: 't', name: 'Open', isPublic: true, status: 'completed', startsAt: '2026-01-01' } as Tournament;
  const stage = { id: 's', tournamentId: 't', status: 'completed', type: 'double_elimination', position: 1 } as Stage;
  const round = { id: 'r', stageId: 's', bracket: 'grand_final' } as Round;
  const players = ['a', 'b'].map(id => ({ id, tournamentId: 't', displayName: id }) as Participant);
  const final = { id: '1', tournamentId: 't', stageId: 's', roundId: 'r', position: 1,
    status: 'completed', participant1Id: 'a', participant2Id: 'b', winnerId: 'b' } as Match;
  const reset = { ...final, id: '2', position: 2, winnerId: 'a' };
  const bye = { ...reset, id: '3', isBye: true };
  const result = competitiveHistory([tournament], [stage], [round], [final, reset, bye], players, [], []);
  expect(result.awards[0]).toMatchObject({ champion: 'a', runnerUp: 'b' });
  expect(result.ratings.find(row => row.name === 'a')).toMatchObject({ elo: 1501, wins: 1, losses: 1, tournamentsWon: 1 });
  expect(competitiveHistory([{ ...tournament, status: 'in_progress' }], [stage], [round],
    [final, reset], players, [], [])).toEqual({ ratings: [], awards: [] });
});
