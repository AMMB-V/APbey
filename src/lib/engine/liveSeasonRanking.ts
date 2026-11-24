import { IMPORTED_ELO_ID_PREFIX, type BladerRanking } from '../../types/rankings';
import type { Battle, Match, Participant, Penalty } from '../../types/tournament';
import { matchPointTotals } from './tiebreakers';

export const rankingNameKey = (name: string) => name.trim().normalize('NFC').toLowerCase();
export const SEASON_TWO_BASELINE = '2026-11-15';

export function liveSeasonRanking(base: BladerRanking[], games: Match[], roster: Participant[],
  battles: Battle[], penalties: Penalty[]) {
  const points = new Map<string, BladerRanking>();
  const elo = new Map<string, BladerRanking>();
  for (const row of base) {
    const key = rankingNameKey(row.name);
    if (!row.id.startsWith(IMPORTED_ELO_ID_PREFIX)) points.set(key, {...row});
    if (row.elo > 0 && (!elo.has(key) || row.id.startsWith(IMPORTED_ELO_ID_PREFIX))) elo.set(key, {...row});
  }
  const players = new Map(roster.map(player => [player.id, player]));
  const completed = [...new Map(games.filter(game => game.status === 'completed' && !game.isBye &&
    (!game.outcome || game.outcome === 'normal' || game.outcome === 'third_place')).map(game => [game.id, game])).values()]
    .sort((a,b) => (a.finishedAt ?? '').localeCompare(b.finishedAt ?? '') || a.id.localeCompare(b.id));
  const totals = matchPointTotals(completed, battles, penalties);
  const get = (map: Map<string, BladerRanking>, player: Participant) => {
    const key = rankingNameKey(player.displayName);
    let row = map.get(key);
    if (!row) {
      row = {id: 'live:' + key, name: player.displayName, points: 0, elo: 1000, wins: 0, losses: 0, tournamentsWon: 0};
      map.set(key, row);
    }
    return row;
  };
  for (const game of completed) {
    const a = players.get(game.participant1Id ?? ''), b = players.get(game.participant2Id ?? '');
    if (!a || !b || a.tournamentId !== game.tournamentId || b.tournamentId !== game.tournamentId ||
      rankingNameKey(a.displayName) === rankingNameKey(b.displayName)) continue;
    if (!game.isDraw && game.winnerId !== a.id && game.winnerId !== b.id) continue;
    const [scoreA, scoreB] = totals(game);
    get(points, a).points += scoreA - scoreB;
    get(points, b).points += scoreB - scoreA;
    if (game.isDraw) continue;
    const winner = game.winnerId === a.id ? a : b, loser = winner === a ? b : a;
    get(points, winner).wins++;
    get(points, loser).losses++;
    const winningRating = get(elo, winner), losingRating = get(elo, loser);
    const gain = 20 / (1 + 10 ** ((winningRating.elo - losingRating.elo) / 400));
    winningRating.elo += gain;
    losingRating.elo -= gain;
    winningRating.wins++;
    losingRating.losses++;
  }
  return { points: [...points.values()], elo: [...elo.values()].map(row => ({...row, elo: Math.round(row.elo)})) };
}
