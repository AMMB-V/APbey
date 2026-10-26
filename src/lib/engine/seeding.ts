import { Participant } from '../../types/tournament';

/**
 * Returns the next power of 2 greater than or equal to n.
 * E.g. 5 -> 8, 12 -> 16, 17 -> 32.
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 2) return 2;
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

/**
 * Standard tournament bracket seed pairing for single/double elimination.
 * For 8 seeds: [[1, 8], [4, 5], [2, 7], [3, 6]]
 * Such that top seeds only meet in later rounds.
 */
export function generateSeedPairs(bracketSize: number): [number, number][] {
  if (bracketSize < 2) return [[1, 2]];

  let rounds = [1, 2];
  while (rounds.length < bracketSize) {
    const nextRounds: number[] = [];
    const sum = rounds.length * 2 + 1;
    for (const seed of rounds) {
      nextRounds.push(seed);
      nextRounds.push(sum - seed);
    }
    rounds = nextRounds;
  }

  const pairs: [number, number][] = [];
  for (let i = 0; i < rounds.length; i += 2) {
    pairs.push([rounds[i], rounds[i + 1]]);
  }
  return pairs;
}

/**
 * Distributes participants into groups using serpentine distribution based on seed.
 * Group A: 1, 8, 9, 16...
 * Group B: 2, 7, 10, 15...
 * Group C: 3, 6, 11, 14...
 * Group D: 4, 5, 12, 13...
 */
export function buildSerpentineGroups(
  participants: Participant[],
  groupCount: number
): Participant[][] {
  const sorted = [...participants].sort((a, b) => a.seed - b.seed);
  const groups: Participant[][] = Array.from({ length: groupCount }, () => []);

  let goingForward = true;
  let groupIndex = 0;

  for (const p of sorted) {
    groups[groupIndex].push(p);

    if (goingForward) {
      if (groupIndex === groupCount - 1) {
        goingForward = false;
      } else {
        groupIndex++;
      }
    } else {
      if (groupIndex === 0) {
        goingForward = true;
      } else {
        groupIndex--;
      }
    }
  }

  return groups;
}

/**
 * Re-numbers the seeds of participants sequentially starting from 1.
 */
export function normalizeSeeds(participants: Participant[]): Participant[] {
  return participants.map((p, idx) => ({
    ...p,
    seed: idx + 1,
  }));
}

/**
 * Randomizes seeds of participants using Fisher-Yates shuffle.
 */
export function shuffleSeeds(participants: Participant[]): Participant[] {
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return normalizeSeeds(shuffled);
}
