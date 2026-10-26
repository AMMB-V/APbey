export type UserRole = 'admin' | 'organizer' | 'referee' | 'blader' | 'public';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type TournamentStatus = 'draft' | 'registration' | 'in_progress' | 'completed' | 'cancelled';
export type StageType = 'single_elimination' | 'double_elimination' | 'round_robin' | 'swiss' | 'group_stage';
export type StageStatus = 'pending' | 'in_progress' | 'completed';
export type MatchType = '1on1' | '3on3';
export type FinishType = 'spin' | 'over' | 'burst' | 'xtreme';
export type CardType = 'yellow' | 'red';
export type ParticipantStatus = 'registered' | 'active' | 'eliminated' | 'disqualified' | 'withdrawn';
export type BracketType = 'winners' | 'losers' | 'grand_final' | 'group' | 'swiss';
export type MatchStatus = 'pending' | 'in_progress' | 'completed';

export type TiebreakerCriteria =
  | 'points'
  | 'point_diff'
  | 'points_for'
  | 'points_average'
  | 'points_ratio'
  | 'head_to_head'
  | 'buchholz'
  | 'seed';

export interface FinishPointsConfig {
  spin: number;   // default 1
  over: number;   // default 2
  burst: number;  // default 2
  xtreme: number; // default 3
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  description?: string;
  organizerId: string;
  status: TournamentStatus;
  isPublic: boolean;
  maxParticipants?: number;
  checkInRequired: boolean;
  entryFee: number;
  foulPoints: number;      // default 1 punto
  foulsPerPoint: number;   // default 3 faltas acumuladas para dar 1 punto al rival
  venueName?: string;
  venueAddress?: string;
  country: string;         // default 'PA' or similar
  startsAt: string;
  createdAt: string;
  finishPoints: FinishPointsConfig;
  assignedReferees: string[]; // profile IDs
  // Parámetros de puntos configurables (hasta 3 parámetros de puntos)
  pointsToWinGroup: number;    // Parámetro 1: Fase regular / grupos (ej. 4 pts)
  pointsToWinPlayoffs: number; // Parámetro 2: Cuartos / Semifinales (ej. 5 o 6 pts)
  pointsToWinFinal: number;    // Parámetro 3: Gran Final (ej. 7 o 10 pts)
}

export interface StageConfig {
  advanceCount?: number;          // primeros N de cada grupo que pasan (default 2)
  groupSize?: number;             // tamaño de grupo (default 4)
  swissRounds?: number;           // rondas suizas (default 3-5)
  grandFinalReset?: boolean;      // reset en doble eliminación (default true)
  thirdPlaceMatch?: boolean;      // partido por 3er lugar (default true)
  tiebreakers: TiebreakerCriteria[];
  startRound?: string;            // 'round_of_32' | 'round_of_16' | 'quarterfinals'
  pointsToWinGroup?: number;      // Parámetro 1
  pointsToWinPlayoffs?: number;   // Parámetro 2
  pointsToWinFinal?: number;      // Parámetro 3
}

export interface Stage {
  id: string;
  tournamentId: string;
  position: number;
  name: string;
  type: StageType;
  status: StageStatus;
  matchType: MatchType;
  pointsToWin: number;            // default 4 en grupos, 7 en eliminación final
  bestOf: number;                 // default 1 (eliminación directa a puntos)
  config: StageConfig;
}

export interface Participant {
  id: string;
  tournamentId: string;
  profileId?: string;
  displayName: string;
  seed: number;
  checkedIn: boolean;
  inspected: boolean;             // Bey Check realizado
  status: ParticipantStatus;
  deckCombos?: string[];          // e.g. ["Dran Sword 3-60F", "Hells Scythe 4-60B", "Wizard Rod 5-70DB"]
}

export interface Group {
  id: string;
  stageId: string;
  name: string;                   // 'Grupo A', 'Grupo B', etc.
  position: number;
  participantIds: string[];
  refereeId?: string | null;      // Árbitro asignado al grupo completo
}

export interface Round {
  id: string;
  stageId: string;
  groupId?: string;
  number: number;
  bracket: BracketType;
  name: string;                   // e.g. 'Octavos de Final', 'Semifinales', 'Ronda 1'
}

export interface Match {
  id: string;
  tournamentId: string;
  stageId: string;
  roundId: string;
  groupId?: string;
  position: number;
  participant1Id?: string | null;
  participant2Id?: string | null;
  winnerId?: string | null;
  isDraw: boolean;
  isBye: boolean;
  score1: number;
  score2: number;
  sets1: number;
  sets2: number;
  status: MatchStatus;
  refereeId?: string | null;
  nextMatchWinnerId?: string | null;
  nextMatchLoserId?: string | null;
  version: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  station?: string | null;            // e.g. 'Estadio 1', 'Mesa 2', 'Arena Xtreme'
  calledToStation?: boolean;         // true si los jugadores fueron llamados por proyector
}

export interface Battle {
  id: string;
  matchId: string;
  battleNumber: number;
  setNumber: number;
  scorerId?: string | null;        // null si empate
  finish?: FinishType | null;     // null si empate
  points: number;
  voided: boolean;
  recordedBy: string;
  createdAt: string;
  note?: string;
}

export interface Penalty {
  id: string;
  matchId: string;
  battleId?: string;
  participantId: string;
  card: CardType;
  isFoul: boolean;
  pointsAwarded: number;
  awardedTo?: string | null;
  reason?: string;
  issuedBy: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'insert' | 'update' | 'delete' | 'reopen' | 'undo';
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  actor: string;
  createdAt: string;
  note?: string;
}

export interface GroupStandingRow {
  participantId: string;
  participant: Participant;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  points: number;              // 3 por victoria, 1 por empate
  pointsAverage?: number;      // Puntos promedio anotados por combate (PF / partidos jugados)
  pointsRatio?: number;        // Cociente / ratio de puntos (PF / PC)
  buchholz?: number;
  rank: number;
  advances: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: 'organizer' | 'referee';
  tournamentId?: string;
  status: 'pending' | 'accepted' | 'revoked';
  invitedBy: string;
  createdAt: string;
  code: string;
}
