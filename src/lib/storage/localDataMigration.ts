import {
  AuditLog,
  Battle,
  Group,
  Invitation,
  Match,
  Participant,
  Penalty,
  Round,
  Stage,
  Tournament,
} from '../../types/tournament';
import { createEntityId, isEntityIdUuid } from './entityIds';

export interface PersistedTournamentData {
  tournaments: Tournament[];
  stages: Stage[];
  groups: Group[];
  rounds: Round[];
  matches: Match[];
  participants: Participant[];
  battles: Battle[];
  penalties: Penalty[];
  invitations?: Invitation[];
  auditLogs?: AuditLog[];
}

const remap = (value: string | null | undefined, ids: Map<string, string>): string | undefined => {
  if (!value) return value || undefined;
  return ids.get(value) || value;
};

const remapNullable = (value: string | null | undefined, ids: Map<string, string>): string | null | undefined => {
  if (value === null) return null;
  return remap(value, ids);
};

const buildIdMap = <T extends { id: string }>(items: T[]): Map<string, string> => {
  const ids = new Map<string, string>();
  for (const item of items) {
    if (!isEntityIdUuid(item.id)) {
      ids.set(item.id, createEntityId());
    }
  }
  return ids;
};

export function migratePersistedTournamentData(
  input: Partial<PersistedTournamentData> | null | undefined
): { data: PersistedTournamentData; migrated: boolean } {
  const tournaments = Array.isArray(input?.tournaments) ? input.tournaments : [];
  const stages = Array.isArray(input?.stages) ? input.stages : [];
  const groups = Array.isArray(input?.groups) ? input.groups : [];
  const rounds = Array.isArray(input?.rounds) ? input.rounds : [];
  const matches = Array.isArray(input?.matches) ? input.matches : [];
  const participants = Array.isArray(input?.participants) ? input.participants : [];
  const battles = Array.isArray(input?.battles) ? input.battles : [];
  const penalties = Array.isArray(input?.penalties) ? input.penalties : [];

  const tournamentIds = buildIdMap(tournaments);
  const stageIds = buildIdMap(stages);
  const groupIds = buildIdMap(groups);
  const roundIds = buildIdMap(rounds);
  const matchIds = buildIdMap(matches);
  const participantIds = buildIdMap(participants);
  const battleIds = buildIdMap(battles);
  const penaltyIds = buildIdMap(penalties);
  const migrated = [
    tournamentIds,
    stageIds,
    groupIds,
    roundIds,
    matchIds,
    participantIds,
    battleIds,
    penaltyIds,
  ].some((ids) => ids.size > 0);

  const data: PersistedTournamentData = {
    tournaments: tournaments.map((tournament) => ({
      ...tournament,
      id: remap(tournament.id, tournamentIds) || tournament.id,
    })),
    stages: stages.map((stage) => ({
      ...stage,
      id: remap(stage.id, stageIds) || stage.id,
      tournamentId: remap(stage.tournamentId, tournamentIds) || stage.tournamentId,
    })),
    groups: groups.map((group) => ({
      ...group,
      id: remap(group.id, groupIds) || group.id,
      stageId: remap(group.stageId, stageIds) || group.stageId,
      participantIds: group.participantIds.map((id) => remap(id, participantIds) || id),
    })),
    rounds: rounds.map((round) => ({
      ...round,
      id: remap(round.id, roundIds) || round.id,
      stageId: remap(round.stageId, stageIds) || round.stageId,
      groupId: remap(round.groupId, groupIds),
    })),
    matches: matches.map((match) => ({
      ...match,
      id: remap(match.id, matchIds) || match.id,
      tournamentId: remap(match.tournamentId, tournamentIds) || match.tournamentId,
      stageId: remap(match.stageId, stageIds) || match.stageId,
      roundId: remap(match.roundId, roundIds) || match.roundId,
      groupId: remap(match.groupId, groupIds),
      participant1Id: remapNullable(match.participant1Id, participantIds),
      participant2Id: remapNullable(match.participant2Id, participantIds),
      winnerId: remapNullable(match.winnerId, participantIds),
      refereeId: match.refereeId,
      nextMatchWinnerId: remapNullable(match.nextMatchWinnerId, matchIds),
      nextMatchLoserId: remapNullable(match.nextMatchLoserId, matchIds),
    })),
    participants: participants.map((participant) => ({
      ...participant,
      id: remap(participant.id, participantIds) || participant.id,
      tournamentId: remap(participant.tournamentId, tournamentIds) || participant.tournamentId,
    })),
    battles: battles.map((battle) => ({
      ...battle,
      id: remap(battle.id, battleIds) || battle.id,
      matchId: remap(battle.matchId, matchIds) || battle.matchId,
      scorerId: remapNullable(battle.scorerId, participantIds),
    })),
    penalties: penalties.map((penalty) => ({
      ...penalty,
      id: remap(penalty.id, penaltyIds) || penalty.id,
      matchId: remap(penalty.matchId, matchIds) || penalty.matchId,
      battleId: remap(penalty.battleId, battleIds),
      participantId: remap(penalty.participantId, participantIds) || penalty.participantId,
      awardedTo: remapNullable(penalty.awardedTo, participantIds),
    })),
    invitations: input?.invitations,
    auditLogs: input?.auditLogs,
  };

  return { data, migrated };
}
