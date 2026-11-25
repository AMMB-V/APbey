import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { RefereeAssignmentView } from './RefereeAssignmentView';

const state = vi.hoisted(() => ({ type: 'swiss' }));
vi.mock('../../context/TournamentContext', () => ({
  useTournament: () => ({
    tournaments: [{ id: 't', name: 'Torneo' }], activeTournamentId: 't',
    activeTournament: { id: 't', name: 'Torneo' },
    stages: [{ id: 's', tournamentId: 't', name: 'Etapa', type: state.type, config: { head_referee_id: 'r' } }],
    users: [{ id: 'r', displayName: 'Oficial', role: 'referee', email: '' }],
    matches: [{ id: 'm', stageId: 's', tournamentId: 't', position: 1, station: 'Mesa 3', refereeId: 'r' }],
    rounds: [], groups: [], participants: [], supabaseSyncInfo: { isConfigured: true },
  }),
}));

it.each(['swiss', 'double_elimination', 'single_elimination', 'round_robin', 'group_stage'])(
  'permite seleccionar el árbitro de la fase %s sin grupos creados', type => {
    state.type = type;
    const html = renderToStaticMarkup(<RefereeAssignmentView />);
    expect(html).toContain('Árbitro principal de la fase');
    expect(html).toContain('value="r" selected=""');
    if (type !== 'group_stage') {
      expect(html).toContain('Árbitros por combate');
      expect(html).toContain('Mesa 3');
    }
  }
);
