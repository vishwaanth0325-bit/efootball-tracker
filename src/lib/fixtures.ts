import type { Match } from './types';

/**
 * Generate round-robin fixtures using the circle method.
 * Guarantees: no self-matches, no duplicate pairs, balanced rounds.
 */
function buildRoundRobinRounds(playerIds: string[]): [string, string][][] {
  const players = [...playerIds];
  if (players.length % 2 !== 0) players.push('__BYE__');

  const n = players.length;
  const numRounds = n - 1;
  const half = n / 2;
  const rounds: [string, string][][] = [];

  const fixed = players[0];
  const rotating = players.slice(1);

  for (let r = 0; r < numRounds; r++) {
    const rot = [...rotating.slice(r), ...rotating.slice(0, r)];
    const left = [fixed, ...rot.slice(0, half - 1)];
    const right = [...rot.slice(half - 1)].reverse();

    const roundMatches: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      if (left[i] !== '__BYE__' && right[i] !== '__BYE__') {
        roundMatches.push([left[i], right[i]]);
      }
    }
    rounds.push(roundMatches);
  }

  return rounds;
}

export interface GeneratedFixture {
  tournament_id: string;
  round: string;
  player1_id: string;
  player2_id: string;
  status: 'upcoming';
}

/**
 * Generate fixtures for a tournament.
 * Skips pairs that already have a match in existingMatches.
 */
export function generateFixtures(
  tournamentId: string,
  playerIds: string[],
  doubleRoundRobin: boolean,
  existingMatches: Match[]
): GeneratedFixture[] {
  if (playerIds.length < 2) return [];

  // Build set of existing pairs (both directions)
  const existingPairs = new Set<string>();
  for (const m of existingMatches) {
    if (m.tournament_id !== tournamentId) continue;
    existingPairs.add(`${m.player1_id}|${m.player2_id}`);
    if (!doubleRoundRobin) {
      existingPairs.add(`${m.player2_id}|${m.player1_id}`);
    }
  }

  const rounds = buildRoundRobinRounds(playerIds);
  const fixtures: GeneratedFixture[] = [];
  const seen = new Set<string>(existingPairs);

  const addFixture = (p1: string, p2: string, round: string) => {
    const key = `${p1}|${p2}`;
    const reverseKey = `${p2}|${p1}`;
    const alreadyExists = doubleRoundRobin
      ? seen.has(key)
      : seen.has(key) || seen.has(reverseKey);
    if (!alreadyExists) {
      fixtures.push({ tournament_id: tournamentId, round, player1_id: p1, player2_id: p2, status: 'upcoming' });
      seen.add(key);
    }
  };

  // First leg
  rounds.forEach((roundMatches, i) => {
    roundMatches.forEach(([p1, p2]) => addFixture(p1, p2, `Round ${i + 1}`));
  });

  // Second leg (reversed home/away)
  if (doubleRoundRobin) {
    rounds.forEach((roundMatches, i) => {
      roundMatches.forEach(([p1, p2]) =>
        addFixture(p2, p1, `Round ${rounds.length + i + 1}`)
      );
    });
  }

  return fixtures;
}

/** Expected total matches for a given number of players */
export function countExpectedMatches(numPlayers: number, doubleRoundRobin: boolean): number {
  const single = (numPlayers * (numPlayers - 1)) / 2;
  return doubleRoundRobin ? single * 2 : single;
}
