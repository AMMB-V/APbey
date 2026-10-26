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
import { generateRoundRobin } from '../engine/formats/roundRobin';

export const INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'user_admin',
    displayName: 'Alex Mauri (Admin)',
    email: 'admin@beybladex.org',
    role: 'admin',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'user_org_1',
    displayName: 'Liga Beyblade Panamá',
    email: 'organizador@beybladex.org',
    role: 'organizer',
    createdAt: '2026-01-12T11:00:00Z',
  },
  {
    id: 'user_ref_1',
    displayName: 'Juez Roberto (Árbitro Principal)',
    email: 'roberto.ref@beybladex.org',
    role: 'referee',
    createdAt: '2026-01-15T12:00:00Z',
  },
  {
    id: 'user_ref_2',
    displayName: 'Jueza Diana (Árbitro)',
    email: 'diana.ref@beybladex.org',
    role: 'referee',
    createdAt: '2026-01-16T14:30:00Z',
  },
];

export const INITIAL_INVITATIONS: Invitation[] = [
  {
    id: 'inv_1',
    email: 'carlos.juez@arena.com',
    role: 'referee',
    tournamentId: 'tourney_panama_2026',
    status: 'pending',
    invitedBy: 'user_admin',
    createdAt: '2026-02-01T15:00:00Z',
    code: 'BEY-REF-8921',
  },
  {
    id: 'inv_2',
    email: 'club.colon@beyblade.com',
    role: 'organizer',
    status: 'pending',
    invitedBy: 'user_admin',
    createdAt: '2026-02-02T16:20:00Z',
    code: 'BEY-ORG-4412',
  },
];

export const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: 'tourney_panama_2026',
    slug: 'copa-xtreme-panama-2026',
    name: 'Copa Xtreme Beyblade X Panamá 2026',
    description: 'Torneo oficial multietapa de Beyblade X con fase de grupos inicial y cuadro de eliminación directa. Reglas oficiales WBO.',
    organizerId: 'user_org_1',
    status: 'in_progress',
    isPublic: true,
    maxParticipants: 16,
    checkInRequired: true,
    entryFee: 15.0,
    foulPoints: 1,      // 1 punto al rival
    foulsPerPoint: 3,   // Tras 3 faltas acumuladas se otorga 1 punto al rival
    venueName: 'Estadio Xtreme Gaming Center',
    venueAddress: 'Vía España, Ciudad de Panamá',
    country: 'PA',
    startsAt: '2026-03-15T14:00:00Z',
    createdAt: '2026-02-01T09:00:00Z',
    finishPoints: {
      spin: 1,
      over: 2,
      burst: 2,
      xtreme: 3,
    },
    assignedReferees: ['user_ref_1', 'user_ref_2'],
    pointsToWinGroup: 4,    // Parámetro 1: Fase de grupos
    pointsToWinPlayoffs: 5, // Parámetro 2: Cuartos / Semifinales
    pointsToWinFinal: 7,    // Parámetro 3: Gran Final
  },
  {
    id: 'tourney_challonge_masters',
    slug: 'challonge-masters-elimination',
    name: 'Torneo Eliminación Directa Express (Challonge)',
    description: 'Torneo de llave directa para 8 participantes con partido por 3er lugar. Configuración directa best_of = 1.',
    organizerId: 'user_org_1',
    status: 'draft',
    isPublic: true,
    maxParticipants: 8,
    checkInRequired: true,
    entryFee: 10.0,
    foulPoints: 1,
    foulsPerPoint: 3,
    venueName: 'Arena Central Beyblade',
    venueAddress: 'San Francisco, Calle 50',
    country: 'PA',
    startsAt: '2026-03-22T16:00:00Z',
    createdAt: '2026-02-10T11:00:00Z',
    finishPoints: {
      spin: 1,
      over: 2,
      burst: 2,
      xtreme: 3,
    },
    assignedReferees: ['user_ref_1'],
    pointsToWinGroup: 4,
    pointsToWinPlayoffs: 5,
    pointsToWinFinal: 7,
  },
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  // Tourney 1 (16 participants)
  {
    id: 'p_kamen_x',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Kamen X (Ekusu)',
    seed: 1,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Dran Sword 3-60F', 'Dran Dagger 4-60R', 'Dran Buster 1-60A'],
  },
  {
    id: 'p_chrome',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Chrome Ryugu',
    seed: 2,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Cobalt Drake 4-60F', 'Cobalt Dragoon 2-60C', 'Phoenix Wing 9-60GF'],
  },
  {
    id: 'p_bird',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Bird Kazami',
    seed: 3,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Hells Scythe 4-60T', 'Hells Chain 5-60HT', 'Hells Hammer 3-70H'],
  },
  {
    id: 'p_multi',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Multi Nanairo',
    seed: 4,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Wizard Arrow 4-80B', 'Knight Shield 3-80N', 'Wizard Rod 5-70DB'],
  },
  {
    id: 'p_king',
    tournamentId: 'tourney_panama_2026',
    displayName: 'King Manju',
    seed: 5,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Leon Claw 5-60P', 'Leon Crest 7-60GN', 'Shark Edge 3-60LF'],
  },
  {
    id: 'p_meiko',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Meiko Maiden',
    seed: 6,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Rhino Horn 3-80S', 'Viper Tail 5-80O', 'Whale Wave 5-80E'],
  },
  {
    id: 'p_burn',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Burn Fujiwara',
    seed: 7,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Phoenix Feather 3-60F', 'Phoenix Wing 9-60GF', 'Wyvern Gale 5-80GB'],
  },
  {
    id: 'p_taisho',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Taisho (Blader Xtreme)',
    seed: 8,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Knight Lance 4-80HN', 'Unicorn Sting 5-60GP', 'Dran Buster 1-60A'],
  },
  {
    id: 'p_zonamos',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Zonamos V.',
    seed: 9,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Viper Tail 5-80O', 'Wizard Rod 9-60B', 'Hells Scythe 3-60F'],
  },
  {
    id: 'p_yuni',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Yuni Namba',
    seed: 10,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Unicorn Sting 5-60GP', 'Leon Claw 4-60P', 'Shark Edge 1-60LF'],
  },
  {
    id: 'p_cho',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Cho Pan',
    seed: 11,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Rhino Horn 3-80S', 'Sphinx Cowl 9-80GN', 'Dran Sword 3-60F'],
  },
  {
    id: 'p_toguro',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Toguro G.',
    seed: 12,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Shark Edge 3-60LF', 'Phoenix Wing 5-60P', 'Tyranno Beat 4-70Q'],
  },
  {
    id: 'p_susumu',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Susumu K.',
    seed: 13,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Knight Shield 3-80N', 'Hells Chain 9-60HT', 'Wizard Rod 5-70DB'],
  },
  {
    id: 'p_gin',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Gin Ryu',
    seed: 14,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Wyvern Gale 5-80GB', 'Dran Dagger 3-60R', 'Cobalt Drake 4-60F'],
  },
  {
    id: 'p_blader_x2',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Mateo R. (Rookie)',
    seed: 15,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Dran Sword 3-60F', 'Hells Scythe 4-60B', 'Wizard Arrow 4-80B'],
  },
  {
    id: 'p_blader_x3',
    tournamentId: 'tourney_panama_2026',
    displayName: 'Sofía M. (Spin Master)',
    seed: 16,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Wizard Rod 5-70DB', 'Phoenix Wing 9-60GF', 'Leon Crest 7-60GN'],
  },

  // Tourney 2 participants (8 players)
  {
    id: 'p2_1',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Kamen X',
    seed: 1,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Dran Buster 1-60A'],
  },
  {
    id: 'p2_2',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Chrome Ryugu',
    seed: 2,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Cobalt Dragoon 2-60C'],
  },
  {
    id: 'p2_3',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Bird Kazami',
    seed: 3,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Hells Hammer 3-70H'],
  },
  {
    id: 'p2_4',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Multi Nanairo',
    seed: 4,
    checkedIn: true,
    inspected: true,
    status: 'active',
    deckCombos: ['Wizard Rod 5-70DB'],
  },
  {
    id: 'p2_5',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'King Manju',
    seed: 5,
    checkedIn: false,
    inspected: false,
    status: 'registered',
    deckCombos: ['Leon Crest 7-60GN'],
  },
  {
    id: 'p2_6',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Burn Fujiwara',
    seed: 6,
    checkedIn: false,
    inspected: false,
    status: 'registered',
    deckCombos: ['Phoenix Wing 9-60GF'],
  },
  {
    id: 'p2_7',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Zonamos V.',
    seed: 7,
    checkedIn: false,
    inspected: false,
    status: 'registered',
    deckCombos: ['Viper Tail 5-80O'],
  },
  {
    id: 'p2_8',
    tournamentId: 'tourney_challonge_masters',
    displayName: 'Cho Pan',
    seed: 8,
    checkedIn: false,
    inspected: false,
    status: 'registered',
    deckCombos: ['Sphinx Cowl 9-80GN'],
  },
];

export const INITIAL_STAGES: Stage[] = [
  // Tourney 1 Stage 1: Groups (Serpentine 4 groups of 4)
  {
    id: 'stage_groups_1',
    tournamentId: 'tourney_panama_2026',
    position: 1,
    name: 'Fase de Grupos (4 Grupos x 4 Jugadores)',
    type: 'group_stage',
    status: 'in_progress',
    matchType: '3on3',
    pointsToWin: 4, // 4 puntos en grupos
    bestOf: 1,      // 1 set
    config: {
      advanceCount: 2, // pasan los primeros 2 de cada grupo
      groupSize: 4,
      tiebreakers: ['points', 'point_diff', 'points_for', 'head_to_head', 'seed'],
      startRound: 'quarterfinals',
    },
  },
  // Tourney 1 Stage 2: Single Elimination Playoffs (top 8)
  {
    id: 'stage_playoffs_1',
    tournamentId: 'tourney_panama_2026',
    position: 2,
    name: 'Playoffs de Eliminación Directa (Top 8)',
    type: 'single_elimination',
    status: 'pending',
    matchType: '3on3',
    pointsToWin: 7, // 7 puntos en finales
    bestOf: 1,      // Eliminación directa a puntos por defecto (best_of = 1)
    config: {
      thirdPlaceMatch: true,
      tiebreakers: ['points', 'point_diff', 'seed'],
    },
  },
  // Tourney 2 Stage: Single Elimination
  {
    id: 'stage_t2_se',
    tournamentId: 'tourney_challonge_masters',
    position: 1,
    name: 'Cuadro de Eliminación Directa',
    type: 'single_elimination',
    status: 'pending',
    matchType: '1on1',
    pointsToWin: 4,
    bestOf: 1,
    config: {
      thirdPlaceMatch: true,
      tiebreakers: ['points', 'seed'],
    },
  },
];

// Groups for Stage 1 of Tourney 1 (Serpentine: 1,8,9,16 in A; 2,7,10,15 in B; etc.)
export const INITIAL_GROUPS: Group[] = [
  {
    id: 'group_a',
    stageId: 'stage_groups_1',
    name: 'Grupo A',
    position: 1,
    participantIds: ['p_kamen_x', 'p_taisho', 'p_zonamos', 'p_blader_x3'],
    refereeId: 'user_ref_1',
  },
  {
    id: 'group_b',
    stageId: 'stage_groups_1',
    name: 'Grupo B',
    position: 2,
    participantIds: ['p_chrome', 'p_burn', 'p_yuni', 'p_blader_x2'],
    refereeId: 'user_ref_2',
  },
  {
    id: 'group_c',
    stageId: 'stage_groups_1',
    name: 'Grupo C',
    position: 3,
    participantIds: ['p_bird', 'p_meiko', 'p_cho', 'p_gin'],
    refereeId: 'user_ref_1',
  },
  {
    id: 'group_d',
    stageId: 'stage_groups_1',
    name: 'Grupo D',
    position: 4,
    participantIds: ['p_multi', 'p_king', 'p_toguro', 'p_susumu'],
    refereeId: 'user_ref_2',
  },
];

// Generate initial matches and sample battles for Group Stage
function buildInitialGroupMatchesAndBattles(): {
  rounds: Round[];
  matches: Match[];
  battles: Battle[];
  penalties: Penalty[];
} {
  const allRounds: Round[] = [];
  const allMatches: Match[] = [];
  const allBattles: Battle[] = [];
  const allPenalties: Penalty[] = [];

  const tId = 'tourney_panama_2026';
  const sId = 'stage_groups_1';

  for (const group of INITIAL_GROUPS) {
    const groupParticipants = INITIAL_PARTICIPANTS.filter(p => group.participantIds.includes(p.id));
    const rr = generateRoundRobin(tId, sId, groupParticipants, {
      groupId: group.id,
      groupName: group.name,
      legs: 1,
    });
    allRounds.push(...rr.rounds);
    allMatches.push(...rr.matches);
  }

  // Pre-seed some completed battles in Group A match 1 (Kamen X vs Taisho)
  const matchA1 = allMatches.find(m => m.groupId === 'group_a' && m.participant1Id === 'p_kamen_x');
  if (matchA1) {
    matchA1.status = 'completed';
    matchA1.refereeId = 'user_ref_1';
    matchA1.score1 = 4;
    matchA1.score2 = 1;
    matchA1.sets1 = 1;
    matchA1.sets2 = 0;
    matchA1.winnerId = 'p_kamen_x';
    matchA1.startedAt = '2026-03-15T14:10:00Z';
    matchA1.finishedAt = '2026-03-15T14:18:00Z';

    allBattles.push(
      {
        id: 'b_1',
        matchId: matchA1.id,
        battleNumber: 1,
        setNumber: 1,
        scorerId: 'p_taisho',
        finish: 'spin',
        points: 1,
        voided: false,
        recordedBy: 'user_ref_1',
        createdAt: '2026-03-15T14:11:00Z',
      },
      {
        id: 'b_2',
        matchId: matchA1.id,
        battleNumber: 2,
        setNumber: 1,
        scorerId: 'p_kamen_x',
        finish: 'xtreme', // 3 points
        points: 3,
        voided: false,
        recordedBy: 'user_ref_1',
        createdAt: '2026-03-15T14:13:00Z',
      },
      {
        id: 'b_3',
        matchId: matchA1.id,
        battleNumber: 3,
        setNumber: 1,
        scorerId: 'p_kamen_x',
        finish: 'spin', // 1 point -> total 4 pts -> W
        points: 1,
        voided: false,
        recordedBy: 'user_ref_1',
        createdAt: '2026-03-15T14:16:00Z',
      }
    );
  }

  // Pre-seed another match in Group B (Chrome vs Sofia)
  const matchB1 = allMatches.find(m => m.groupId === 'group_b' && m.participant1Id === 'p_chrome');
  if (matchB1) {
    matchB1.status = 'completed';
    matchB1.refereeId = 'user_ref_2';
    matchB1.score1 = 4;
    matchB1.score2 = 2;
    matchB1.sets1 = 1;
    matchB1.sets2 = 0;
    matchB1.winnerId = 'p_chrome';
    matchB1.startedAt = '2026-03-15T14:20:00Z';
    matchB1.finishedAt = '2026-03-15T14:27:00Z';

    allBattles.push(
      {
        id: 'b_4',
        matchId: matchB1.id,
        battleNumber: 1,
        setNumber: 1,
        scorerId: matchB1.participant2Id,
        finish: 'over',
        points: 2,
        voided: false,
        recordedBy: 'user_ref_2',
        createdAt: '2026-03-15T14:21:00Z',
      },
      {
        id: 'b_5',
        matchId: matchB1.id,
        battleNumber: 2,
        setNumber: 1,
        scorerId: 'p_chrome',
        finish: 'burst',
        points: 2,
        voided: false,
        recordedBy: 'user_ref_2',
        createdAt: '2026-03-15T14:23:00Z',
      },
      {
        id: 'b_6',
        matchId: matchB1.id,
        battleNumber: 3,
        setNumber: 1,
        scorerId: 'p_chrome',
        finish: 'over',
        points: 2,
        voided: false,
        recordedBy: 'user_ref_2',
        createdAt: '2026-03-15T14:25:00Z',
      }
    );
  }

  // Match currently in progress for Group C (Bird Kazami vs Cho Pan)
  const matchC1 = allMatches.find(m => m.groupId === 'group_c' && m.participant1Id === 'p_bird');
  if (matchC1) {
    matchC1.status = 'in_progress';
    matchC1.refereeId = 'user_ref_1';
    matchC1.score1 = 3;
    matchC1.score2 = 2;
    matchC1.startedAt = '2026-03-15T14:35:00Z';

    allBattles.push(
      {
        id: 'b_7',
        matchId: matchC1.id,
        battleNumber: 1,
        setNumber: 1,
        scorerId: matchC1.participant2Id,
        finish: 'burst',
        points: 2,
        voided: false,
        recordedBy: 'user_ref_1',
        createdAt: '2026-03-15T14:36:00Z',
      },
      {
        id: 'b_8',
        matchId: matchC1.id,
        battleNumber: 2,
        setNumber: 1,
        scorerId: 'p_bird',
        finish: 'xtreme',
        points: 3,
        voided: false,
        recordedBy: 'user_ref_1',
        createdAt: '2026-03-15T14:38:00Z',
      }
    );
  }

  return {
    rounds: allRounds,
    matches: allMatches,
    battles: allBattles,
    penalties: allPenalties,
  };
}

const seedData = buildInitialGroupMatchesAndBattles();

export const INITIAL_ROUNDS: Round[] = seedData.rounds;
export const INITIAL_MATCHES: Match[] = seedData.matches;
export const INITIAL_BATTLES: Battle[] = seedData.battles;
export const INITIAL_PENALTIES: Penalty[] = seedData.penalties;
