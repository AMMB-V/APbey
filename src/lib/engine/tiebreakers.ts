import {
  GroupStandingRow,
  Match,
  Participant,
  TiebreakerCriteria,
} from '../../types/tournament';

export function computeStandings(
  matches: Match[],
  participants: Participant[],
  tiebreakerOrder: TiebreakerCriteria[] = ['points', 'point_diff', 'points_for', 'head_to_head', 'seed'],
  advanceCount: number = 2
): GroupStandingRow[] {
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
      points: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== 'completed' || !match.participant1Id || !match.participant2Id) {
      continue;
    }

    const s1 = statsMap.get(match.participant1Id);
    const s2 = statsMap.get(match.participant2Id);

    if (s1 && s2) {
      s1.played += 1;
      s2.played += 1;

      s1.pointsFor += match.score1;
      s1.pointsAgainst += match.score2;
      s2.pointsFor += match.score2;
      s2.pointsAgainst += match.score1;

      if (match.isDraw) {
        s1.drawn += 1;
        s2.drawn += 1;
        s1.points += 1;
        s2.points += 1;
      } else if (match.winnerId === match.participant1Id) {
        s1.won += 1;
        s2.lost += 1;
        s1.points += 3;
      } else if (match.winnerId === match.participant2Id) {
        s2.won += 1;
        s1.lost += 1;
        s2.points += 3;
      }
    }
  }

  // Helper for Buchholz (sum of opponents' tournament points)
  const buchholzMap = new Map<string, number>();
  for (const p of participants) {
    let opponentPointsSum = 0;
    for (const match of matches) {
      if (match.status !== 'completed' || !match.participant1Id || !match.participant2Id) {
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
        }
      }
    }
    buchholzMap.set(p.id, opponentPointsSum);
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
      pointDiff,
      points: s.points,
      pointsAverage,
      pointsRatio,
      buchholz,
      rank: 1,
      advances: false,
    };
  });

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
        // Find all candidates that are tied on all prior criteria
        const priorIdx = tiebreakerOrder.indexOf('head_to_head');
        const priorCriteria = tiebreakerOrder.slice(0, priorIdx);

        const isTiedOnPrior = priorCriteria.every((crit) => {
          if (crit === 'points') return a.points === b.points;
          if (crit === 'point_diff') return a.pointDiff === b.pointDiff;
          if (crit === 'points_for') return a.pointsFor === b.pointsFor;
          if (crit === 'points_average') return (a.pointsAverage || 0) === (b.pointsAverage || 0);
          if (crit === 'points_ratio') return (a.pointsRatio || 0) === (b.pointsRatio || 0);
          if (crit === 'buchholz') return (a.buchholz || 0) === (b.buchholz || 0);
          return true;
        });

        if (isTiedOnPrior) {
          const tiedCluster = rows.filter((r) =>
            priorCriteria.every((crit) => {
              if (crit === 'points') return r.points === a.points;
              if (crit === 'point_diff') return r.pointDiff === a.pointDiff;
              if (crit === 'points_for') return r.pointsFor === a.pointsFor;
              if (crit === 'points_average') return (r.pointsAverage || 0) === (a.pointsAverage || 0);
              if (crit === 'points_ratio') return (r.pointsRatio || 0) === (a.pointsRatio || 0);
              if (crit === 'buchholz') return (r.buchholz || 0) === (a.buchholz || 0);
              return true;
            })
          );

          if (tiedCluster.length === 2) {
            const winner = getPairwiseWinner(a.participantId, b.participantId);
            if (winner === a.participantId) return -1;
            if (winner === b.participantId) return 1;
          } else if (tiedCluster.length > 2) {
            const clusterIds = tiedCluster.map((c) => c.participantId);
            const miniWins = computeClusterMiniLeagueWins(clusterIds);
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
