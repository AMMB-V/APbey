import { getSupabaseClient } from './client';
import {
  Tournament,
  Stage,
  Group,
  Round,
  Match,
  Participant,
  Battle,
  Penalty,
  UserProfile,
  FinishPointsConfig,
  FinishType,
} from '../../types/tournament';
import { BladerRanking, HallOfFameEntry } from '../../types/rankings';

export interface SupabaseSyncState {
  isConfigured: boolean;
  isConnected: boolean;
  lastSyncTime: string | null;
  error: string | null;
}

export interface RankingData {
  rankings: BladerRanking[];
  hallOfFame: HallOfFameEntry[];
}

export async function syncRankingsToSupabase(data: RankingData): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: true, message: 'Rankings guardados localmente; Supabase no está configurado.' };

  const { error } = await supabase.rpc('publish_rankings', {
    p_rankings: data.rankings.map((entry) => ({
      id: entry.id,
      name: entry.name,
      points: entry.points,
      elo: entry.elo,
      wins: entry.wins,
      losses: entry.losses,
      tournaments_won: entry.tournamentsWon,
      favorite_combo: entry.favoriteCombo || null,
    })),
    p_hall_of_fame: data.hallOfFame.map((entry) => ({
      id: entry.id,
      tournament_title: entry.tournamentTitle,
      champion: entry.champion,
      runner_up: entry.runnerUp || null,
      date: entry.date || null,
      winning_combo: entry.winningCombo || null,
      participants_count: entry.participantsCount || null,
    })),
  });
  if (error) {
    return { success: false, message: `No se pudo publicar Rankings de forma transaccional: ${error.message}` };
  }

  return { success: true, message: 'Rankings sincronizados con Supabase.' };
}

export async function loadRankingsFromSupabase(): Promise<RankingData | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const [{ data: rankingRows, error: rankingsError }, { data: hallRows, error: hallError }] = await Promise.all([
    supabase.from('ranking_entries').select('*').order('points', { ascending: false }),
    supabase.from('hall_of_fame_entries').select('*').order('date', { ascending: false }),
  ]);
  if (rankingsError || hallError) return null;
  return {
    rankings: (rankingRows || []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      points: Number(row.points) || 0,
      elo: Number(row.elo) || 0,
      wins: Number(row.wins) || 0,
      losses: Number(row.losses) || 0,
      tournamentsWon: Number(row.tournaments_won) || 0,
      favoriteCombo: row.favorite_combo ? String(row.favorite_combo) : undefined,
    })),
    hallOfFame: (hallRows || []).map((row) => ({
      id: String(row.id),
      tournamentTitle: String(row.tournament_title || ''),
      champion: String(row.champion || ''),
      runnerUp: row.runner_up ? String(row.runner_up) : undefined,
      date: row.date ? String(row.date) : '',
      winningCombo: row.winning_combo ? String(row.winning_combo) : undefined,
      participantsCount: row.participants_count ? Number(row.participants_count) : undefined,
    })),
  };
}

/**
 * Uploads all tournament data to Supabase PostgreSQL schema.
 * Handles relational hierarchy: Tournament -> Stages -> Groups/Rounds -> Matches -> Battles/Penalties.
 */
export async function syncTournamentToSupabase(
  tournament: Tournament,
  stages: Stage[],
  groups: Group[],
  rounds: Round[],
  matches: Match[],
  participants: Participant[],
  battles: Battle[],
  penalties: Penalty[]
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      message: 'Supabase no está configurado con una URL y Anon Key válidas.',
    };
  }

  try {
    // 1. Upsert Tournament
    const tourneyPayload = {
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      description: tournament.description || null,
      organizer_id: tournament.organizerId,
      status: tournament.status,
      is_public: tournament.isPublic,
      max_participants: tournament.maxParticipants || null,
      check_in_required: tournament.checkInRequired,
      entry_fee: tournament.entryFee || 0,
      foul_points: tournament.foulPoints || 1,
      fouls_per_point: tournament.foulsPerPoint || 3,
      points_to_win_group: tournament.pointsToWinGroup || 4,
      points_to_win_playoffs: tournament.pointsToWinPlayoffs || 5,
      points_to_win_final: tournament.pointsToWinFinal || 7,
      venue_name: tournament.venueName || null,
      venue_address: tournament.venueAddress || null,
      country: tournament.country || 'PA',
      starts_at: tournament.startsAt,
      created_at: tournament.createdAt,
    };

    const { error: tourneyError } = await supabase.from('tournaments').upsert(tourneyPayload);
    if (tourneyError) throw new Error(`Error al sincronizar torneo: ${tourneyError.message}`);

    // 2. Upsert Participants
    const tourneyParticipants = participants.filter(p => p.tournamentId === tournament.id);
    if (tourneyParticipants.length > 0) {
      const participantsPayload = tourneyParticipants.map(p => ({
        id: p.id,
        tournament_id: p.tournamentId,
        display_name: p.displayName,
        seed: p.seed,
        checked_in: p.checkedIn,
        inspected: p.inspected,
        status: p.status,
      }));
      const { error: partsError } = await supabase.from('participants').upsert(participantsPayload);
      if (partsError) throw new Error(`Error al sincronizar participantes: ${partsError.message}`);
    }

    // 3. Upsert Stages
    const tourneyStages = stages.filter(s => s.tournamentId === tournament.id);
    if (tourneyStages.length > 0) {
      const stagesPayload = tourneyStages.map(s => ({
        id: s.id,
        tournament_id: s.tournamentId,
        position: s.position,
        name: s.name,
        type: s.type,
        status: s.status,
        match_type: s.matchType,
        points_to_win: s.pointsToWin,
        best_of: s.bestOf || 1,
        config: s.config,
      }));
      const { error: stagesError } = await supabase.from('stages').upsert(stagesPayload);
      if (stagesError) throw new Error(`Error al sincronizar etapas: ${stagesError.message}`);
    }

    // 4. Upsert Groups
    const stageIds = new Set(tourneyStages.map(s => s.id));
    const tourneyGroups = groups.filter(g => stageIds.has(g.stageId));
    if (tourneyGroups.length > 0) {
      const groupsPayload = tourneyGroups.map(g => ({
        id: g.id,
        stage_id: g.stageId,
        name: g.name,
        position: g.position,
        referee_id: g.refereeId || null,
      }));
      const { error: groupsError } = await supabase.from('groups').upsert(groupsPayload);
      if (groupsError) throw new Error(`Error al sincronizar grupos: ${groupsError.message}`);
    }

    // 5. Upsert Rounds
    const tourneyRounds = rounds.filter(r => stageIds.has(r.stageId));
    if (tourneyRounds.length > 0) {
      const roundsPayload = tourneyRounds.map(r => ({
        id: r.id,
        stage_id: r.stageId,
        group_id: r.groupId || null,
        number: r.number,
        bracket: r.bracket,
        name: r.name || null,
      }));
      const { error: roundsError } = await supabase.from('rounds').upsert(roundsPayload);
      if (roundsError) throw new Error(`Error al sincronizar rondas: ${roundsError.message}`);
    }

    // 6. Upsert Matches
    const tourneyMatches = matches.filter(m => m.tournamentId === tournament.id);
    if (tourneyMatches.length > 0) {
      const matchesPayload = tourneyMatches.map(m => ({
        id: m.id,
        tournament_id: m.tournamentId,
        stage_id: m.stageId,
        round_id: m.roundId,
        group_id: m.groupId || null,
        position: m.position,
        participant1_id: m.participant1Id || null,
        participant2_id: m.participant2Id || null,
        winner_id: m.winnerId || null,
        is_draw: m.isDraw,
        is_bye: m.isBye,
        score1: m.score1,
        score2: m.score2,
        sets1: m.sets1,
        sets2: m.sets2,
        status: m.status,
        referee_id: m.refereeId || null,
        next_match_winner_id: m.nextMatchWinnerId || null,
        next_match_loser_id: m.nextMatchLoserId || null,
      }));
      const { error: matchesError } = await supabase.from('matches').upsert(matchesPayload);
      if (matchesError) throw new Error(`Error al sincronizar matches: ${matchesError.message}`);
    }

    // 7. Upsert Battles
    const matchIds = new Set(tourneyMatches.map(m => m.id));
    const tourneyBattles = battles.filter(b => matchIds.has(b.matchId));
    if (tourneyBattles.length > 0) {
      const battlesPayload = tourneyBattles.map(b => ({
        id: b.id,
        match_id: b.matchId,
        battle_number: b.battleNumber,
        set_number: b.setNumber || 1,
        scorer_id: b.scorerId || null,
        finish: b.finish || null,
        points: b.points || 0,
        voided: b.voided || false,
        recorded_by: b.recordedBy || null,
        created_at: b.createdAt,
      }));
      const { error: battlesError } = await supabase.from('battles').upsert(battlesPayload);
      if (battlesError) throw new Error(`Error al sincronizar batallas: ${battlesError.message}`);
    }

    return {
      success: true,
      message: `Torneo "${tournament.name}" sincronizado con Supabase (${tourneyMatches.length} partidas, ${tourneyParticipants.length} bladers).`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Supabase Sync Error]:', err);
    return {
      success: false,
      message: `Error al persistir en Supabase: ${message}`,
    };
  }
}

/**
 * Loads tournaments from Supabase if connected.
 */
export async function loadTournamentsFromSupabase(): Promise<{
  tournaments: Tournament[];
  stages: Stage[];
  groups: Group[];
  rounds: Round[];
  matches: Match[];
  participants: Participant[];
  battles: Battle[];
  penalties: Penalty[];
} | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    // Auth restoration is asynchronous. Waiting for the session here prevents
    // private organizer/referee tournaments from disappearing on first load.
    await supabase.auth.getSession();

    const [
      { data: tourneys, error: tournamentsError },
      { data: finishPointRows, error: finishPointsError },
      { data: refereeRows, error: refereesError },
      { data: participantRows, error: participantsError },
      { data: stageRows, error: stagesError },
      { data: groupRows, error: groupsError },
      { data: groupParticipantRows, error: groupParticipantsError },
      { data: roundRows, error: roundsError },
      { data: matchRows, error: matchesError },
      { data: battleRows, error: battlesError },
      { data: penaltyRows, error: penaltiesError },
    ] = await Promise.all([
      supabase.from('tournaments').select('*').order('created_at', { ascending: true }),
      supabase.from('tournament_finish_points').select('*'),
      supabase.from('tournament_referees').select('*'),
      supabase.from('participants').select('*').order('seed', { ascending: true }),
      supabase.from('stages').select('*').order('position', { ascending: true }),
      supabase.from('groups').select('*').order('position', { ascending: true }),
      supabase.from('group_participants').select('*'),
      supabase.from('rounds').select('*').order('number', { ascending: true }),
      supabase.from('matches').select('*').order('position', { ascending: true }),
      supabase.from('battles').select('*').order('battle_number', { ascending: true }),
      supabase.from('penalties').select('*').order('created_at', { ascending: true }),
    ]);

    const errors = [
      tournamentsError,
      finishPointsError,
      refereesError,
      participantsError,
      stagesError,
      groupsError,
      groupParticipantsError,
      roundsError,
      matchesError,
      battlesError,
      penaltiesError,
    ].filter(Boolean);
    if (errors.length > 0) {
      console.warn(
        '[Supabase] Snapshot incompleto; no se aplicarán datos parciales:',
        errors.map((error) => error?.message).filter(Boolean).join('; ')
      );
      return null;
    }

    const defaultFinishPoints: FinishPointsConfig = { spin: 1, over: 2, burst: 2, xtreme: 3 };
    const finishPointsByTournament = new Map<string, FinishPointsConfig>();
    for (const row of finishPointRows || []) {
      const points = finishPointsByTournament.get(row.tournament_id) || { ...defaultFinishPoints };
      points[row.finish as FinishType] = Number(row.points) || 0;
      finishPointsByTournament.set(row.tournament_id, points);
    }

    const refereesByTournament = new Map<string, string[]>();
    for (const row of refereeRows || []) {
      const referees = refereesByTournament.get(row.tournament_id) || [];
      referees.push(row.profile_id);
      refereesByTournament.set(row.tournament_id, referees);
    }

    const tournaments: Tournament[] = (tourneys || []).map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      description: t.description || undefined,
      organizerId: t.organizer_id,
      status: t.status,
      isPublic: t.is_public,
      maxParticipants: t.max_participants || undefined,
      checkInRequired: t.check_in_required,
      entryFee: Number(t.entry_fee) || 0,
      foulPoints: t.foul_points || 1,
      foulsPerPoint: t.fouls_per_point || 3,
      pointsToWinGroup: t.points_to_win_group || 4,
      pointsToWinPlayoffs: t.points_to_win_playoffs || 5,
      pointsToWinFinal: t.points_to_win_final || 7,
      venueName: t.venue_name || undefined,
      venueAddress: t.venue_address || undefined,
      country: t.country || 'PA',
      startsAt: t.starts_at,
      createdAt: t.created_at,
      finishPoints: finishPointsByTournament.get(t.id) || { ...defaultFinishPoints },
      assignedReferees: refereesByTournament.get(t.id) || [],
    }));

    const participants: Participant[] = (participantRows || []).map((p) => ({
      id: p.id,
      tournamentId: p.tournament_id,
      profileId: p.profile_id || undefined,
      displayName: p.display_name,
      seed: p.seed ?? 0,
      checkedIn: p.checked_in,
      inspected: p.inspected,
      status: p.status,
    }));

    const participantsByGroup = new Map<string, string[]>();
    for (const row of groupParticipantRows || []) {
      const participantIds = participantsByGroup.get(row.group_id) || [];
      participantIds.push(row.participant_id);
      participantsByGroup.set(row.group_id, participantIds);
    }

    const stages: Stage[] = (stageRows || []).map((s) => ({
      id: s.id,
      tournamentId: s.tournament_id,
      position: s.position,
      name: s.name,
      type: s.type,
      status: s.status,
      matchType: s.match_type,
      pointsToWin: s.points_to_win,
      bestOf: s.best_of,
      config: s.config || { tiebreakers: [] },
    }));

    const groups: Group[] = (groupRows || []).map((g) => ({
      id: g.id,
      stageId: g.stage_id,
      name: g.name,
      position: g.position,
      participantIds: participantsByGroup.get(g.id) || [],
      refereeId: g.referee_id || undefined,
    }));

    const rounds: Round[] = (roundRows || []).map((r) => ({
      id: r.id,
      stageId: r.stage_id,
      groupId: r.group_id || undefined,
      number: r.number,
      bracket: r.bracket,
      name: r.name || '',
    }));

    const matches: Match[] = (matchRows || []).map((m) => ({
      id: m.id,
      tournamentId: m.tournament_id,
      stageId: m.stage_id,
      roundId: m.round_id,
      groupId: m.group_id || undefined,
      position: m.position,
      participant1Id: m.participant1_id || undefined,
      participant2Id: m.participant2_id || undefined,
      winnerId: m.winner_id || undefined,
      isDraw: m.is_draw,
      isBye: m.is_bye,
      score1: m.score1,
      score2: m.score2,
      sets1: m.sets1,
      sets2: m.sets2,
      status: m.status,
      refereeId: m.referee_id || undefined,
      nextMatchWinnerId: m.next_match_winner_id || undefined,
      nextMatchLoserId: m.next_match_loser_id || undefined,
      version: m.version ?? 1,
      startedAt: m.started_at || undefined,
      finishedAt: m.finished_at || undefined,
    }));

    const battles: Battle[] = (battleRows || []).map((b) => ({
      id: b.id,
      matchId: b.match_id,
      battleNumber: b.battle_number,
      setNumber: b.set_number || 1,
      scorerId: b.scorer_id || undefined,
      finish: b.finish || undefined,
      points: b.points || 0,
      voided: Boolean(b.voided),
      recordedBy: b.recorded_by,
      createdAt: b.created_at,
    }));

    const penalties: Penalty[] = (penaltyRows || []).map((p) => ({
      id: p.id,
      matchId: p.match_id,
      battleId: p.battle_id || undefined,
      participantId: p.participant_id,
      card: p.card,
      isFoul: p.is_foul,
      pointsAwarded: p.points_awarded || 0,
      awardedTo: p.awarded_to || undefined,
      reason: p.reason || undefined,
      issuedBy: p.issued_by,
      createdAt: p.created_at,
    }));

    return { tournaments, stages, groups, rounds, matches, participants, battles, penalties };
  } catch (err) {
    console.warn('[Supabase] No se pudieron cargar datos remotos:', err);
    return null;
  }
}

/**
 * Realtime Subscription for Live Scoring and Stadium Displays.
 * Listens to postgres_changes on matches and battles tables.
 */
export function subscribeToTournamentRealtime(
  tournamentId: string,
  callbacks: {
    onMatchUpdate?: (match: Partial<Match>) => void;
    onBattleInsert?: (battle: Battle) => void;
    onPenaltyInsert?: (penalty: Penalty) => void;
    onStatusChange?: (status: 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED') => void;
  }
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`live_tournament_${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      },
      (payload) => {
        const m = payload.new as Record<string, unknown>;
        if (callbacks.onMatchUpdate) {
          callbacks.onMatchUpdate({
            id: String(m.id),
            score1: Number(m.score1) || 0,
            score2: Number(m.score2) || 0,
            sets1: Number(m.sets1) || 0,
            sets2: Number(m.sets2) || 0,
            status: m.status as Match['status'],
            winnerId: (m.winner_id as string) || undefined,
            refereeId: (m.referee_id as string) || undefined,
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battles',
      },
      (payload) => {
        const b = payload.new as Record<string, unknown>;
        if (callbacks.onBattleInsert) {
          callbacks.onBattleInsert({
            id: String(b.id),
            matchId: String(b.match_id),
            battleNumber: Number(b.battle_number),
            setNumber: Number(b.set_number) || 1,
            scorerId: (b.scorer_id as string) || null,
            finish: (b.finish as any) || null,
            points: Number(b.points) || 0,
            voided: Boolean(b.voided),
            recordedBy: String(b.recorded_by || ''),
            createdAt: String(b.created_at || new Date().toISOString()),
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'penalties',
      },
      (payload) => {
        const p = payload.new as Record<string, unknown>;
        if (callbacks.onPenaltyInsert) {
          callbacks.onPenaltyInsert({
            id: String(p.id),
            matchId: String(p.match_id),
            battleId: (p.battle_id as string) || undefined,
            participantId: String(p.participant_id),
            card: p.card as Penalty['card'],
            isFoul: Boolean(p.is_foul),
            pointsAwarded: Number(p.points_awarded) || 0,
            awardedTo: (p.awarded_to as string) || undefined,
            reason: (p.reason as string) || undefined,
            issuedBy: String(p.issued_by),
            createdAt: String(p.created_at || new Date().toISOString()),
          });
        }
      }
    )
    .subscribe((status) => {
      if (
        status === 'SUBSCRIBED' ||
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        callbacks.onStatusChange?.(status);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Persists an individual battle directly to Supabase when online.
 */
export async function persistBattleToSupabase(
  battle: Battle,
  match: Match,
  expectedVersion = Math.max(1, match.version - 1)
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    if (!battle.scorerId || !battle.finish) {
      return {
        success: false,
        message: 'El RPC transaccional actual sólo admite batallas con finish y anotador.',
      };
    }

    const { error } = await supabase.rpc('record_battle', {
      p_match: battle.matchId,
      p_scorer: battle.scorerId,
      p_finish: battle.finish,
      p_expected_version: expectedVersion,
    });
    if (error) {
      const message = error.message.includes('version_conflict')
        ? 'El match cambió en otra sesión. Recarga el torneo antes de registrar otra batalla.'
        : `No se pudo registrar la batalla de forma transaccional: ${error.message}`;
      return { success: false, message };
    }
    return { success: true, message: 'Batalla registrada transaccionalmente en Supabase.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido de sincronización.';
    console.warn('[Supabase Realtime] No se pudo emitir mutación directa:', err);
    return { success: false, message };
  }
}

export async function persistPenaltyToSupabase(
  penalty: Penalty,
  match: Match,
  expectedVersion = Math.max(1, match.version - 1)
): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    const { error } = await supabase.rpc('record_penalty', {
      p_match_id: penalty.matchId,
      p_offender_id: penalty.participantId,
      p_card: penalty.card,
      p_is_foul: penalty.isFoul,
      p_points_awarded: penalty.pointsAwarded,
      p_awarded_to: penalty.awardedTo || null,
      p_reason: penalty.reason || null,
      p_issued_by: penalty.issuedBy,
      p_expected_version: expectedVersion,
    });
    if (error) {
      const message = error.message.toLowerCase().includes('conflicto')
        ? 'El match cambió en otra sesión. Recarga el torneo antes de registrar la penalización.'
        : `No se pudo registrar la penalización de forma transaccional: ${error.message}`;
      return { success: false, message };
    }
    return { success: true, message: 'Penalización registrada transaccionalmente en Supabase.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido de sincronización.';
    console.warn('[Supabase] No se pudo emitir la penalización:', err);
    return { success: false, message };
  }
}
