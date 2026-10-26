import { Match, Participant, Round } from '../../../types/tournament';

export interface RoundRobinResult {
  rounds: Round[];
  matches: Match[];
}

/**
 * Generates all matches for a group or round-robin stage using the standard circle algorithm.
 * Handles even or odd number of players (adds dummy bye if odd).
 */
export function generateRoundRobin(
  tournamentId: string,
  stageId: string,
  participants: Participant[],
  options: {
    groupId?: string;
    groupName?: string;
    legs?: 1 | 2; // 1 vuelta o 2 vueltas (ida y vuelta)
  } = {}
): RoundRobinResult {
  const pList = [...participants];
  const isOdd = pList.length % 2 !== 0;
  if (isOdd) {
    // Add a null participant to represent a bye
    pList.push({
      id: '__BYE__',
      tournamentId,
      displayName: 'BYE',
      seed: 9999,
      checkedIn: true,
      inspected: true,
      status: 'active',
    });
  }

  const n = pList.length;
  const roundsCountPerLeg = n - 1;
  const matchesPerRound = n / 2;
  const legs = options.legs || 1;

  const rounds: Round[] = [];
  const matches: Match[] = [];

  // Circle algorithm rotation
  // Keep first participant fixed at index 0, rotate the rest
  const fixed = pList[0];
  const rotators = pList.slice(1);

  let matchGlobalIdx = 1;

  for (let leg = 1; leg <= legs; leg++) {
    const currentRotators = [...rotators];

    for (let r = 0; r < roundsCountPerLeg; r++) {
      const roundNum = (leg - 1) * roundsCountPerLeg + (r + 1);
      const roundId = options.groupId
        ? `${options.groupId}_r_${roundNum}`
        : `${stageId}_r_${roundNum}`;

      const roundName = options.groupName
        ? `${options.groupName} - Fecha ${roundNum}`
        : `Jornada ${roundNum}`;

      rounds.push({
        id: roundId,
        stageId,
        groupId: options.groupId,
        number: roundNum,
        bracket: 'group',
        name: roundName,
      });

      // Pair up fixed with currentRotators[0], then currentRotators[1] with currentRotators[last], etc.
      const currentRoundList = [fixed, ...currentRotators];

      for (let m = 0; m < matchesPerRound; m++) {
        const pA = currentRoundList[m];
        const pB = currentRoundList[n - 1 - m];

        // Skip if both are bye (impossible) or handle single bye
        const isABye = pA.id === '__BYE__';
        const isBBye = pB.id === '__BYE__';

        if (isABye && isBBye) continue;

        const p1 = leg === 1 ? pA : pB;
        const p2 = leg === 1 ? pB : pA;

        const isMatchBye = isABye || isBBye;
        const realP1Id = p1.id === '__BYE__' ? null : p1.id;
        const realP2Id = p2.id === '__BYE__' ? null : p2.id;
        const autoWinnerId = isABye ? realP2Id : (isBBye ? realP1Id : null);

        matches.push({
          id: options.groupId
            ? `${options.groupId}_m_r${roundNum}_p${m + 1}`
            : `${stageId}_m_r${roundNum}_p${m + 1}`,
          tournamentId,
          stageId,
          roundId,
          groupId: options.groupId,
          position: matchGlobalIdx++,
          participant1Id: realP1Id,
          participant2Id: realP2Id,
          winnerId: autoWinnerId,
          isDraw: false,
          isBye: isMatchBye,
          score1: 0,
          score2: 0,
          sets1: 0,
          sets2: 0,
          status: isMatchBye ? 'completed' : 'pending',
          refereeId: null,
          nextMatchWinnerId: null,
          nextMatchLoserId: null,
          version: 1,
        });
      }

      // Rotate rotators array: push first element to the end
      const first = currentRotators.shift()!;
      currentRotators.push(first);
    }
  }

  return { rounds, matches };
}
