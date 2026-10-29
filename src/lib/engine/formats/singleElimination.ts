import { Match, Participant, Round } from '../../../types/tournament';
import { generateSeedPairs, nextPowerOfTwo } from '../seeding';

export interface SingleEliminationResult {
  rounds: Round[];
  matches: Match[];
}

export function generateSingleElimination(
  tournamentId: string,
  stageId: string,
  participants: Participant[],
  options: { thirdPlaceMatch?: boolean } = {}
): SingleEliminationResult {
  const count = participants.length;
  if (count < 2) {
    throw new Error('Se requieren al menos 2 participantes para generar la llave.');
  }

  const bracketSize = nextPowerOfTwo(count);
  const totalRounds = Math.log2(bracketSize);

  // Participant seed map
  const seedToParticipant = new Map<number, Participant>();
  for (const p of participants) {
    seedToParticipant.set(p.seed, p);
  }

  const rounds: Round[] = [];
  const matches: Match[] = [];

  // Helper to name rounds in Spanish
  const getRoundName = (roundNum: number, total: number): string => {
    const fromFinal = total - roundNum;
    if (fromFinal === 0) return 'Gran Final';
    if (fromFinal === 1) return 'Semifinales';
    if (fromFinal === 2) return 'Cuartos de Final';
    if (fromFinal === 3) return 'Octavos de Final';
    if (fromFinal === 4) return 'Dieciseisavos de Final';
    return `Ronda ${roundNum}`;
  };

  // 1. Create rounds
  for (let r = 1; r <= totalRounds; r++) {
    rounds.push({
      id: `${stageId}_r_${r}`,
      stageId,
      number: r,
      bracket: 'winners',
      name: getRoundName(r, totalRounds),
    });
  }

  // Optional Third Place Round
  if (options.thirdPlaceMatch && totalRounds >= 2) {
    rounds.push({
      id: `${stageId}_r_3rd`,
      stageId,
      number: totalRounds + 1,
      bracket: 'winners',
      name: 'Tercer Lugar',
    });
  }

  // 2. Create matches per round (from finals backwards or forwards)
  // Let's create empty match shells for each round so we have IDs to link nextMatchWinnerId
  const roundMatchesMap = new Map<number, Match[]>();
  let currentMatchCount = bracketSize / 2;

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches: Match[] = [];
    for (let m = 0; m < currentMatchCount; m++) {
      const matchId = `${stageId}_m_r${r}_p${m + 1}`;
      roundMatches.push({
        id: matchId,
        tournamentId,
        stageId,
        roundId: `${stageId}_r_${r}`,
        position: m + 1,
        participant1Id: null,
        participant2Id: null,
        winnerId: null,
        isDraw: false,
        isBye: false,
        score1: 0,
        score2: 0,
        sets1: 0,
        sets2: 0,
        status: 'pending',
        refereeId: null,
        nextMatchWinnerId: null,
        nextMatchLoserId: null,
        version: 1,
      });
    }
    roundMatchesMap.set(r, roundMatches);
    currentMatchCount = currentMatchCount / 2;
  }

  // Wire nextMatchWinnerId forward
  for (let r = 1; r < totalRounds; r++) {
    const currentMatches = roundMatchesMap.get(r)!;
    const nextMatches = roundMatchesMap.get(r + 1)!;
    for (let i = 0; i < currentMatches.length; i++) {
      const nextMatchIndex = Math.floor(i / 2);
      currentMatches[i].nextMatchWinnerId = nextMatches[nextMatchIndex]?.id || null;
    }
  }

  // Handle Third Place Match if enabled
  let thirdPlaceMatch: Match | null = null;
  if (options.thirdPlaceMatch && totalRounds >= 2) {
    thirdPlaceMatch = {
      id: `${stageId}_m_3rd_place`,
      tournamentId,
      stageId,
      roundId: `${stageId}_r_3rd`,
      position: 1,
      participant1Id: null,
      participant2Id: null,
      winnerId: null,
      isDraw: false,
      isBye: false,
      score1: 0,
      score2: 0,
      sets1: 0,
      sets2: 0,
      status: 'pending',
      refereeId: null,
      nextMatchWinnerId: null,
      nextMatchLoserId: null,
      version: 1,
    };

    // Semifinals losers go to 3rd place match
    const semis = roundMatchesMap.get(totalRounds - 1);
    if (semis && semis.length === 2) {
      semis[0].nextMatchLoserId = thirdPlaceMatch.id;
      semis[1].nextMatchLoserId = thirdPlaceMatch.id;
    }
  }

  // 3. Populate Round 1 with seeds and handle Byes
  const seedPairs = generateSeedPairs(bracketSize);
  const r1Matches = roundMatchesMap.get(1)!;

  for (let i = 0; i < r1Matches.length; i++) {
    const pair = seedPairs[i];
    const p1 = seedToParticipant.get(pair[0]) || null;
    const p2 = seedToParticipant.get(pair[1]) || null;

    r1Matches[i].participant1Id = p1 ? p1.id : null;
    r1Matches[i].participant2Id = p2 ? p2.id : null;

    // Handle Bye
    if (p1 && !p2) {
      // P1 automatically wins via Bye
      r1Matches[i].isBye = true;
      r1Matches[i].winnerId = p1.id;
      r1Matches[i].status = 'completed';
      r1Matches[i].score1 = 0;
      r1Matches[i].score2 = 0;
    } else if (!p1 && p2) {
      // P2 automatically wins via Bye
      r1Matches[i].isBye = true;
      r1Matches[i].winnerId = p2.id;
      r1Matches[i].status = 'completed';
      r1Matches[i].score1 = 0;
      r1Matches[i].score2 = 0;
    }
  }

  // Propagate byes through every round. Without this, a bracket with 5-7
  // participants leaves a one-player match pending in round 2 or later.
  for (let r = 1; r < totalRounds; r++) {
    const currentMatches = roundMatchesMap.get(r)!;
    const nextMatches = roundMatchesMap.get(r + 1)!;

    for (let i = 0; i < currentMatches.length; i++) {
      const match = currentMatches[i];
      if (!match.isBye || !match.winnerId) continue;

      const nextMatch = nextMatches[Math.floor(i / 2)];
      const slot = i % 2 === 0 ? 'participant1Id' : 'participant2Id';
      nextMatch[slot] = match.winnerId;
    }

  }

  // Flatten matches list
  for (let r = 1; r <= totalRounds; r++) {
    matches.push(...roundMatchesMap.get(r)!);
  }
  if (thirdPlaceMatch) {
    matches.push(thirdPlaceMatch);
  }

  return { rounds, matches };
}
