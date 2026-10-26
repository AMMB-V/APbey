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

  // Head to head resolver
  const getHeadToHead = (idA: string, idB: string): number => {
    for (const m of matches) {
      if (m.status !== 'completed') continue;
      if (
        (m.participant1Id === idA && m.participant2Id === idB) ||
        (m.participant1Id === idB && m.participant2Id === idA)
      ) {
        if (m.winnerId === idA) return -1; // A wins
        if (m.winnerId === idB) return 1;  // B wins
        return 0; // draw
      }
    }
    return 0;
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

  // Sort based on configurable tiebreakerOrder
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
        const h2h = getHeadToHead(a.participantId, b.participantId);
        if (h2h !== 0) return h2h;
      } else if (criterion === 'buchholz') {
        const bA = a.buchholz || 0;
        const bB = b.buchholz || 0;
        if (bB !== bA) return bB - bA;
      } else if (criterion === 'seed') {
        // Lower seed number is better (Seed 1 > Seed 8)
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
