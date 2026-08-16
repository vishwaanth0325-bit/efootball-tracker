import type { Match, TournamentFormat } from './types';

export interface GeneratedFixture {
  tournament_id: string;
  round: string;
  player1_id: string;
  player2_id: string;
  status: 'upcoming';
}

/**
 * Generate round-robin fixtures using the standard circle method.
 * Guarantees: no self-matches, no duplicate pairs in same round, balanced rounds.
 */
export function buildRoundRobinRounds(playerIds: string[]): [string, string][][] {
  const players = [...playerIds];
  if (players.length % 2 !== 0) {
    players.push('__BYE__');
  }

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
        // Alternate home/away for the fixed player
        if (i === 0 && r % 2 === 1) {
          roundMatches.push([right[i], left[i]]);
        } else {
          roundMatches.push([left[i], right[i]]);
        }
      }
    }
    rounds.push(roundMatches);
  }

  return rounds;
}

/**
 * Generate League / Round-Robin Fixtures
 */
export function generateLeagueFixtures(
  tournamentId: string,
  playerIds: string[],
  doubleRoundRobin: boolean = false,
  existingMatches: Match[] = []
): GeneratedFixture[] {
  if (playerIds.length < 2) return [];

  // Track existing match pairings to avoid duplicates
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
      fixtures.push({
        tournament_id: tournamentId,
        round,
        player1_id: p1,
        player2_id: p2,
        status: 'upcoming',
      });
      seen.add(key);
    }
  };

  // Leg 1
  rounds.forEach((roundMatches, i) => {
    roundMatches.forEach(([p1, p2]) => addFixture(p1, p2, `Round ${i + 1}`));
  });

  // Leg 2 (Reversed home/away)
  if (doubleRoundRobin) {
    rounds.forEach((roundMatches, i) => {
      roundMatches.forEach(([p1, p2]) =>
        addFixture(p2, p1, `Round ${rounds.length + i + 1} (Return)`)
      );
    });
  }

  return fixtures;
}

/**
 * Generate Knockout / Bracket Fixtures
 */
export function generateKnockoutFixtures(
  tournamentId: string,
  playerIds: string[],
  existingMatches: Match[] = []
): GeneratedFixture[] {
  if (playerIds.length < 2) return [];

  const existingPairs = new Set<string>();
  for (const m of existingMatches) {
    if (m.tournament_id === tournamentId) {
      existingPairs.add(`${m.player1_id}|${m.player2_id}`);
      existingPairs.add(`${m.player2_id}|${m.player1_id}`);
    }
  }

  const numPlayers = playerIds.length;
  const fixtures: GeneratedFixture[] = [];

  // Determine round naming based on player count
  let roundName = 'Round 1';
  if (numPlayers <= 2) {
    roundName = 'Final';
  } else if (numPlayers <= 4) {
    roundName = 'Semi-Final';
  } else if (numPlayers <= 8) {
    roundName = 'Quarter-Final';
  } else if (numPlayers <= 16) {
    roundName = 'Round of 16';
  } else if (numPlayers <= 32) {
    roundName = 'Round of 32';
  }

  // Shuffle or pair players 1v2, 3v4, 5v6...
  const shuffled = [...playerIds];
  
  // Pair players for the opening round
  let matchIndex = 1;
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      const key = `${p1}|${p2}`;
      const reverseKey = `${p2}|${p1}`;

      if (!existingPairs.has(key) && !existingPairs.has(reverseKey)) {
        const title = numPlayers <= 2 
          ? 'Final' 
          : `${roundName} Match ${matchIndex}`;
        
        fixtures.push({
          tournament_id: tournamentId,
          round: title,
          player1_id: p1,
          player2_id: p2,
          status: 'upcoming',
        });
        matchIndex++;
      }
    }
  }

  return fixtures;
}

/**
 * Generate Groups Fixtures
 * Divides players into balanced groups (Group A, Group B, etc.) and generates round-robin matches
 */
export function generateGroupFixtures(
  tournamentId: string,
  playerIds: string[],
  numGroups: number = 2,
  doubleRoundRobin: boolean = false,
  existingMatches: Match[] = []
): GeneratedFixture[] {
  if (playerIds.length < 2) return [];

  const existingPairs = new Set<string>();
  for (const m of existingMatches) {
    if (m.tournament_id === tournamentId) {
      existingPairs.add(`${m.player1_id}|${m.player2_id}`);
      if (!doubleRoundRobin) {
        existingPairs.add(`${m.player2_id}|${m.player1_id}`);
      }
    }
  }

  const actualGroupCount = Math.max(1, Math.min(numGroups, Math.floor(playerIds.length / 2)));
  const groups: string[][] = Array.from({ length: actualGroupCount }, () => []);

  // Distribute players across groups
  playerIds.forEach((pid, idx) => {
    groups[idx % actualGroupCount].push(pid);
  });

  const fixtures: GeneratedFixture[] = [];
  const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  groups.forEach((groupPlayers, groupIndex) => {
    if (groupPlayers.length < 2) return;
    const groupName = `Group ${groupLabels[groupIndex] || groupIndex + 1}`;
    const groupRounds = buildRoundRobinRounds(groupPlayers);

    groupRounds.forEach((roundMatches, rIdx) => {
      roundMatches.forEach(([p1, p2]) => {
        const key = `${p1}|${p2}`;
        if (!existingPairs.has(key)) {
          fixtures.push({
            tournament_id: tournamentId,
            round: `${groupName} - Round ${rIdx + 1}`,
            player1_id: p1,
            player2_id: p2,
            status: 'upcoming',
          });
        }
      });
    });

    if (doubleRoundRobin) {
      groupRounds.forEach((roundMatches, rIdx) => {
        roundMatches.forEach(([p1, p2]) => {
          const key = `${p2}|${p1}`;
          if (!existingPairs.has(key)) {
            fixtures.push({
              tournament_id: tournamentId,
              round: `${groupName} - Round ${groupRounds.length + rIdx + 1} (Return)`,
              player1_id: p2,
              player2_id: p1,
              status: 'upcoming',
            });
          }
        });
      });
    }
  });

  return fixtures;
}

/**
 * Universal Fixture Generator that routes based on tournament format
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
    case 'knockout':
      return generateKnockoutFixtures(tournamentId, playerIds, existingMatches);
    case 'groups':
    case 'group_knockout':
      return generateGroupFixtures(tournamentId, playerIds, numGroups, doubleRoundRobin, existingMatches);
    case 'league':
    case 'round_robin':
    default:
      return generateLeagueFixtures(tournamentId, playerIds, doubleRoundRobin, existingMatches);
  }
}

/**
 * Expected match count calculation helper
 */
export function countExpectedMatches(
  numPlayers: number,
  doubleRoundRobin: boolean = false,
  format: TournamentFormat = 'league',
  numGroups: number = 2
): number {
  if (numPlayers < 2) return 0;

  if (format === 'knockout') {
    return Math.floor(numPlayers / 2);
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

  // League / Round Robin
  const single = (numPlayers * (numPlayers - 1)) / 2;
  return doubleRoundRobin ? single * 2 : single;
}
