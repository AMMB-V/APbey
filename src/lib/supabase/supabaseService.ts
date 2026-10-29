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

  const { error: rankingDeleteError } = await supabase.from('ranking_entries').delete().neq('id', '');
  if (rankingDeleteError) return { success: false, message: `No se pudo reemplazar Rankings: ${rankingDeleteError.message}` };
  const { error: hallDeleteError } = await supabase.from('hall_of_fame_entries').delete().neq('id', '');
  if (hallDeleteError) return { success: false, message: `No se pudo reemplazar el Salón de la Fama: ${hallDeleteError.message}` };

  if (data.rankings.length > 0) {
    const { error } = await supabase.from('ranking_entries').insert(data.rankings.map((entry) => ({
      id: entry.id,
      name: entry.name,
      points: entry.points,
      elo: entry.elo,
      wins: entry.wins,
      losses: entry.losses,
      tournaments_won: entry.tournamentsWon,
      favorite_combo: entry.favoriteCombo || null,
    })));
    if (error) return { success: false, message: `No se pudo guardar Rankings: ${error.message}` };
  }

  if (data.hallOfFame.length > 0) {
    const { error } = await supabase.from('hall_of_fame_entries').insert(data.hallOfFame.map((entry) => ({
      id: entry.id,
      tournament_title: entry.tournamentTitle,
      champion: entry.champion,
      runner_up: entry.runnerUp || null,
      date: entry.date || null,
      winning_combo: entry.winningCombo || null,
      participants_count: entry.participantsCount || null,
    })));
    if (error) return { success: false, message: `No se pudo guardar el Salón de la Fama: ${error.message}` };
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
  matches: Match[];
  participants: Participant[];
} | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data: tourneys, error: tErr } = await supabase.from('tournaments').select('*');
    if (tErr) {
      console.warn('[Supabase] No se pudieron cargar torneos:', tErr.message);
      return null;
    }

    const tournaments: Tournament[] = (tourneys || []).map(t => ({
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
      finishPoints: {
        spin: 1,
        over: 2,
        burst: 2,
        xtreme: 3,
      },
      assignedReferees: [],
    }));

    // Optionally load participants and stages
    const { data: parts, error: participantsError } = await supabase.from('participants').select('*');
    if (participantsError) {
      console.warn('[Supabase] No se pudieron cargar participantes:', participantsError.message);
      return null;
    }
    const participants: Participant[] = (parts || []).map(p => ({
      id: p.id,
      tournamentId: p.tournament_id,
      displayName: p.display_name,
      seed: p.seed,
      checkedIn: p.checked_in,
      inspected: p.inspected,
      status: p.status,
    }));

    const { data: stg, error: stagesError } = await supabase.from('stages').select('*');
    if (stagesError) {
      console.warn('[Supabase] No se pudieron cargar etapas:', stagesError.message);
      return null;
    }
    const stages: Stage[] = (stg || []).map(s => ({
      id: s.id,
      tournamentId: s.tournament_id,
      position: s.position,
      name: s.name,
      type: s.type,
      status: s.status,
      matchType: s.match_type,
      pointsToWin: s.points_to_win,
      bestOf: s.best_of,
      config: s.config,
    }));

    const { data: mtch, error: matchesError } = await supabase.from('matches').select('*');
    if (matchesError) {
      console.warn('[Supabase] No se pudieron cargar partidas:', matchesError.message);
      return null;
    }
    const matches: Match[] = (mtch || []).map(m => ({
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
    }));

    return { tournaments, stages, matches, participants };
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
