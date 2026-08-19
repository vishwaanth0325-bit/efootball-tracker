import type { Match, TournamentFormat } from './types';

export interface GeneratedFixture {
  tournament_id: string;
  stage?: 'league' | 'group' | 'knockout';
  round: string;
  match_code?: string;
  player1_id: string;
  player2_id: string;
  status: 'upcoming';
}

/**
 * Round Robin schedule using the Circle / Berger Table method.
 *
 * Algorithm (from reference image):
 *   If N is odd: add ghost "__BYE__" team so N' = N+1 (even).
 *   If N is even: N' = N.
 *   Fix Team 1 at position 0. Rotate remaining N'−1 teams clockwise each round.
 *   Total rounds R = N'−1, matches per round = N'/2, total = N(N−1)/2.
 *   Pairs with the ghost team → rest week (excluded from output).
 */
export function buildRoundRobinRounds(playerIds: string[]): [string, string][][] {
  const unique = Array.from(new Set(playerIds.filter(Boolean)));
  if (unique.length < 2) return [];

  const players = [...unique];
  if (players.length % 2 !== 0) players.push('__BYE__'); // ghost / bye

  const n = players.length;       // N' (even)
  const numRounds = n - 1;        // R = N'−1
  const half = n / 2;

  const fixed = players[0];
  const rotating = players.slice(1);
  const rounds: [string, string][][] = [];

  for (let r = 0; r < numRounds; r++) {
    // Rotate clockwise: bring last (r) elements to the front
    const rot = [...rotating.slice(r), ...rotating.slice(0, r)];
    const left  = [fixed, ...rot.slice(0, half - 1)];
    const right = [...rot.slice(half - 1)].reverse();

    const roundMatches: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const p1 = left[i];
      const p2 = right[i];
      if (p1 === '__BYE__' || p2 === '__BYE__') continue; // rest week
      // Alternate home/away for the fixed slot to balance venue advantage
      if (i === 0 && r % 2 === 1) roundMatches.push([p2, p1]);
      else roundMatches.push([p1, p2]);
    }
    rounds.push(roundMatches);
  }

  return rounds;
}

/**
 * Generate League / Round-Robin fixtures.
 * Single Round Robin: N(N-1)/2 matches.
 * Double Round Robin: N(N-1) matches (return leg with reversed home/away).
 */
export function generateLeagueFixtures(
  tournamentId: string,
  playerIds: string[],
  doubleRoundRobin: boolean = false,
  existingMatches: Match[] = []
): GeneratedFixture[] {
  const clean = Array.from(new Set(playerIds.filter(Boolean)));
  if (clean.length < 2) return [];

  const existingPairs = new Set<string>();
  for (const m of existingMatches) {
    if (m.tournament_id !== tournamentId || !m.player1_id || !m.player2_id) continue;
    if (doubleRoundRobin) {
      existingPairs.add(`${m.player1_id}->${m.player2_id}`);
    } else {
      existingPairs.add([m.player1_id, m.player2_id].sort().join('<->'));
    }
  }

  const rounds = buildRoundRobinRounds(clean);
  const fixtures: GeneratedFixture[] = [];

  // Leg 1
  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    for (let mIdx = 0; mIdx < rounds[rIdx].length; mIdx++) {
      const [p1, p2] = rounds[rIdx][mIdx];
      const key = doubleRoundRobin ? `${p1}->${p2}` : [p1, p2].sort().join('<->');
      if (existingPairs.has(key)) continue;
      existingPairs.add(key);
      fixtures.push({
        tournament_id: tournamentId,
        stage: 'league',
        round: `Round ${rIdx + 1}`,
        match_code: `R${rIdx + 1}-M${mIdx + 1}`,
        player1_id: p1,
        player2_id: p2,
        status: 'upcoming',
      });
    }
  }

  // Leg 2 (return fixtures, reversed home/away)
  if (doubleRoundRobin) {
    const legOffset = rounds.length;
    for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
      for (let mIdx = 0; mIdx < rounds[rIdx].length; mIdx++) {
        const [p1, p2] = rounds[rIdx][mIdx];
        const key = `${p2}->${p1}`;
        if (existingPairs.has(key)) continue;
        existingPairs.add(key);
        fixtures.push({
          tournament_id: tournamentId,
          stage: 'league',
          round: `Round ${legOffset + rIdx + 1} (Return)`,
          match_code: `R${legOffset + rIdx + 1}-M${mIdx + 1}`,
          player1_id: p2,
          player2_id: p1,
          status: 'upcoming',
        });
      }
    }
  }

  return fixtures;
}

/**
 * Dispatcher — routes to the correct generator based on tournament format.
 * Group formats (group_knockout) are handled in tournamentEngine.ts via
 * generateAllGroupFixtures(); only league/knockout handled here.
 */
export function generateFixtures(
  tournamentId: string,
  playerIds: string[],
  doubleRoundRobin: boolean = false,
  existingMatches: Match[] = [],
  format: TournamentFormat = 'league'
): GeneratedFixture[] {
  switch (format) {
    case 'league_knockout':
    case 'league':
      return generateLeagueFixtures(tournamentId, playerIds, doubleRoundRobin, existingMatches);
    case 'knockout':
      // Knockout bracket is generated separately via generateKnockoutBracketFromStandings()
      // This path is unused in practice but returns empty to avoid errors.
      return [];
    case 'group_knockout':
      // Group fixtures are generated via generateAllGroupFixtures() in tournamentEngine.ts
      return [];
    default:
      return generateLeagueFixtures(tournamentId, playerIds, doubleRoundRobin, existingMatches);
  }
}

/**
 * Expected match count for a given player count and format.
 */
export function countExpectedMatches(
  numPlayers: number,
  doubleRoundRobin: boolean = false,
  format: TournamentFormat = 'league'
): number {
  if (numPlayers < 2) return 0;
  if (format === 'knockout') return numPlayers - 1;
  if (format === 'group_knockout') return 0; // depends on group assignments
  const single = (numPlayers * (numPlayers - 1)) / 2;
  return doubleRoundRobin ? single * 2 : single;
}
