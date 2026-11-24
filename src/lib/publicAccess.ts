import type { Tournament } from '../types/tournament';
import type { MainTabType } from '../components/common/Header';

export const PUBLIC_TABS: readonly MainTabType[] = ['torneos', 'bracket', 'rankings', 'participants'];

export function publicTab(requestedTab: MainTabType): MainTabType {
  return PUBLIC_TABS.includes(requestedTab) ? requestedTab : 'torneos';
}

export function isPublicTournamentVisible(
  tournament: Pick<Tournament, 'isPublic' | 'status'> | null | undefined,
): boolean {
  return Boolean(tournament?.isPublic &&
    (tournament.status === 'registration' || tournament.status === 'in_progress'));
}
