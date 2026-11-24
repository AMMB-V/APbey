import type { Battle, Match, Participant, Penalty, Round, Stage, Tournament, TournamentCategory } from '../../types/tournament';
import { swissScoringDefaults } from './formats/swiss';
import { computeStandings, matchPointTotals } from './tiebreakers';

const MAJOR_POINTS = [50, 45, 40, 35, 30, 25, 20, 15] as const;
const STANDARD_POINTS = [30, 26, 24, 21, 20, 18, 17, 15] as const;

export function officialPlacementPoints(category: TournamentCategory, position: number) {
  const major = category === 'super' || category === 'grand';
  if (position >= 1 && position <= 8) return (major ? MAJOR_POINTS : STANDARD_POINTS)[position - 1];
  if (position <= 16) return 11;
  if (position <= 32) return major ? 3 : 5;
  return 3;
}

function stageStandings(stage: Stage, roster: Participant[], games: Match[], battles: Battle[], penalties: Penalty[]) {
  const played = new Set(games.flatMap(game => [game.participant1Id, game.participant2Id]).filter(Boolean));
  const config = stage.type === 'swiss' ? { ...swissScoringDefaults, ...stage.config } : stage.config;
  return computeStandings(games, roster.filter(player => played.has(player.id)),
    config.tiebreakers, undefined, config, matchPointTotals(games, battles, penalties)).map(row => row.participant);
}

export interface TournamentPlacement {
  participant: Participant;
  position: number;
  points: number;
  swissKing: boolean;
}

export function tournamentRankingPlacements(tournament: Tournament, stages: Stage[], rounds: Round[], matches: Match[],
  participants: Participant[], battles: Battle[], penalties: Penalty[]): TournamentPlacement[] {
  if (!tournament.isPublic || tournament.status !== 'completed') return [];
  const roster = participants.filter(player => player.tournamentId === tournament.id);
  if (!roster.length) return [];
  const eventStages = stages.filter(stage => stage.tournamentId === tournament.id).sort((a, b) => a.position - b.position);
  const finalStage = eventStages[eventStages.length - 1];
  if (!finalStage || finalStage.status !== 'completed') return [];
  const completed = matches.filter(game => game.tournamentId === tournament.id && game.stageId === finalStage.id &&
    game.status === 'completed' && !game.isBye);
  if (!completed.length) return [];

  const swissStage = eventStages.find(stage => stage.type === 'swiss' && stage.status === 'completed');
  const swissGames = swissStage ? matches.filter(game => game.stageId === swissStage.id && game.status === 'completed' && !game.isBye) : [];
  const swissKingId = swissStage && swissGames.length
    ? stageStandings(swissStage, roster, swissGames, battles, penalties)[0]?.id
    : undefined;

  let ordered: Participant[];
  if (['swiss', 'round_robin', 'group_stage'].includes(finalStage.type)) {
    ordered = stageStandings(finalStage, roster, completed, battles, penalties);
  } else {
    const roundById = new Map(rounds.filter(round => round.stageId === finalStage.id).map(round => [round.id, round]));
    const totals = matchPointTotals(completed, battles, penalties);
    const stats = new Map(roster.map(player => [player.id, { player, wins: 0, losses: 0, depth: 0, diff: 0 }]));
    for (const game of completed) {
      const left = stats.get(game.participant1Id ?? ''), right = stats.get(game.participant2Id ?? '');
      if (!left || !right) continue;
      const round = roundById.get(game.roundId);
      const bracketWeight = round?.bracket === 'grand_final' ? 3000 : round?.bracket === 'losers' ? 2000 : 1000;
      const depth = bracketWeight + (round?.number ?? 0);
      left.depth = Math.max(left.depth, depth); right.depth = Math.max(right.depth, depth);
      const [a, b] = totals(game); left.diff += a - b; right.diff += b - a;
      if (game.winnerId === left.player.id) { left.wins++; right.losses++; }
      if (game.winnerId === right.player.id) { right.wins++; left.losses++; }
    }
    const final = completed.filter(game => roundById.get(game.roundId)?.bracket === 'grand_final' ||
      (finalStage.type === 'single_elimination' && roundById.get(game.roundId)?.name === 'Gran Final'))
      .sort((a, b) => b.position - a.position)[0];
    const championId = final?.winnerId;
    const runnerUpId = final && championId
      ? (final.participant1Id === championId ? final.participant2Id : final.participant1Id)
      : undefined;
    ordered = [...stats.values()].sort((a, b) => {
      if (a.player.id === championId) return -1;
      if (b.player.id === championId) return 1;
      if (a.player.id === runnerUpId) return -1;
      if (b.player.id === runnerUpId) return 1;
      return b.depth - a.depth || b.wins - a.wins || a.losses - b.losses || b.diff - a.diff ||
        a.player.seed - b.player.seed || a.player.id.localeCompare(b.player.id);
    }).map(row => row.player);
  }

  const included = new Set(ordered.map(player => player.id));
  ordered.push(...roster.filter(player => !included.has(player.id)).sort((a, b) => a.seed - b.seed || a.id.localeCompare(b.id)));
  return ordered.map((participant, index) => {
    const swissKing = participant.id === swissKingId;
    return { participant, position: index + 1,
      points: officialPlacementPoints(tournament.category || 'clash', index + 1) + (swissKing ? 5 : 0), swissKing };
  });
}
