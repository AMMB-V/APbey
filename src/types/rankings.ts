export type RankingSeason = 1 | 2;

export interface BladerRanking {
  season?: RankingSeason;
  id: string;
  name: string;
  points: number;
  elo: number;
  wins: number;
  losses: number;
  tournamentsWon: number;
  favoriteCombo?: string;
}

export interface HallOfFameEntry {
  season?: RankingSeason;
  id: string;
  tournamentTitle: string;
  champion: string;
  runnerUp?: string;
  date: string;
  winningCombo?: string;
  participantsCount?: number;
}
