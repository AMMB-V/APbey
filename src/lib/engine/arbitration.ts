import {
  Battle,
  FinishPointsConfig,
  FinishType,
  Match,
  Penalty,
  Round,
  Stage,
  Tournament,
} from '../../types/tournament';
import { createEntityId } from '../storage/entityIds';

export interface ApplyBattleResult {
  updatedMatch: Match;
  newBattle: Battle;
}

export interface ApplyPenaltyResult {
  updatedMatch: Match;
  newPenalty: Penalty;
}

/**
 * Pure TypeScript replica of the transactional SQL function record_battle.
 */
/**
 * Resolves the specific target points required to win a match based on the 3-parameter tier:
 * 1. Grupo / Fase regular (pointsToWinGroup, ej. 4)
 * 2. Cuartos / Semifinales / Playoffs (pointsToWinPlayoffs, ej. 5)
 * 3. Gran Final (pointsToWinFinal, ej. 7)
 */
export function getMatchPointsToWin(
  match: Match,
  stage: Stage,
  tournament: Tournament,
  round?: Round
): number {
  const isFinal = round?.bracket === 'grand_final' || round?.name.toLowerCase() === 'gran final';
  const isPlayoff = stage.type === 'single_elimination' || stage.type === 'double_elimination';

  if (isFinal && tournament.pointsToWinFinal) {
    return tournament.pointsToWinFinal;
  }
  if (isPlayoff && tournament.pointsToWinPlayoffs) {
    return tournament.pointsToWinPlayoffs;
  }
  if (stage.type === 'group_stage' && tournament.pointsToWinGroup) {
    return tournament.pointsToWinGroup;
  }
  return stage.pointsToWin || tournament.pointsToWinGroup || 4;
}

export function applyBattle(
  match: Match,
  stage: Stage,
  tournament: Tournament,
  scorerId: string | null,
  finish: FinishType | null,
  recordedBy: string,
  existingBattles: Battle[],
  round?: Round
): ApplyBattleResult {
  if (match.status === 'completed') {
    throw new Error('El match ya está completado y cerrado.');
  }

  const p1Id = match.participant1Id;
  const p2Id = match.participant2Id;

  if (!p1Id || !p2Id) {
    throw new Error('El match no tiene ambos participantes definidos.');
  }

  if ((scorerId === null) !== (finish === null)) {
    throw new Error('Un empate debe registrarse sin anotador ni tipo de finish.');
  }

  if (scorerId && scorerId !== p1Id && scorerId !== p2Id) {
    throw new Error('El anotador no corresponde a ninguno de los participantes.');
  }

  // Calculate points
  let pts = 0;
  if (finish) {
    pts = tournament.finishPoints[finish] || 0;
  }

  const isEmpate = scorerId === null || finish === null;
  const scorerIsP1 = scorerId === p1Id;

  const nextBattleNumber = existingBattles.filter(b => b.matchId === match.id).length + 1;

  const newBattle: Battle = {
    id: createEntityId(),
    matchId: match.id,
    battleNumber: nextBattleNumber,
    setNumber: match.sets1 + match.sets2 + 1,
    scorerId: isEmpate ? null : scorerId,
    finish: isEmpate ? null : finish,
    points: pts,
    voided: false,
    recordedBy,
    createdAt: new Date().toISOString(),
  };

  const updatedMatch: Match = {
    ...match,
    version: match.version + 1,
    startedAt: match.startedAt || new Date().toISOString(),
    status: 'in_progress',
  };

  const matchTargetPoints = getMatchPointsToWin(match, stage, tournament, round);

  if (!isEmpate) {
    if (scorerIsP1) {
      updatedMatch.score1 += pts;
    } else {
      updatedMatch.score2 += pts;
    }

    // Check set threshold
    if (Math.max(updatedMatch.score1, updatedMatch.score2) >= matchTargetPoints) {
      if (scorerIsP1) {
        updatedMatch.sets1 += 1;
      } else {
        updatedMatch.sets2 += 1;
      }

      const setsNeeded = Math.floor(stage.bestOf / 2) + 1;
      if (updatedMatch.sets1 >= setsNeeded || updatedMatch.sets2 >= setsNeeded) {
        updatedMatch.status = 'completed';
        updatedMatch.winnerId = updatedMatch.sets1 >= setsNeeded ? p1Id : p2Id;
        updatedMatch.finishedAt = new Date().toISOString();
      } else {
        // Reset scores for next set
        updatedMatch.score1 = 0;
        updatedMatch.score2 = 0;
      }
    }
  }

  return { updatedMatch, newBattle };
}

/**
 * Pure TypeScript replica of the transactional SQL function record_penalty.
 * Applies foul and awards 1 point to rival every 3 accumulated fouls.
 */
export function applyPenalty(
  match: Match,
  stage: Stage,
  tournament: Tournament,
  offenderId: string,
  card: 'yellow' | 'red' | undefined,
  isFoul: boolean,
  reason: string,
  issuedBy: string,
  existingPenalties: Penalty[],
  round?: Round
): ApplyPenaltyResult {
  if (match.status === 'completed') {
    throw new Error('El match ya está completado.');
  }

  const p1Id = match.participant1Id;
  const p2Id = match.participant2Id;
  if (!p1Id || !p2Id) {
    throw new Error('El match no tiene ambos participantes definidos.');
  }
  if (offenderId !== p1Id && offenderId !== p2Id) {
    throw new Error('El infractor no corresponde a ninguno de los participantes.');
  }
  const rivalId = offenderId === p1Id ? p2Id : p1Id;
  const rivalIsP1 = rivalId === p1Id;

  // Calculate foul points: point is awarded after accumulating 3 fouls
  let pointsAwarded = 0;
  if (isFoul) {
    const foulsCount = existingPenalties.filter(
      p => p.matchId === match.id && p.participantId === offenderId && p.isFoul
    ).length + 1;

    const foulsNeeded = tournament.foulsPerPoint || 3;
    if (foulsCount % foulsNeeded === 0) {
      pointsAwarded = tournament.foulPoints || 1;
    }
  }

  const newPenalty: Penalty = {
    id: createEntityId(),
    matchId: match.id,
    participantId: offenderId,
    card: card || 'yellow',
    isFoul,
    pointsAwarded,
    awardedTo: pointsAwarded > 0 ? rivalId : null,
    reason,
    issuedBy,
    createdAt: new Date().toISOString(),
  };

  const updatedMatch: Match = {
    ...match,
    version: match.version + 1,
    startedAt: match.startedAt || new Date().toISOString(),
    status: 'in_progress',
  };

  const matchTargetPoints = getMatchPointsToWin(match, stage, tournament, round);

  if (pointsAwarded > 0) {
    if (rivalIsP1) {
      updatedMatch.score1 += pointsAwarded;
    } else {
      updatedMatch.score2 += pointsAwarded;
    }

    if (Math.max(updatedMatch.score1, updatedMatch.score2) >= matchTargetPoints) {
      if (rivalIsP1) {
        updatedMatch.sets1 += 1;
      } else {
        updatedMatch.sets2 += 1;
      }

      const setsNeeded = Math.floor(stage.bestOf / 2) + 1;
      if (updatedMatch.sets1 >= setsNeeded || updatedMatch.sets2 >= setsNeeded) {
        updatedMatch.status = 'completed';
        updatedMatch.winnerId = updatedMatch.sets1 >= setsNeeded ? p1Id : p2Id;
        updatedMatch.finishedAt = new Date().toISOString();
      } else {
        updatedMatch.score1 = 0;
        updatedMatch.score2 = 0;
      }
    }
  }

  return { updatedMatch, newPenalty };
}

/**
 * Reverts the last battle of a match and recalculates the scores and status.
 */
export function undoLastBattle(
  match: Match,
  stage: Stage,
  battles: Battle[],
  penalties: Penalty[],
  tournament?: Tournament,
  round?: Round
): { updatedMatch: Match; removedBattleId: string } {
  const matchBattles = battles.filter(b => b.matchId === match.id && !b.voided);
  if (matchBattles.length === 0) {
    throw new Error('No hay batallas registradas para deshacer.');
  }

  const lastBattle = matchBattles[matchBattles.length - 1];
  const remainingBattles = matchBattles.slice(0, matchBattles.length - 1);
  const matchPenalties = penalties.filter(p => p.matchId === match.id);

  // Recalculate match from scratch
  let score1 = 0;
  let score2 = 0;
  let sets1 = 0;
  let sets2 = 0;
  let winnerId: string | null = null;
  let status: Match['status'] = remainingBattles.length > 0 || matchPenalties.length > 0 ? 'in_progress' : 'pending';

  const setsNeeded = Math.floor(stage.bestOf / 2) + 1;
  const matchTargetPoints = tournament ? getMatchPointsToWin(match, stage, tournament, round) : (stage.pointsToWin || 4);

  const remainingEvents = [
    ...remainingBattles.map((battle) => ({ kind: 'battle' as const, createdAt: battle.createdAt, battle })),
    ...matchPenalties.map((penalty) => ({ kind: 'penalty' as const, createdAt: penalty.createdAt, penalty })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const event of remainingEvents) {
    const awardedTo = event.kind === 'battle'
      ? event.battle.scorerId
      : event.penalty.awardedTo;
    const points = event.kind === 'battle' ? event.battle.points : event.penalty.pointsAwarded;
    if (!awardedTo || points <= 0) continue;

    if (awardedTo === match.participant1Id) score1 += points;
    if (awardedTo === match.participant2Id) score2 += points;

    if (Math.max(score1, score2) >= matchTargetPoints) {
      if (score1 > score2) sets1++;
      else if (score2 > score1) sets2++;

      if (sets1 >= setsNeeded || sets2 >= setsNeeded) {
        status = 'completed';
        winnerId = sets1 >= setsNeeded ? match.participant1Id! : match.participant2Id!;
        break;
      }
      score1 = 0;
      score2 = 0;
    }
  }

  const updatedMatch: Match = {
    ...match,
    score1,
    score2,
    sets1,
    sets2,
    winnerId,
    status,
    finishedAt: status === 'completed' ? match.finishedAt : null,
    version: match.version + 1,
  };

  return { updatedMatch, removedBattleId: lastBattle.id };
}
