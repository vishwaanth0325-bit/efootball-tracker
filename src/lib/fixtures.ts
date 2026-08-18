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
 * Generate standard round-robin schedule using the Berger Tables / Circle Method.
 * 
 * Guarantees for ANY number of teams N >= 2:
 * 1. Even N: Exactly (N - 1) rounds, N/2 matches per round, N*(N-1)/2 total matches.
 * 2. Odd N: Automatically injects a virtual '__BYE__' team. Produces N rounds, (N-1)/2 matches per round, N*(N-1)/2 total matches.
 * 3. Integrity: No self-matches, no duplicate pairings, balanced home/away distribution, each team plays at most once per round.
 */
export function buildRoundRobinRounds(playerIds: string[]): [string, string][][] {
  const uniquePlayers = Array.from(new Set(playerIds.filter(Boolean)));
  if (uniquePlayers.length < 2) return [];

  const players = [...uniquePlayers];
  const isOdd = players.length % 2 !== 0;
  if (isOdd) {
    players.push('__BYE__');
  }

  const n = players.length;
  const numRounds = n - 1;
  const half = n / 2;
  const rounds: [string, string][][] = [];

  const fixed = players[0];
  const rotating = players.slice(1);

  for (let r = 0; r < numRounds; r++) {
    // Rotate players array clockwise around the fixed player at position 0
    const rot = [...rotating.slice(r), ...rotating.slice(0, r)];
    const left = [fixed, ...rot.slice(0, half - 1)];
    const right = [...rot.slice(half - 1)].reverse();

    const roundMatches: [string, string][] = [];
    for (let i = 0; i < half; i++) {
      const p1 = left[i];
      const p2 = right[i];

      // Exclude virtual BYE matches from actual fixture schedule
      if (p1 !== '__BYE__' && p2 !== '__BYE__') {
        // Alternate home and away to balance venue advantages
        if (i === 0 && r % 2 === 1) {
          roundMatches.push([p2, p1]);
        } else {
          roundMatches.push([p1, p2]);
        }
      }
    }
    rounds.push(roundMatches);
  }

  return rounds;
}

/**
 * Generate comprehensive League / Round-Robin Fixtures for any arbitrary number of teams.
 * Supports Single (N*(N-1)/2 matches) and Double Round Robin (N*(N-1) matches).
 */
export function generateLeagueFixtures(
  tournamentId: string,
  playerIds: string[],
  doubleRoundRobin: boolean = false,
  existingMatches: Match[] = []
): GeneratedFixture[] {
  const cleanPlayerIds = Array.from(new Set(playerIds.filter(Boolean)));
  if (cleanPlayerIds.length < 2) return [];

  // Track existing match pairings using normalized keys to prevent duplicate fixtures
  const existingPairs = new Set<string>();
  for (let i = 0; i < existingMatches.length; i++) {
    const m = existingMatches[i];
    if (m.tournament_id !== tournamentId || !m.player1_id || !m.player2_id) continue;

    if (doubleRoundRobin) {
      existingPairs.add(`${m.player1_id}->${m.player2_id}`);
    } else {
      const canonicalKey = [m.player1_id, m.player2_id].sort().join('<->');
      existingPairs.add(canonicalKey);
    }
  }

  const rounds = buildRoundRobinRounds(cleanPlayerIds);
  const fixtures: GeneratedFixture[] = [];
  let matchIndex = 1;

  // Leg 1: Initial Round Robin
  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    const roundMatches = rounds[rIdx];
    const roundTitle = `Round ${rIdx + 1}`;

    for (let mIdx = 0; mIdx < roundMatches.length; mIdx++) {
      const [p1, p2] = roundMatches[mIdx];
      const key = doubleRoundRobin
        ? `${p1}->${p2}`
        : [p1, p2].sort().join('<->');

      if (!existingPairs.has(key)) {
        fixtures.push({
          tournament_id: tournamentId,
          stage: 'league',
          round: roundTitle,
          match_code: `R${rIdx + 1}-M${mIdx + 1}`,
          player1_id: p1,
          player2_id: p2,
          status: 'upcoming',
        });
        existingPairs.add(key);
        matchIndex++;
      }
    }
  }

  // Leg 2: Double Round Robin (Strict return fixtures with reversed home/away)
  if (doubleRoundRobin) {
    const leg1RoundCount = rounds.length;
    for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
      const roundMatches = rounds[rIdx];
      const returnRoundNumber = leg1RoundCount + rIdx + 1;
      const roundTitle = `Round ${returnRoundNumber} (Return)`;

      for (let mIdx = 0; mIdx < roundMatches.length; mIdx++) {
        const [p1, p2] = roundMatches[mIdx];
        const returnKey = `${p2}->${p1}`; // Reversed home/away pairing

        if (!existingPairs.has(returnKey)) {
          fixtures.push({
            tournament_id: tournamentId,
            stage: 'league',
            round: roundTitle,
            match_code: `R${returnRoundNumber}-M${mIdx + 1}`,
            player1_id: p2,
            player2_id: p1,
            status: 'upcoming',
          });
          existingPairs.add(returnKey);
          matchIndex++;
        }
      }
    }
  }

  return fixtures;
}

/**
 * Generate Group Stage Fixtures (only used when explicit multi-group tournament formats are selected).
 */
export function generateGroupFixtures(
  tournamentId: string,
  playerIds: string[],
  numGroups: number = 2,
  doubleRoundRobin: boolean = false
): GeneratedFixture[] {
  const cleanPlayerIds = Array.from(new Set(playerIds.filter(Boolean)));
  if (cleanPlayerIds.length < 2) return [];

  const actualGroupCount = Math.max(1, Math.min(numGroups, Math.floor(cleanPlayerIds.length / 2)));
  const groups: string[][] = Array.from({ length: actualGroupCount }, () => []);

  // Distribute players across groups evenly
  cleanPlayerIds.forEach((pid, idx) => {
    groups[idx % actualGroupCount].push(pid);
  });

  const fixtures: GeneratedFixture[] = [];
  const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const groupPlayers = groups[gIdx];
    if (groupPlayers.length < 2) continue;

    const groupName = `Group ${groupLabels[gIdx] || gIdx + 1}`;
    const groupRounds = buildRoundRobinRounds(groupPlayers);

    for (let rIdx = 0; rIdx < groupRounds.length; rIdx++) {
      const roundMatches = groupRounds[rIdx];
      for (let mIdx = 0; mIdx < roundMatches.length; mIdx++) {
        const [p1, p2] = roundMatches[mIdx];
        fixtures.push({
          tournament_id: tournamentId,
          stage: 'group',
          round: `${groupName} - Round ${rIdx + 1}`,
          match_code: `${groupName.replace('Group ', 'G')}-R${rIdx + 1}-M${mIdx + 1}`,
          player1_id: p1,
          player2_id: p2,
          status: 'upcoming',
        });
      }
    }

    if (doubleRoundRobin) {
      const baseRoundCount = groupRounds.length;
      for (let rIdx = 0; rIdx < groupRounds.length; rIdx++) {
        const roundMatches = groupRounds[rIdx];
        for (let mIdx = 0; mIdx < roundMatches.length; mIdx++) {
          const [p1, p2] = roundMatches[mIdx];
          fixtures.push({
            tournament_id: tournamentId,
            stage: 'group',
            round: `${groupName} - Round ${baseRoundCount + rIdx + 1} (Return)`,
            match_code: `${groupName.replace('Group ', 'G')}-R${baseRoundCount + rIdx + 1}-M${mIdx + 1}`,
            player1_id: p2,
            player2_id: p1,
            status: 'upcoming',
          });
        }
      }
    }
  }

  return fixtures;
}

/**
 * Universal Fixture Generator dispatcher that routes cleanly based on tournament format.
 */
export function generateFixtures(
  tournamentId: string,
  playerIds: string[],
  doubleRoundRobin: boolean = false,
  existingMatches: Match[] = [],
  format: TournamentFormat = 'league',
  numGroups: number = 2
): GeneratedFixture[] {
  switch (format) {
    case 'groups':
    case 'group_knockout':
      return generateGroupFixtures(tournamentId, playerIds, numGroups, doubleRoundRobin);
    case 'knockout':
      // For standalone knockout, generate league/prelim fixtures or bracket
      return generateLeagueFixtures(tournamentId, playerIds, false, existingMatches);
    case 'league_knockout':
    case 'league':
    case 'round_robin':
    default:
      return generateLeagueFixtures(tournamentId, playerIds, doubleRoundRobin, existingMatches);
  }
}

/**
 * Calculates exact expected match count for a given player count and tournament format.
 */
export function countExpectedMatches(
  numPlayers: number,
  doubleRoundRobin: boolean = false,
  format: TournamentFormat = 'league',
  numGroups: number = 2
): number {
  if (numPlayers < 2) return 0;

  if (format === 'knockout') {
    return numPlayers - 1;
  }

  if (format === 'groups' || format === 'group_knockout') {
    const actualGroupCount = Math.max(1, Math.min(numGroups, Math.floor(numPlayers / 2)));
    let total = 0;
    const baseSize = Math.floor(numPlayers / actualGroupCount);
    const remainder = numPlayers % actualGroupCount;

    for (let i = 0; i < actualGroupCount; i++) {
      const size = i < remainder ? baseSize + 1 : baseSize;
      const groupMatches = (size * (size - 1)) / 2;
      total += doubleRoundRobin ? groupMatches * 2 : groupMatches;
    }
    return total;
  }

  // League / Round-Robin: N*(N-1)/2 (single) or N*(N-1) (double)
  const single = (numPlayers * (numPlayers - 1)) / 2;
  return doubleRoundRobin ? single * 2 : single;
}
