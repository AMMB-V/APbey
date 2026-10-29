import {
  Battle,
  Group,
  Invitation,
  Match,
  Participant,
  Penalty,
  Round,
  Stage,
  Tournament,
  UserProfile,
} from '../../types/tournament';

/**
 * Production starts without demo tournaments, participants, scores or accounts.
 * Real records are loaded from Supabase or created through the application.
 */
export const INITIAL_PROFILES: UserProfile[] = [];
export const INITIAL_INVITATIONS: Invitation[] = [];
export const INITIAL_TOURNAMENTS: Tournament[] = [];
export const INITIAL_PARTICIPANTS: Participant[] = [];
export const INITIAL_STAGES: Stage[] = [];
export const INITIAL_GROUPS: Group[] = [];
export const INITIAL_ROUNDS: Round[] = [];
export const INITIAL_MATCHES: Match[] = [];
export const INITIAL_BATTLES: Battle[] = [];
export const INITIAL_PENALTIES: Penalty[] = [];
