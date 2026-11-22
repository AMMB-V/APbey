import {
  Battle,
  GroupStandingRow,
  Match,
  Participant,
  Penalty,
  SetScore,
  StandingsScoringConfig,
  TiebreakerCriteria,
} from '../../types/tournament';

export type MatchPointTotals = (match: Match) => SetScore;

function sumScores(scores: SetScore[]): SetScore {
  return scores.reduce<SetScore>(([total1, total2], [score1, score2]) =>
    [total1 + score1, total2 + score2], [0, 0]);
}

function recordedMatchPoints(match: Match): SetScore {
  return match.manualSetScores?.length ? sumScores(match.manualSetScores) : [match.score1, match.score2];
}

export function matchPointTotals(matches: Match[], battles: Battle[], penalties: Penalty[]): MatchPointTotals {
  const completed = new Map(matches.filter(match => match.status === 'completed').map(match => [match.id, match]));
  const livePoints = new Map<string, SetScore>();
  function addPoints(match: Match, playerId: string | null | undefined, points: number) {
    if (match.manualSetScores?.length || points <= 0 || !playerId) return;
    const slot = playerId === match.participant1Id ? 0 : playerId === match.participant2Id ? 1 : -1;
    if (slot === -1) return;
    const total = livePoints.get(match.id) ?? sumScores(match.setCheckpoint?.scores ?? []);
    total[slot] += points;
    livePoints.set(match.id, total);
  }
  for (const battle of battles) {
    const match = completed.get(battle.matchId);
    if (match && !battle.voided && battle.battleNumber > (match.setCheckpoint?.battleNumber ?? 0)) {
      addPoints(match, battle.scorerId, battle.points);
    }
  }
  for (const penalty of penalties) {
    const match = completed.get(penalty.matchId);
    if (match && !match.setCheckpoint?.penaltyIds.includes(penalty.id)) {
      addPoints(match, penalty.awardedTo, penalty.pointsAwarded);
    }
  }
  return match => livePoints.get(match.id) ?? (
    match.setCheckpoint && !match.manualSetScores?.length
      ? sumScores([...match.setCheckpoint.scores.slice(0, -1), [match.score1, match.score2]])
      : recordedMatchPoints(match)
  );
}

export function computeStandings(
  matches: Match[],
  participants: Participant[],
  tiebreakerOrder: TiebreakerCriteria[] = ['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed'],
  advanceCount: number = 2,
  scoring: StandingsScoringConfig = {},
  getMatchPoints: MatchPointTotals = recordedMatchPoints
): GroupStandingRow[] {
  const pointsPerMatchWin = scoring.pointsPerMatchWin ?? 3;
  const pointsPerMatchDraw = scoring.pointsPerMatchDraw ?? 1;
  const pointsPerSetWin = scoring.pointsPerSetWin ?? 0;
  const pointsPerSetDraw = scoring.pointsPerSetDraw ?? 0;
  const pointsPerBye = scoring.pointsPerBye ?? (scoring.pointsPerMatchWin !== undefined ? scoring.pointsPerMatchWin : 1);
  const participantMap = new Map<string, Participant>();
  for (const p of participants) {
    participantMap.set(p.id, p);
  }

  // Accumulate stats
  const statsMap = new Map<string, {
    played: number;
    won: number;
    drawn: number;
    lost: number;
    pointsFor: number;
    pointsAgainst: number;
    gameWins: number;
    gameLosses: number;
    points: number;
  }>();

  for (const p of participants) {
    statsMap.set(p.id, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      gameWins: 0,
      gameLosses: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== 'completed' || !match.participant1Id) {
      continue;
    }

    const s1 = statsMap.get(match.participant1Id);
    const s2 = match.participant2Id ? statsMap.get(match.participant2Id) : undefined;

    if (match.isBye && s1) {
      s1.played += 1;
      s1.won += 1;
      s1.points += pointsPerBye;
      continue;
    }

    if (s1 && s2) {
      s1.played += 1;
      s2.played += 1;

      const [score1, score2] = getMatchPoints(match);
      s1.pointsFor += score1;
      s1.pointsAgainst += score2;
      s2.pointsFor += score2;
      s2.pointsAgainst += score1;
      s1.gameWins += match.sets1;
      s1.gameLosses += match.sets2;
      s2.gameWins += match.sets2;
      s2.gameLosses += match.sets1;

      if (match.isDraw) {
        s1.drawn += 1;
        s2.drawn += 1;
        s1.points += pointsPerMatchDraw + match.sets1 * pointsPerSetWin + pointsPerSetDraw;
        s2.points += pointsPerMatchDraw + match.sets2 * pointsPerSetWin + pointsPerSetDraw;
      } else if (match.winnerId === match.participant1Id) {
        s1.won += 1;
        s2.lost += 1;
        s1.points += pointsPerMatchWin + match.sets1 * pointsPerSetWin;
      } else if (match.winnerId === match.participant2Id) {
        s2.won += 1;
        s1.lost += 1;
        s2.points += pointsPerMatchWin + match.sets2 * pointsPerSetWin;
      }
    }
  }

  // Helper for Buchholz (sum of opponents' tournament points)
  const buchholzMap = new Map<string, number>();
  const opponentPointsMap = new Map<string, number[]>();
  for (const p of participants) {
    let opponentPointsSum = 0;
    const opponentPoints: number[] = [];
    for (const match of matches) {
      if (match.status !== 'completed' || match.isBye || !match.participant1Id || !match.participant2Id) {
        continue;
      }
      let opponentId: string | null = null;
      if (match.participant1Id === p.id) {
        opponentId = match.participant2Id;
      } else if (match.participant2Id === p.id) {
        opponentId = match.participant1Id;
      }
      if (opponentId) {
        const oppStats = statsMap.get(opponentId);
        if (oppStats) {
          opponentPointsSum += oppStats.points;
          opponentPoints.push(oppStats.points);
        }
      }
    }
    buchholzMap.set(p.id, opponentPointsSum);
    opponentPointsMap.set(p.id, opponentPoints);
  }

  // Direct pairwise match winner between two participants
  const getPairwiseWinner = (idA: string, idB: string): string | null => {
    for (const m of matches) {
      if (m.status !== 'completed' || !m.winnerId) continue;
      if (
        (m.participant1Id === idA && m.participant2Id === idB) ||
        (m.participant1Id === idB && m.participant2Id === idA)
      ) {
        return m.winnerId;
      }
    }
    return null;
  };

  // Pre-computes mini-league points among a cluster of tied participants
  // Solves SEC-02 & Timsort non-transitivity bug in multi-way ties
  const computeClusterMiniLeagueWins = (clusterIds: string[]): Map<string, number> => {
    const winsMap = new Map<string, number>();
    const clusterSet = new Set(clusterIds);
    clusterIds.forEach((id) => winsMap.set(id, 0));

    for (const m of matches) {
      if (m.status !== 'completed' || !m.winnerId) continue;
      if (
        m.participant1Id &&
        m.participant2Id &&
        clusterSet.has(m.participant1Id) &&
        clusterSet.has(m.participant2Id)
      ) {
        winsMap.set(m.winnerId, (winsMap.get(m.winnerId) || 0) + 1);
      }
    }
    return winsMap;
  };

  const rows: GroupStandingRow[] = participants.map((p) => {
    const s = statsMap.get(p.id)!;
    const pointDiff = s.pointsFor - s.pointsAgainst;
    const buchholz = buchholzMap.get(p.id) || 0;
    const opponentPoints = opponentPointsMap.get(p.id) || [];
    const medianBuchholz = opponentPoints.length < 3
      ? opponentPoints.reduce((sum, points) => sum + points, 0)
      : opponentPoints
        .slice()
        .sort((left, right) => left - right)
        .slice(1, -1)
        .reduce((sum, points) => sum + points, 0);
    const pointsAverage = s.played > 0 ? Number((s.pointsFor / s.played).toFixed(2)) : 0;
    const pointsRatio = s.pointsAgainst > 0 ? Number((s.pointsFor / s.pointsAgainst).toFixed(2)) : s.pointsFor;

    return {
      participantId: p.id,
      participant: p,
      played: s.played,
      won: s.won,
      drawn: s.drawn,
      lost: s.lost,
      pointsFor: s.pointsFor,
      pointsAgainst: s.pointsAgainst,
      gameWins: s.gameWins,
      gameLosses: s.gameLosses,
      pointDiff,
      points: s.points,
      pointsAverage,
      pointsRatio,
      buchholz,
      medianBuchholz,
      rank: 1,
      advances: false,
    };
  });

  const criterionValue = (row: GroupStandingRow, criterion: TiebreakerCriteria): number | string => {
    switch (criterion) {
      case 'points': return row.points;
      case 'point_diff': return row.pointDiff;
      case 'points_for': return row.pointsFor;
      case 'points_average': return row.pointsAverage || 0;
      case 'points_ratio': return row.pointsRatio || 0;
      case 'game_wins': return row.gameWins;
      case 'buchholz': return row.buchholz || 0;
      case 'median_buchholz': return row.medianBuchholz || 0;
      case 'seed': return row.participant.seed;
      default: return '';
    }
  };

  const headToHeadIndex = tiebreakerOrder.indexOf('head_to_head');
  const priorCriteria = headToHeadIndex >= 0 ? tiebreakerOrder.slice(0, headToHeadIndex) : [];
  const clusterKey = (row: GroupStandingRow) =>
    priorCriteria.map((criterion) => String(criterionValue(row, criterion))).join('|');
  const clusterRows = new Map<string, GroupStandingRow[]>();
  const clusterMiniLeagueWins = new Map<string, Map<string, number>>();
  if (headToHeadIndex >= 0) {
    for (const row of rows) {
      const key = clusterKey(row);
      const cluster = clusterRows.get(key) || [];
      cluster.push(row);
      clusterRows.set(key, cluster);
    }
    for (const [key, cluster] of clusterRows) {
      if (cluster.length > 2) {
        clusterMiniLeagueWins.set(
          key,
          computeClusterMiniLeagueWins(cluster.map((row) => row.participantId))
        );
      }
    }
  }

  // Sort based on configurable tiebreakerOrder with transitive multi-way tie resolution
  rows.sort((a, b) => {
    for (const criterion of tiebreakerOrder) {
      if (criterion === 'points') {
        if (b.points !== a.points) return b.points - a.points;
      } else if (criterion === 'point_diff') {
        if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
      } else if (criterion === 'points_for') {
        if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
      } else if (criterion === 'points_average') {
        const avgA = a.pointsAverage || 0;
        const avgB = b.pointsAverage || 0;
        if (avgB !== avgA) return avgB - avgA;
      } else if (criterion === 'points_ratio') {
        const ratioA = a.pointsRatio || 0;
        const ratioB = b.pointsRatio || 0;
        if (ratioB !== ratioA) return ratioB - ratioA;
      } else if (criterion === 'head_to_head') {
        const isTiedOnPrior = priorCriteria.every((crit) => {
          return criterionValue(a, crit) === criterionValue(b, crit);
        });

        if (isTiedOnPrior) {
          const tiedCluster = clusterRows.get(clusterKey(a)) || [];

          if (tiedCluster.length === 2) {
            const winner = getPairwiseWinner(a.participantId, b.participantId);
            if (winner === a.participantId) return -1;
            if (winner === b.participantId) return 1;
          } else if (tiedCluster.length > 2) {
            const miniWins = clusterMiniLeagueWins.get(clusterKey(a)) || new Map<string, number>();
            const winsA = miniWins.get(a.participantId) || 0;
            const winsB = miniWins.get(b.participantId) || 0;
            if (winsB !== winsA) {
              return winsB - winsA;
            }
          }
        }
      } else if (criterion === 'buchholz') {
        const bA = a.buchholz || 0;
        const bB = b.buchholz || 0;
        if (bB !== bA) return bB - bA;
      } else if (criterion === 'median_buchholz') {
        const medianA = a.medianBuchholz || 0;
        const medianB = b.medianBuchholz || 0;
        if (medianB !== medianA) return medianB - medianA;
      } else if (criterion === 'game_wins') {
        if (b.gameWins !== a.gameWins) return b.gameWins - a.gameWins;
      } else if (criterion === 'seed') {
        if (a.participant.seed !== b.participant.seed) {
          return a.participant.seed - b.participant.seed;
        }
      }
    }
    return a.participant.displayName.localeCompare(b.participant.displayName);
  });

  // Assign ranks & advancement flag
  rows.forEach((row, idx) => {
    row.rank = idx + 1;
    row.advances = row.rank <= advanceCount;
  });

  return rows;
}
