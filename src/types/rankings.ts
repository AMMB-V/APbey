export interface BladerRanking {
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
  id: string;
  tournamentTitle: string;
  champion: string;
  runnerUp?: string;
  date: string;
  winningCombo?: string;
  participantsCount?: number;
}
