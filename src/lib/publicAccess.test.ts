import { describe, expect, it } from 'vitest';
import { isPublicTournamentVisible, publicTab } from './publicAccess';

describe('public access policy', () => {
  it.each(['torneos', 'bracket', 'rankings', 'participants'] as const)(
    'allows the public view %s',
    (tab) => expect(publicTab(tab)).toBe(tab),
  );

  it.each(['overview', 'marcador', 'referee', 'deck', 'tierlist', 'profile', 'wizard', 'admin'] as const)(
    'redirects the operational view %s to tournaments',
    (tab) => expect(publicTab(tab)).toBe('torneos'),
  );

  it('only publishes public tournaments that are registering or live', () => {
    expect(isPublicTournamentVisible({ isPublic: true, status: 'registration' })).toBe(true);
    expect(isPublicTournamentVisible({ isPublic: true, status: 'in_progress' })).toBe(true);
    expect(isPublicTournamentVisible({ isPublic: true, status: 'draft' })).toBe(false);
    expect(isPublicTournamentVisible({ isPublic: true, status: 'completed' })).toBe(false);
    expect(isPublicTournamentVisible({ isPublic: false, status: 'in_progress' })).toBe(false);
  });
});
