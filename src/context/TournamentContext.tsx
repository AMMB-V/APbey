import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  AuditLog,
  Battle,
  FinishType,
  Group,
  Invitation,
  Match,
  Participant,
  Penalty,
  Round,
  Stage,
  StageConfig,
  StageType,
  TiebreakerCriteria,
  Tournament,
  UserProfile,
  UserRole,
} from '../types/tournament';
import { persistStageTiebreakers } from '../lib/storage/backendPersistence';
import {
  applyBattle,
  applyPenalty,
  undoLastBattle,
} from '../lib/engine/arbitration';
import {
  advanceGroupStageToPlayoffs,
} from '../lib/engine/advancement';
import {
  generateSingleElimination,
} from '../lib/engine/formats/singleElimination';
import {
  generateRoundRobin,
} from '../lib/engine/formats/roundRobin';
import {
  buildSerpentineGroups,
  normalizeSeeds,
  shuffleSeeds,
} from '../lib/engine/seeding';
import {
  INITIAL_BATTLES,
  INITIAL_GROUPS,
  INITIAL_INVITATIONS,
  INITIAL_MATCHES,
  INITIAL_PARTICIPANTS,
  INITIAL_PENALTIES,
  INITIAL_PROFILES,
  INITIAL_ROUNDS,
  INITIAL_STAGES,
  INITIAL_TOURNAMENTS,
} from '../lib/storage/mockData';

interface TournamentContextType {
  // Current user & role
  currentUser: UserProfile;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  users: UserProfile[];

  // Tournaments
  tournaments: Tournament[];
  activeTournamentId: string;
  activeTournament: Tournament | undefined;
  setActiveTournamentId: (id: string) => void;
  createTournament: (data: Partial<Tournament>, stageType: StageType, stageConfig: StageConfig) => Tournament;
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  duplicateTournament: (id: string) => Tournament;

  // Stages & Brackets
  stages: Stage[];
  groups: Group[];
  rounds: Round[];
  matches: Match[];
  participants: Participant[];
  battles: Battle[];
  penalties: Penalty[];
  invitations: Invitation[];
  auditLogs: AuditLog[];

  // Participant actions
  addParticipant: (tournamentId: string, displayName: string, deckCombos?: string[]) => Participant;
  addBulkParticipants: (tournamentId: string, names: string[]) => void;
  removeParticipant: (id: string) => void;
  toggleCheckIn: (id: string) => void;
  checkInAll: (tournamentId: string) => void;
  toggleInspected: (id: string) => void;
  reorderParticipants: (tournamentId: string, reordered: Participant[]) => void;
  randomizeParticipants: (tournamentId: string) => void;

  // Tournament flow actions
  generateBracketForStage: (stageId: string) => void;
  startStage: (stageId: string) => void;
  advanceCurrentStage: (stageId: string) => void;
  updateStage: (stageId: string, updates: Partial<Stage>) => Promise<void>;
  updateStageConfig: (stageId: string, configUpdates: Partial<StageConfig>) => Promise<void>;
  updateStageTiebreakers: (stageId: string, tiebreakers: TiebreakerCriteria[]) => Promise<{ persistedIn: 'backend' | 'local'; timestamp: string; message: string }>;

  // Referee & Match actions
  recordBattle: (matchId: string, scorerId: string | null, finish: FinishType | null, note?: string) => void;
  recordPenalty: (matchId: string, offenderId: string, card?: 'yellow' | 'red', isFoul?: boolean, reason?: string) => void;
  undoBattle: (matchId: string) => void;
  assignReferee: (matchId: string, refereeId: string | null) => void;
  assignRefereeToGroup: (groupId: string, refereeId: string | null) => void;
  claimMatchAsReferee: (matchId: string) => void;
  moveParticipantToGroup: (participantId: string, toGroupId: string) => void;
  rebalanceGroups: (stageId: string, targetGroupSize?: number) => void;
  assignStationToMatch: (matchId: string, station: string | null) => void;
  callMatchToStation: (matchId: string) => void;
  dismissStationCall: (matchId: string) => void;
  activeStationAlert: { matchId: string; message: string; timestamp: number } | null;
  showStadiumModal: boolean;
  setShowStadiumModal: (show: boolean) => void;

  // Admin actions
  createInvitation: (email: string, role: 'organizer' | 'referee', tournamentId?: string) => Invitation;
  revokeInvitation: (id: string) => void;
  changeUserRole: (userId: string, newRole: UserRole) => void;

  // Reset
  resetAllData: () => void;
}

const STORAGE_KEY = 'bey_tournament_arena_v1';

const TournamentContext = createContext<TournamentContextType | null>(null);

export const TournamentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load persisted state or fallback to initial mock data
  const [currentRole, setCurrentRole] = useState<UserRole>('organizer');
  const [users, setUsers] = useState<UserProfile[]>(INITIAL_PROFILES);
  const [tournaments, setTournaments] = useState<Tournament[]>(INITIAL_TOURNAMENTS);
  const [activeTournamentId, setActiveTournamentId] = useState<string>(INITIAL_TOURNAMENTS[0].id);
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [groups, setGroups] = useState<Group[]>(INITIAL_GROUPS);
  const [rounds, setRounds] = useState<Round[]>(INITIAL_ROUNDS);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [battles, setBattles] = useState<Battle[]>(INITIAL_BATTLES);
  const [penalties, setPenalties] = useState<Penalty[]>(INITIAL_PENALTIES);
  const [invitations, setInvitations] = useState<Invitation[]>(INITIAL_INVITATIONS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'audit_init',
      tableName: 'tournaments',
      recordId: 'tourney_panama_2026',
      action: 'insert',
      actor: 'user_org_1',
      createdAt: '2026-02-01T09:00:00Z',
      note: 'Torneo creado con fase de grupos inicial (4 grupos de 4) y playoffs.',
    },
  ]);
  const [activeStationAlert, setActiveStationAlert] = useState<{ matchId: string; message: string; timestamp: number } | null>(null);
  const [showStadiumModal, setShowStadiumModal] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.tournaments?.length) setTournaments(data.tournaments);
        if (data.stages?.length) setStages(data.stages);
        if (data.groups?.length) setGroups(data.groups);
        if (data.rounds?.length) setRounds(data.rounds);
        if (data.matches?.length) setMatches(data.matches);
        if (data.participants?.length) setParticipants(data.participants);
        if (data.battles?.length) setBattles(data.battles);
        if (data.penalties?.length) setPenalties(data.penalties);
        if (data.invitations?.length) setInvitations(data.invitations);
        if (data.auditLogs?.length) setAuditLogs(data.auditLogs);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveState = (newData: Partial<{
    tournaments: Tournament[];
    stages: Stage[];
    groups: Group[];
    rounds: Round[];
    matches: Match[];
    participants: Participant[];
    battles: Battle[];
    penalties: Penalty[];
    invitations: Invitation[];
    auditLogs: AuditLog[];
  }>) => {
    try {
      const current = {
        tournaments,
        stages,
        groups,
        rounds,
        matches,
        participants,
        battles,
        penalties,
        invitations,
        auditLogs,
        ...newData,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  };

  const currentUser = users.find(u => u.role === currentRole) || users[0];

  const switchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
  };

  const activeTournament = tournaments.find(t => t.id === activeTournamentId) || tournaments[0];

  const logAudit = (
    tableName: string,
    recordId: string,
    action: AuditLog['action'],
    note?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ) => {
    const entry: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tableName,
      recordId,
      action,
      actor: currentUser.id,
      createdAt: new Date().toISOString(),
      note,
      oldData,
      newData,
    };
    setAuditLogs(prev => {
      const updated = [entry, ...prev];
      saveState({ auditLogs: updated });
      return updated;
    });
  };

  // Add Participant
  const addParticipant = (tournamentId: string, displayName: string, deckCombos?: string[]): Participant => {
    const tParticipants = participants.filter(p => p.tournamentId === tournamentId);
    const newSeed = tParticipants.length + 1;
    const newP: Participant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      tournamentId,
      displayName: displayName.trim(),
      seed: newSeed,
      checkedIn: true,
      inspected: false,
      status: 'registered',
      deckCombos: deckCombos && deckCombos.length > 0 ? deckCombos : ['Dran Sword 3-60F'],
    };

    setParticipants(prev => {
      const updated = [...prev, newP];
      saveState({ participants: updated });
      return updated;
    });

    logAudit('participants', newP.id, 'insert', `Blader ${displayName} registrado con siembra #${newSeed}`);
    return newP;
  };

  // Bulk add participants
  const addBulkParticipants = (tournamentId: string, names: string[]) => {
    const tParticipants = participants.filter(p => p.tournamentId === tournamentId);
    let nextSeed = tParticipants.length + 1;
    const createdList: Participant[] = [];

    for (const rawName of names) {
      const name = rawName.trim();
      if (!name) continue;
      createdList.push({
        id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        tournamentId,
        displayName: name,
        seed: nextSeed++,
        checkedIn: true,
        inspected: false,
        status: 'registered',
        deckCombos: ['Dran Sword 3-60F', 'Hells Scythe 4-60B', 'Wizard Rod 5-70DB'],
      });
    }

    if (createdList.length > 0) {
      setParticipants(prev => {
        const updated = [...prev, ...createdList];
        saveState({ participants: updated });
        return updated;
      });
      logAudit('participants', tournamentId, 'insert', `Importación masiva de ${createdList.length} participantes.`);
    }
  };

  const removeParticipant = (id: string) => {
    const p = participants.find(part => part.id === id);
    if (!p) return;
    setParticipants(prev => {
      const filtered = prev.filter(part => part.id !== id);
      // Renormalize seeds
      const normalized = filtered.map((part) => {
        if (part.tournamentId === p.tournamentId) {
          const tList = filtered.filter(x => x.tournamentId === p.tournamentId);
          const idx = tList.findIndex(x => x.id === part.id);
          return { ...part, seed: idx + 1 };
        }
        return part;
      });
      saveState({ participants: normalized });
      return normalized;
    });
    logAudit('participants', id, 'delete', `Participante ${p.displayName} eliminado.`);
  };

  const toggleCheckIn = (id: string) => {
    setParticipants(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, checkedIn: !p.checkedIn } : p);
      saveState({ participants: updated });
      return updated;
    });
  };

  const checkInAll = (tournamentId: string) => {
    setParticipants(prev => {
      const updated = prev.map(p => p.tournamentId === tournamentId ? { ...p, checkedIn: true } : p);
      saveState({ participants: updated });
      return updated;
    });
    logAudit('participants', tournamentId, 'update', 'Check-in masivo aplicado a todos los bladers.');
  };

  const toggleInspected = (id: string) => {
    setParticipants(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, inspected: !p.inspected } : p);
      saveState({ participants: updated });
      return updated;
    });
  };

  const reorderParticipants = (tournamentId: string, reordered: Participant[]) => {
    const normalized = normalizeSeeds(reordered);
    setParticipants(prev => {
      const others = prev.filter(p => p.tournamentId !== tournamentId);
      const updated = [...others, ...normalized];
      saveState({ participants: updated });
      return updated;
    });
    logAudit('participants', tournamentId, 'update', 'Siembra manual reordenada por el organizador.');
  };

  const randomizeParticipants = (tournamentId: string) => {
    const tParts = participants.filter(p => p.tournamentId === tournamentId);
    const shuffled = shuffleSeeds(tParts);
    setParticipants(prev => {
      const others = prev.filter(p => p.tournamentId !== tournamentId);
      const updated = [...others, ...shuffled];
      saveState({ participants: updated });
      return updated;
    });
    logAudit('participants', tournamentId, 'update', 'Siembra aleatoria generada.');
  };

  // Generate bracket for a stage (groups or single elimination)
  const generateBracketForStage = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    const tParts = participants.filter(p => p.tournamentId === stage.tournamentId);

    if (stage.type === 'single_elimination') {
      const se = generateSingleElimination(stage.tournamentId, stage.id, tParts, {
        thirdPlaceMatch: stage.config.thirdPlaceMatch,
      });

      setRounds(prev => {
        const others = prev.filter(r => r.stageId !== stage.id);
        const updated = [...others, ...se.rounds];
        saveState({ rounds: updated });
        return updated;
      });

      setMatches(prev => {
        const others = prev.filter(m => m.stageId !== stage.id);
        const updated = [...others, ...se.matches];
        saveState({ matches: updated });
        return updated;
      });
    } else if (stage.type === 'group_stage') {
      const groupSize = stage.config.groupSize || 4;
      const numGroups = Math.max(1, Math.ceil(tParts.length / groupSize));
      const serpentineGroups = buildSerpentineGroups(tParts, numGroups);

      const createdGroups: Group[] = [];
      const createdRounds: Round[] = [];
      const createdMatches: Match[] = [];

      serpentineGroups.forEach((groupBladers, idx) => {
        const groupLetter = String.fromCharCode(65 + idx); // 'A', 'B', 'C'...
        const groupId = `${stage.id}_grp_${groupLetter.toLowerCase()}`;
        const groupName = `Grupo ${groupLetter}`;

        createdGroups.push({
          id: groupId,
          stageId: stage.id,
          name: groupName,
          position: idx + 1,
          participantIds: groupBladers.map(b => b.id),
        });

        const rr = generateRoundRobin(stage.tournamentId, stage.id, groupBladers, {
          groupId,
          groupName,
          legs: 1,
        });

        createdRounds.push(...rr.rounds);
        createdMatches.push(...rr.matches);
      });

      setGroups(prev => {
        const others = prev.filter(g => g.stageId !== stage.id);
        const updated = [...others, ...createdGroups];
        saveState({ groups: updated });
        return updated;
      });

      setRounds(prev => {
        const others = prev.filter(r => r.stageId !== stage.id);
        const updated = [...others, ...createdRounds];
        saveState({ rounds: updated });
        return updated;
      });

      setMatches(prev => {
        const others = prev.filter(m => m.stageId !== stage.id);
        const updated = [...others, ...createdMatches];
        saveState({ matches: updated });
        return updated;
      });
    }

    logAudit('stages', stage.id, 'update', `Estructura de bracket/grupos generada para etapa ${stage.name}.`);
  };

  const startStage = (stageId: string) => {
    // Generate bracket if empty
    const existingMatches = matches.filter(m => m.stageId === stageId);
    if (existingMatches.length === 0) {
      generateBracketForStage(stageId);
    }

    setStages(prev => {
      const updated = prev.map(s => s.id === stageId ? { ...s, status: 'in_progress' as const } : s);
      saveState({ stages: updated });
      return updated;
    });

    setTournaments(prev => {
      const stage = stages.find(s => s.id === stageId);
      if (!stage) return prev;
      const updated = prev.map(t => t.id === stage.tournamentId ? { ...t, status: 'in_progress' as const } : t);
      saveState({ tournaments: updated });
      return updated;
    });

    logAudit('stages', stageId, 'update', 'Etapa iniciada. El arbitraje ya está activo.');
  };

  // Advance stage to playoffs (from groups or swiss)
  const advanceCurrentStage = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    const stageGroups = groups.filter(g => g.stageId === stageId);
    const stageMatches = matches.filter(m => m.stageId === stageId);
    const tParts = participants.filter(p => p.tournamentId === stage.tournamentId);

    const result = advanceGroupStageToPlayoffs(
      stage.tournamentId,
      stage,
      stageGroups,
      stageMatches,
      tParts,
      {
        name: 'Fase Final (Eliminación Directa)',
        pointsToWin: tournaments.find(t => t.id === stage.tournamentId)?.pointsToWinFinal || 7,
        bestOf: 1,      // default best of 1
        thirdPlaceMatch: true,
      }
    );

    // Collect referees from groups to move them over to the playoff matches
    const activeReferees = Array.from(new Set([
      ...stageGroups.map(g => g.refereeId).filter(Boolean),
      ...(tournaments.find(t => t.id === stage.tournamentId)?.assignedReferees || [])
    ])) as string[];

    const playoffMatchesWithReferees = result.nextMatches.map((m, idx) => {
      if (activeReferees.length > 0) {
        return {
          ...m,
          refereeId: activeReferees[idx % activeReferees.length],
        };
      }
      return m;
    });

    // Update current stage to completed
    setStages(prev => {
      const updated = prev.map(s => s.id === stageId ? { ...s, status: 'completed' as const } : s);
      const withNewStage = [...updated, result.nextStage];
      saveState({ stages: withNewStage });
      return withNewStage;
    });

    setRounds(prev => {
      const updated = [...prev, ...result.nextRounds];
      saveState({ rounds: updated });
      return updated;
    });

    setMatches(prev => {
      const updated = [...prev, ...playoffMatchesWithReferees];
      saveState({ matches: updated });
      return updated;
    });

    logAudit(
      'stages',
      result.nextStage.id,
      'insert',
      `Transición de etapa completada: clasificados ${result.qualifiers.map(q => q.displayName).join(', ')} a la fase de playoffs.`
    );
  };

  const updateStage = async (stageId: string, updates: Partial<Stage>) => {
    let targetStage: Stage | undefined;
    setStages(prev => {
      const updated = prev.map(s => {
        if (s.id === stageId) {
          targetStage = { ...s, ...updates };
          return targetStage;
        }
        return s;
      });
      saveState({ stages: updated });
      return updated;
    });

    if (targetStage) {
      await persistStageTiebreakers(stageId, targetStage.config.tiebreakers, targetStage.config);
    }
    logAudit('stages', stageId, 'update', `Etapa "${targetStage?.name || stageId}" actualizada.`);
  };

  const updateStageConfig = async (stageId: string, configUpdates: Partial<StageConfig>) => {
    let targetStage: Stage | undefined;
    setStages(prev => {
      const updated = prev.map(s => {
        if (s.id === stageId) {
          targetStage = {
            ...s,
            config: {
              ...s.config,
              ...configUpdates,
            },
          };
          return targetStage;
        }
        return s;
      });
      saveState({ stages: updated });
      return updated;
    });

    if (targetStage) {
      await persistStageTiebreakers(stageId, targetStage.config.tiebreakers, targetStage.config);
    }
    logAudit('stages', stageId, 'update', `Configuración técnica de etapa "${targetStage?.name || stageId}" actualizada.`);
  };

  const updateStageTiebreakers = async (stageId: string, tiebreakers: TiebreakerCriteria[]) => {
    let targetStageName = stageId;
    let targetStage: Stage | undefined;
    setStages(prev => {
      const updated = prev.map(s => {
        if (s.id === stageId) {
          targetStageName = s.name;
          targetStage = {
            ...s,
            config: {
              ...s.config,
              tiebreakers,
            },
          };
          return targetStage;
        }
        return s;
      });
      saveState({ stages: updated });
      return updated;
    });

    const result = await persistStageTiebreakers(stageId, tiebreakers, targetStage?.config);
    logAudit(
      'stages',
      stageId,
      'update',
      `Reglas de desempate de la etapa "${targetStageName}" persistidas (${result.persistedIn === 'backend' ? 'Base de datos backend' : 'Caché local'}). Criterios: ${tiebreakers.join(' → ')}`
    );

    return result;
  };
  const recordBattle = (
    matchId: string,
    scorerId: string | null,
    finish: FinishType | null,
    note?: string
  ) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const stage = stages.find(s => s.id === match.stageId);
    const tournament = tournaments.find(t => t.id === match.tournamentId);
    if (!stage || !tournament) return;

    const { updatedMatch, newBattle } = applyBattle(
      match,
      stage,
      tournament,
      scorerId,
      finish,
      currentUser.id,
      battles
    );

    if (note) newBattle.note = note;

    // If match completed, advance winner in bracket!
    let nextMatches = matches.map(m => m.id === matchId ? updatedMatch : m);

    if (updatedMatch.status === 'completed' && updatedMatch.winnerId) {
      if (updatedMatch.nextMatchWinnerId) {
        nextMatches = nextMatches.map(nm => {
          if (nm.id === updatedMatch.nextMatchWinnerId) {
            // Place winner in first empty slot
            if (!nm.participant1Id) return { ...nm, participant1Id: updatedMatch.winnerId };
            if (!nm.participant2Id) return { ...nm, participant2Id: updatedMatch.winnerId };
          }
          return nm;
        });
      }

      // Next match loser (e.g. 3rd place match)
      if (updatedMatch.nextMatchLoserId) {
        const loserId = updatedMatch.winnerId === updatedMatch.participant1Id
          ? updatedMatch.participant2Id
          : updatedMatch.participant1Id;

        if (loserId) {
          nextMatches = nextMatches.map(nm => {
            if (nm.id === updatedMatch.nextMatchLoserId) {
              if (!nm.participant1Id) return { ...nm, participant1Id: loserId };
              if (!nm.participant2Id) return { ...nm, participant2Id: loserId };
            }
            return nm;
          });
        }
      }
    }

    setMatches(nextMatches);
    setBattles(prev => {
      const updated = [...prev, newBattle];
      saveState({ matches: nextMatches, battles: updated });
      return updated;
    });

    logAudit(
      'battles',
      newBattle.id,
      'insert',
      `Batalla #${newBattle.battleNumber}: ${finish ? `${finish.toUpperCase()} Finish (+${newBattle.points} pts)` : 'Empate'} registrada por ${currentUser.displayName}.`
    );
  };

  // Record a penalty / foul / card
  const recordPenalty = (
    matchId: string,
    offenderId: string,
    card?: 'yellow' | 'red',
    isFoul: boolean = true,
    reason?: string
  ) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const stage = stages.find(s => s.id === match.stageId);
    const tournament = tournaments.find(t => t.id === match.tournamentId);
    if (!stage || !tournament) return;

    const { updatedMatch, newPenalty } = applyPenalty(
      match,
      stage,
      tournament,
      offenderId,
      card,
      isFoul,
      reason || 'Infracción de lanzamiento o contacto reglamentario',
      currentUser.id,
      penalties
    );

    const nextMatches = matches.map(m => m.id === matchId ? updatedMatch : m);
    setMatches(nextMatches);
    setPenalties(prev => {
      const updated = [...prev, newPenalty];
      saveState({ matches: nextMatches, penalties: updated });
      return updated;
    });

    logAudit(
      'penalties',
      newPenalty.id,
      'insert',
      `Falta registrada a ${offenderId === match.participant1Id ? match.participant1Id : match.participant2Id}. ${newPenalty.pointsAwarded > 0 ? `+${newPenalty.pointsAwarded} punto otorgado al rival tras 3 faltas acumuladas.` : ''} Motivo: ${reason || 'Falta'}`
    );
  };

  // Assign referee to a group
  const assignRefereeToGroup = (groupId: string, refereeId: string | null) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setGroups(prev => {
      const updated = prev.map(g => g.id === groupId ? { ...g, refereeId } : g);
      saveState({ groups: updated });
      return updated;
    });

    // Also update all matches in this group to inherit this referee
    setMatches(prev => {
      const updated = prev.map(m => m.groupId === groupId ? { ...m, refereeId } : m);
      saveState({ matches: updated });
      return updated;
    });

    logAudit('groups', groupId, 'update', `Árbitro ${refereeId ? 'asignado' : 'removido'} para ${group.name}.`);
  };

  // Claim match as referee (self-selection)
  const claimMatchAsReferee = (matchId: string) => {
    assignReferee(matchId, currentUser.id);
  };

  // Move participant manually between groups (e.g. from Group B to Group C)
  const moveParticipantToGroup = (participantId: string, toGroupId: string) => {
    const blader = participants.find(p => p.id === participantId);
    const toGroup = groups.find(g => g.id === toGroupId);
    if (!blader || !toGroup) return;

    const fromGroup = groups.find(g => g.participantIds.includes(participantId));
    if (!fromGroup || fromGroup.id === toGroupId) return;

    // Update group participants
    const updatedGroups = groups.map(g => {
      if (g.id === fromGroup.id) {
        return {
          ...g,
          participantIds: g.participantIds.filter(id => id !== participantId),
        };
      }
      if (g.id === toGroupId) {
        return {
          ...g,
          participantIds: [...g.participantIds, participantId],
        };
      }
      return g;
    });

    setGroups(updatedGroups);

    // Regenerate matches for the affected groups
    const stage = stages.find(s => s.id === toGroup.stageId);
    if (stage) {
      // Rebuild round-robin matches for both fromGroup and toGroup
      const fromBladers = participants.filter(p => updatedGroups.find(g => g.id === fromGroup.id)?.participantIds.includes(p.id));
      const toBladers = participants.filter(p => updatedGroups.find(g => g.id === toGroupId)?.participantIds.includes(p.id));

      const rrFrom = generateRoundRobin(stage.tournamentId, stage.id, fromBladers, {
        groupId: fromGroup.id,
        groupName: fromGroup.name,
        legs: 1,
      });

      const rrTo = generateRoundRobin(stage.tournamentId, stage.id, toBladers, {
        groupId: toGroup.id,
        groupName: toGroup.name,
        legs: 1,
      });

      setMatches(prev => {
        const unaffectedMatches = prev.filter(m => m.groupId !== fromGroup.id && m.groupId !== toGroupId);
        const newGroupMatches = [...rrFrom.matches, ...rrTo.matches].map(m => {
          const gRef = updatedGroups.find(g => g.id === m.groupId)?.refereeId;
          return gRef ? { ...m, refereeId: gRef } : m;
        });
        const updated = [...unaffectedMatches, ...newGroupMatches];
        saveState({ groups: updatedGroups, matches: updated });
        return updated;
      });
    } else {
      saveState({ groups: updatedGroups });
    }

    logAudit('groups', toGroupId, 'update', `Blader ${blader.displayName} movido manualmente de ${fromGroup.name} a ${toGroup.name}.`);
  };

  // Rebalance groups dynamically depending on total participants
  const rebalanceGroups = (stageId: string, targetGroupSize: number = 4) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;
    const tParts = participants.filter(p => p.tournamentId === stage.tournamentId);

    // Calculate optimal number of groups so no group has < 3 players
    let numGroups = Math.max(1, Math.round(tParts.length / targetGroupSize));
    if (numGroups > 1 && Math.floor(tParts.length / numGroups) < 3) {
      numGroups = Math.max(1, Math.floor(tParts.length / 3));
    }

    const serpentine = buildSerpentineGroups(tParts, numGroups);
    const createdGroups: Group[] = [];
    const createdRounds: Round[] = [];
    const createdMatches: Match[] = [];

    // Existing group referees map
    const existingReferees = groups.filter(g => g.stageId === stageId).map(g => g.refereeId).filter(Boolean);

    serpentine.forEach((groupBladers, idx) => {
      const groupLetter = String.fromCharCode(65 + idx);
      const groupId = `${stage.id}_grp_${groupLetter.toLowerCase()}`;
      const groupName = `Grupo ${groupLetter}`;
      const assignedRef = existingReferees[idx % existingReferees.length] || null;

      createdGroups.push({
        id: groupId,
        stageId: stage.id,
        name: groupName,
        position: idx + 1,
        participantIds: groupBladers.map(b => b.id),
        refereeId: assignedRef,
      });

      const rr = generateRoundRobin(stage.tournamentId, stage.id, groupBladers, {
        groupId,
        groupName,
        legs: 1,
      });

      createdRounds.push(...rr.rounds);
      createdMatches.push(...rr.matches.map(m => ({ ...m, refereeId: assignedRef })));
    });

    setGroups(prev => {
      const others = prev.filter(g => g.stageId !== stage.id);
      const updated = [...others, ...createdGroups];
      saveState({ groups: updated });
      return updated;
    });

    setRounds(prev => {
      const others = prev.filter(r => r.stageId !== stage.id);
      const updated = [...others, ...createdRounds];
      saveState({ rounds: updated });
      return updated;
    });

    setMatches(prev => {
      const others = prev.filter(m => m.stageId !== stage.id);
      const updated = [...others, ...createdMatches];
      saveState({ matches: updated });
      return updated;
    });

    logAudit('stages', stageId, 'update', `Grupos subdivididos y balanceados automáticamente (${numGroups} grupos para ${tParts.length} bladers).`);
  };

  // Undo last battle
  const undoBattle = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const stage = stages.find(s => s.id === match.stageId);
    if (!stage) return;

    try {
      const { updatedMatch, removedBattleId } = undoLastBattle(match, stage, battles, penalties);
      const nextMatches = matches.map(m => m.id === matchId ? updatedMatch : m);
      const nextBattles = battles.filter(b => b.id !== removedBattleId);

      setMatches(nextMatches);
      setBattles(nextBattles);
      saveState({ matches: nextMatches, battles: nextBattles });

      logAudit('battles', removedBattleId, 'undo', `Última batalla deshecha por ${currentUser.displayName}. Marcador recalculado.`);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  const assignReferee = (matchId: string, refereeId: string | null) => {
    setMatches(prev => {
      const updated = prev.map(m => m.id === matchId ? { ...m, refereeId } : m);
      saveState({ matches: updated });
      return updated;
    });
    logAudit('matches', matchId, 'update', `Árbitro ${refereeId ? 'asignado' : 'removido'} para el match.`);
  };

  const assignStationToMatch = (matchId: string, station: string | null) => {
    setMatches(prev => {
      const updated = prev.map(m => m.id === matchId ? { ...m, station: station || undefined } : m);
      saveState({ matches: updated });
      return updated;
    });
    logAudit('matches', matchId, 'update', `Mesa/Estadio ${station ? `"${station}" asignado` : 'desasignado'}.`);
  };

  const callMatchToStation = (matchId: string) => {
    const targetMatch = matches.find(m => m.id === matchId);
    if (!targetMatch) return;
    const p1 = participants.find(p => p.id === targetMatch.participant1Id)?.displayName || 'Blader 1';
    const p2 = participants.find(p => p.id === targetMatch.participant2Id)?.displayName || 'Blader 2';
    const stationLabel = targetMatch.station || 'Estadio Principal';

    setMatches(prev => {
      const updated = prev.map(m => m.id === matchId ? { ...m, calledToStation: true } : m);
      saveState({ matches: updated });
      return updated;
    });

    setActiveStationAlert({
      matchId,
      message: `¡ATENCIÓN! Combate convocado a ${stationLabel}: ${p1} vs ${p2}. Presentarse de inmediato para inspección de deck.`,
      timestamp: Date.now(),
    });

    logAudit('matches', matchId, 'update', `Llamada a ${stationLabel} realizada para ${p1} vs ${p2}.`);
  };

  const dismissStationCall = (matchId: string) => {
    setMatches(prev => {
      const updated = prev.map(m => m.id === matchId ? { ...m, calledToStation: false } : m);
      saveState({ matches: updated });
      return updated;
    });
    setActiveStationAlert(prev => prev?.matchId === matchId ? null : prev);
  };


  // Create tournament wizard action
  const createTournament = (
    data: Partial<Tournament>,
    stageType: StageType,
    stageConfig: StageConfig
  ): Tournament => {
    const tId = `tourney_${Date.now()}`;
    const slug = (data.name || 'torneo').toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const newTournament: Tournament = {
      id: tId,
      slug,
      name: data.name || 'Nuevo Torneo Beyblade X',
      description: data.description || '',
      organizerId: currentUser.id,
      status: 'draft',
      isPublic: data.isPublic !== false,
      maxParticipants: data.maxParticipants || 16,
      checkInRequired: data.checkInRequired || false,
      entryFee: data.entryFee || 0,
      foulPoints: data.foulPoints !== undefined ? data.foulPoints : 1, // Falta: 1 punto al rival
      foulsPerPoint: data.foulsPerPoint || 3, // El punto se otorga tras 3 faltas acumuladas
      venueName: data.venueName || 'Arena Beyblade',
      venueAddress: data.venueAddress || '',
      country: data.country || 'PA',
      startsAt: data.startsAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      finishPoints: data.finishPoints || {
        spin: 1,
        over: 2,
        burst: 2,
        xtreme: 3,
      },
      assignedReferees: ['user_ref_1', 'user_ref_2'],
      pointsToWinGroup: data.pointsToWinGroup || 4,
      pointsToWinPlayoffs: data.pointsToWinPlayoffs || 5,
      pointsToWinFinal: data.pointsToWinFinal || 7,
    };

    const initialStage: Stage = {
      id: `stage_${Date.now()}_1`,
      tournamentId: tId,
      position: 1,
      name: stageType === 'group_stage' ? 'Fase de Grupos' : 'Cuadro Principal',
      type: stageType,
      status: 'pending',
      matchType: '3on3',
      pointsToWin: stageType === 'group_stage' ? 4 : 4,
      bestOf: 1, // Eliminación directa a puntos por defecto (best_of = 1)
      config: stageConfig,
    };

    setTournaments(prev => {
      const updated = [newTournament, ...prev];
      saveState({ tournaments: updated });
      return updated;
    });

    setStages(prev => {
      const updated = [...prev, initialStage];
      saveState({ stages: updated });
      return updated;
    });

    setActiveTournamentId(tId);
    logAudit('tournaments', tId, 'insert', `Torneo "${newTournament.name}" creado.`);
    return newTournament;
  };

  const updateTournament = (id: string, updates: Partial<Tournament>) => {
    setTournaments(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      saveState({ tournaments: updated });
      return updated;
    });
    logAudit('tournaments', id, 'update', 'Configuración de torneo actualizada.');
  };

  const duplicateTournament = (id: string): Tournament => {
    const source = tournaments.find(t => t.id === id) || tournaments[0];
    const newId = `tourney_${Date.now()}`;
    const duplicated: Tournament = {
      ...source,
      id: newId,
      name: `${source.name} (Copia)`,
      slug: `${source.slug}-copia-${Date.now().toString().slice(-4)}`,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    // Duplicate stages
    const sourceStages = stages.filter(s => s.tournamentId === id);
    const newStages = sourceStages.map((s, idx) => ({
      ...s,
      id: `stage_${newId}_${idx + 1}`,
      tournamentId: newId,
      status: 'pending' as const,
    }));

    setTournaments(prev => {
      const updated = [duplicated, ...prev];
      saveState({ tournaments: updated });
      return updated;
    });

    setStages(prev => {
      const updated = [...prev, ...newStages];
      saveState({ stages: updated });
      return updated;
    });

    setActiveTournamentId(newId);
    logAudit('tournaments', newId, 'insert', `Torneo duplicado a partir de ${source.name}.`);
    return duplicated;
  };

  // Invitations
  const createInvitation = (email: string, role: 'organizer' | 'referee', tournamentId?: string): Invitation => {
    const inv: Invitation = {
      id: `inv_${Date.now()}`,
      email: email.trim().toLowerCase(),
      role,
      tournamentId,
      status: 'pending',
      invitedBy: currentUser.id,
      createdAt: new Date().toISOString(),
      code: `BEY-${role.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setInvitations(prev => {
      const updated = [inv, ...prev];
      saveState({ invitations: updated });
      return updated;
    });

    logAudit('invitations', inv.id, 'insert', `Invitación para rol ${role} enviada a ${email}. Código: ${inv.code}`);
    return inv;
  };

  const revokeInvitation = (id: string) => {
    setInvitations(prev => {
      const updated = prev.filter(inv => inv.id !== id);
      saveState({ invitations: updated });
      return updated;
    });
  };

  const changeUserRole = (userId: string, newRole: UserRole) => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === userId ? { ...u, role: newRole } : u);
      return updated;
    });
    logAudit('profiles', userId, 'update', `Rol de usuario cambiado a ${newRole}.`);
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTournaments(INITIAL_TOURNAMENTS);
    setActiveTournamentId(INITIAL_TOURNAMENTS[0].id);
    setStages(INITIAL_STAGES);
    setGroups(INITIAL_GROUPS);
    setRounds(INITIAL_ROUNDS);
    setMatches(INITIAL_MATCHES);
    setParticipants(INITIAL_PARTICIPANTS);
    setBattles(INITIAL_BATTLES);
    setPenalties(INITIAL_PENALTIES);
    setInvitations(INITIAL_INVITATIONS);
    setUsers(INITIAL_PROFILES);
    setAuditLogs([
      {
        id: 'audit_reset',
        tableName: 'system',
        recordId: 'all',
        action: 'insert',
        actor: currentUser.id,
        createdAt: new Date().toISOString(),
        note: 'Datos reiniciados a los valores iniciales de prueba.',
      },
    ]);
  };

  return (
    <TournamentContext.Provider
      value={{
        currentUser,
        currentRole,
        switchRole,
        users,
        tournaments,
        activeTournamentId,
        activeTournament,
        setActiveTournamentId,
        createTournament,
        updateTournament,
        duplicateTournament,
        stages,
        groups,
        rounds,
        matches,
        participants,
        battles,
        penalties,
        invitations,
        auditLogs,
        addParticipant,
        addBulkParticipants,
        removeParticipant,
        toggleCheckIn,
        checkInAll,
        toggleInspected,
        reorderParticipants,
        randomizeParticipants,
        generateBracketForStage,
        startStage,
        advanceCurrentStage,
        updateStage,
        updateStageConfig,
        updateStageTiebreakers,
        recordBattle,
        recordPenalty,
        undoBattle,
        assignReferee,
        assignRefereeToGroup,
        claimMatchAsReferee,
        moveParticipantToGroup,
        rebalanceGroups,
        assignStationToMatch,
        callMatchToStation,
        dismissStationCall,
        activeStationAlert,
        showStadiumModal,
        setShowStadiumModal,
        createInvitation,
        revokeInvitation,
        changeUserRole,
        resetAllData,
      }}
    >
      {children}
    </TournamentContext.Provider>
  );
};

export function useTournament() {
  const context = useContext(TournamentContext);
  if (!context) {
    throw new Error('useTournament must be used within a TournamentProvider');
  }
  return context;
}
