import type { Battle, Match, Participant, Penalty, Round, Stage, Tournament } from '../../types/tournament';
import type { BladerRanking, HallOfFameEntry } from '../../types/rankings';
import { swissScoringDefaults } from './formats/swiss';
import { computeStandings, matchPointTotals } from './tiebreakers';

export function competitiveHistory(tournaments: Tournament[], stages: Stage[], rounds: Round[],
  matches: Match[], participants: Participant[], battles: Battle[], penalties: Penalty[]) {
  const publicEvents = tournaments.filter(event => event.isPublic && event.status === 'completed');
  const events = new Map(publicEvents.map(event => [event.id, event]));
  const players = new Map(participants.map(player => [player.id, player]));
  const ratings = new Map<string, BladerRanking>();
  const awards: HallOfFameEntry[] = [];
  const ratingFor = (player: Participant) => {
    const id = player.profileId ? `profile:${player.profileId}` : `name:${player.displayName.trim().normalize('NFC').toLowerCase()}`;
    let rating = ratings.get(id);
    if (!rating) {
      rating = { id, name: player.displayName, elo: 1500, points: 0, wins: 0, losses: 0, tournamentsWon: 0 };
      ratings.set(id, rating);
    }
    return rating;
  };
  const games = matches.filter(game => events.has(game.tournamentId) && game.status === 'completed');
  const dateOf = (game: Match) => Date.parse(game.finishedAt ?? events.get(game.tournamentId)!.startsAt) || 0;
  for (const game of [...games].sort((a,b) => dateOf(a) - dateOf(b) || a.id.localeCompare(b.id))) {
    if (game.isBye || (game.outcome && !['normal', 'third_place'].includes(game.outcome))) continue;
    const left = players.get(game.participant1Id ?? '');
    const right = players.get(game.participant2Id ?? '');
    if (!left || !right || left.tournamentId !== game.tournamentId || right.tournamentId !== game.tournamentId) continue;
    if (!game.isDraw && game.winnerId !== left.id && game.winnerId !== right.id) continue;
    const a = ratingFor(left), b = ratingFor(right);
    if (a === b) continue;
    const actual = game.isDraw ? 0.5 : game.winnerId === left.id ? 1 : 0;
    const delta = 32 * (actual - 1 / (1 + 10 ** ((b.elo - a.elo) / 400)));
    a.elo += delta;
    b.elo -= delta;
    if (actual === 1) { a.wins++; b.losses++; }
    if (actual === 0) { b.wins++; a.losses++; }
  }
  for (const event of publicEvents) {
    const finalStage = stages.filter(stage => stage.tournamentId === event.id).sort((a,b) => b.position - a.position)[0];
    if (!finalStage || finalStage.status !== 'completed') continue;
    const stageGames = games.filter(game => game.stageId === finalStage.id && game.tournamentId === event.id);
    const roster = participants.filter(player => player.tournamentId === event.id);
    let champion: Participant | undefined, runnerUp: Participant | undefined;
    if (finalStage.type === 'swiss' || finalStage.type === 'round_robin') {
      const played = new Set(stageGames.flatMap(game => [game.participant1Id, game.participant2Id]));
      const config = finalStage.type === 'swiss' ? { ...swissScoringDefaults, ...finalStage.config } : finalStage.config;
      const standings = computeStandings(stageGames, roster.filter(player => played.has(player.id)),
        config.tiebreakers, config.advanceCount, config, matchPointTotals(stageGames, battles, penalties));
      champion = standings[0]?.participant;
      runnerUp = standings[1]?.participant;
    } else if (finalStage.type === 'single_elimination' || finalStage.type === 'double_elimination') {
      const final = stageGames.filter(game => {
        const round = rounds.find(item => item.id === game.roundId);
        return !game.isBye && game.outcome !== 'third_place' &&
          (round?.bracket === 'grand_final' || (finalStage.type === 'single_elimination' && round?.name === 'Gran Final'));
      }).sort((a,b) => b.position - a.position)[0];
      if (final?.winnerId && [final.participant1Id, final.participant2Id].includes(final.winnerId)) {
        champion = roster.find(player => player.id === final.winnerId);
        runnerUp = roster.find(player => player.id === (final.winnerId === final.participant1Id ? final.participant2Id : final.participant1Id));
      }
    }
    if (!champion || !runnerUp || champion.id === runnerUp.id) continue;
    const latestGame = [...stageGames].sort((a,b) => dateOf(b) - dateOf(a))[0];
    const rating = ratingFor(champion);
    rating.tournamentsWon++;
    awards.push({ id: `event:${event.id}`, tournamentTitle: event.name, champion: champion.displayName,
      runnerUp: runnerUp.displayName, date: (latestGame?.finishedAt ?? event.startsAt).slice(0,10),
      participantsCount: new Set(games.filter(game => game.tournamentId === event.id)
        .flatMap(game => [game.participant1Id, game.participant2Id]).filter(Boolean)).size });
  }
  return { ratings: [...ratings.values()].map(player => ({...player, elo: Math.round(player.elo)})),
    awards: awards.sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)) };
}
