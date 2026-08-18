import type { Player, Match, Tournament, StandingRow } from './types';
import { computeStandings } from './calculations';

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

/**
 * Universal safe UUID generator that works reliably across browser (secure & non-secure HTTP contexts) and Node.js.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts normalized group name from a match entity (e.g., "Group A" from `group_name` or `round: "Group A - Match 1"`).
 */
export function extractGroupName(match: Match): string | null {
  if (match.group_name && match.group_name.trim().length > 0) {
    return match.group_name.trim();
  }
  if (match.round && /^group\s+[a-z0-9]+/i.test(match.round)) {
    const matchGroup = match.round.match(/^Group\s+([A-Z0-9]+)/i);
    if (matchGroup) {
      return `Group ${matchGroup[1].toUpperCase()}`;
    }
  }
  return null;
}

// ─── 1. Generic Knockout Bracket Architecture (Universal for any K >= 2) ──────

/**
 * Round name mapper based on power-of-2 participant count.
 */
export function getRoundNameForSize(size: number): string {
  switch (size) {
    case 2:
      return 'Final';
    case 4:
      return 'Semi-Final';
    case 8:
      return 'Quarter-Final';
    case 16:
      return 'Round of 16';
    case 32:
      return 'Round of 32';
    case 64:
      return 'Round of 64';
    default:
      return `Round of ${size}`;
  }
}

/**
 * Short match code prefix for round sizes.
 */
function getRoundCodePrefix(size: number): string {
  switch (size) {
    case 2:
      return 'FINAL';
    case 4:
      return 'SF';
    case 8:
      return 'QF';
    case 16:
      return 'R16';
    case 32:
      return 'R32';
    default:
      return `R${size}`;
  }
}

/**
 * Computes standard tournament bracket seed ordering for power-of-2 size M.
 * Ensures Seeds 1 & 2 are in opposite bracket halves, 3 & 4 in opposite quarters, etc.
 */
export function getBracketSeeds(size: number): number[] {
  if (size <= 2) return [1, 2];
  const prev = getBracketSeeds(size / 2);
  const result: number[] = [];
  for (let i = 0; i < prev.length; i++) {
    result.push(prev[i]);
    result.push(size + 1 - prev[i]);
  }
  return result;
}

export interface KnockoutStructureNode {
  id: string;
  match_code: string;
  round: string;
  round_size: number;
  seed1?: number;
  seed2?: number;
  p1_source_label: string;
  p2_source_label: string;
  p1_player_id?: string;
  p2_player_id?: string;
  next_match_id?: string;
  next_match_slot?: 'player1' | 'player2';
}

/**
 * Generates a complete, deterministic Knockout Bracket for ANY number of qualified teams K >= 2.
 * 
 * Mathematical Algorithm:
 * 1. M = 2^floor(log2(K)) (largest power of 2 <= K).
 * 2. E = K - M (preliminary / play-in matches).
 * 3. Lowest 2E seeds compete in E play-in matches.
 * 4. Top (2M - K) seeds receive BYES straight to Round of M.
 * 5. Total elimination matches = K - 1.
 */
export function generateKnockoutBracketFromStandings(
  tournamentId: string,
  qualifiedPlayers: Player[]
): Match[] {
  const K = qualifiedPlayers.length;
  if (K < 2) return [];

  // M = Largest power of 2 strictly <= K
  let M = 2;
  while (M * 2 <= K) {
    M *= 2;
  }

  const E = K - M; // Number of preliminary matches
  const byesCount = 2 * M - K; // Number of top seeds with direct byes into Round of M

  const now = new Date().toISOString();
  const playerBySeed = new Map<number, Player>();
  for (let i = 0; i < qualifiedPlayers.length; i++) {
    playerBySeed.set(i + 1, qualifiedPlayers[i]);
  }

  // Pre-generate UUIDs for all matches in bracket tree
  // Rounds: Main tournament from M down to 2 (e.g. QF -> SF -> Final)
  const matchesByRound: Map<number, KnockoutStructureNode[]> = new Map();

  let curSize = M;
  while (curSize >= 2) {
    const numMatchesInRound = curSize / 2;
    const roundMatches: KnockoutStructureNode[] = [];
    const prefix = getRoundCodePrefix(curSize);
    const rName = getRoundNameForSize(curSize);

    for (let mIdx = 0; mIdx < numMatchesInRound; mIdx++) {
      const matchCode = curSize === 2 ? 'FINAL' : `${prefix}${mIdx + 1}`;
      roundMatches.push({
        id: generateUUID(),
        match_code: matchCode,
        round: rName,
        round_size: curSize,
        p1_source_label: `Winner ${matchCode} (Slot 1)`,
        p2_source_label: `Winner ${matchCode} (Slot 2)`,
      });
    }
    matchesByRound.set(curSize, roundMatches);
    curSize = Math.floor(curSize / 2);
  }

  // Link downstream matches between consecutive power-of-2 rounds
  curSize = M;
  while (curSize > 2) {
    const curRound = matchesByRound.get(curSize)!;
    const nextRound = matchesByRound.get(curSize / 2)!;

    for (let i = 0; i < curRound.length; i++) {
      const parentMatchIndex = Math.floor(i / 2);
      const slot: 'player1' | 'player2' = i % 2 === 0 ? 'player1' : 'player2';
      curRound[i].next_match_id = nextRound[parentMatchIndex].id;
      curRound[i].next_match_slot = slot;
    }
    curSize = Math.floor(curSize / 2);
  }

  // Create Preliminary / Play-in round matches if K > M
  const prelimNodes: KnockoutStructureNode[] = [];
  const prelimTargetMap = new Map<number, { matchId: string; matchCode: string }>();

  if (E > 0) {
    for (let pIdx = 0; pIdx < E; pIdx++) {
      const highSeed = M - pIdx;
      const lowSeed = 2 * M + 1 - highSeed;
      const matchCode = `PI${pIdx + 1}`;
      const p1 = playerBySeed.get(highSeed);
      const p2 = playerBySeed.get(lowSeed);

      const node: KnockoutStructureNode = {
        id: generateUUID(),
        match_code: matchCode,
        round: 'Preliminary Round',
        round_size: K,
        seed1: highSeed,
        seed2: lowSeed,
        p1_source_label: `Seed ${highSeed}: ${p1?.name || `Seed ${highSeed}`}`,
        p2_source_label: `Seed ${lowSeed}: ${p2?.name || `Seed ${lowSeed}`}`,
        p1_player_id: p1?.id,
        p2_player_id: p2?.id,
      };

      prelimNodes.push(node);
      prelimTargetMap.set(highSeed, { matchId: node.id, matchCode });
    }
  }

  // Populate Round of M (e.g. Quarter-Finals) matchups with Seeds & Prelim links
  const seedsOrder = getBracketSeeds(M);
  const roundMMatches = matchesByRound.get(M)!;

  for (let mIdx = 0; mIdx < roundMMatches.length; mIdx++) {
    const node = roundMMatches[mIdx];
    const s1 = seedsOrder[mIdx * 2];
    const s2 = seedsOrder[mIdx * 2 + 1];

    node.seed1 = s1;
    node.seed2 = s2;

    // Slot 1 Participant
    if (s1 <= byesCount) {
      const p = playerBySeed.get(s1);
      node.p1_player_id = p?.id;
      node.p1_source_label = `Seed ${s1}: ${p?.name || `Seed ${s1}`} (Direct Bye)`;
    } else {
      const prelim = prelimTargetMap.get(s1);
      node.p1_source_label = prelim ? `Winner ${prelim.matchCode}` : `Winner Seed ${s1}`;
      if (prelim) {
        const pNode = prelimNodes.find(pn => pn.id === prelim.matchId);
        if (pNode) {
          pNode.next_match_id = node.id;
          pNode.next_match_slot = 'player1';
        }
      }
    }

    // Slot 2 Participant
    if (s2 <= byesCount) {
      const p = playerBySeed.get(s2);
      node.p2_player_id = p?.id;
      node.p2_source_label = `Seed ${s2}: ${p?.name || `Seed ${s2}`} (Direct Bye)`;
    } else {
      const prelim = prelimTargetMap.get(s2);
      node.p2_source_label = prelim ? `Winner ${prelim.matchCode}` : `Winner Seed ${s2}`;
      if (prelim) {
        const pNode = prelimNodes.find(pn => pn.id === prelim.matchId);
        if (pNode) {
          pNode.next_match_id = node.id;
          pNode.next_match_slot = 'player2';
        }
      }
    }
  }

  // Flatten all nodes into Match entities
  const allNodes: KnockoutStructureNode[] = [...prelimNodes];
  matchesByRound.forEach((nodes) => {
    allNodes.push(...nodes);
  });

  return allNodes.map((n) => ({
    id: n.id,
    tournament_id: tournamentId,
    stage: 'knockout',
    round: n.round,
    match_code: n.match_code,
    player1_id: n.p1_player_id,
    player2_id: n.p2_player_id,
    player1_placeholder: n.p1_source_label,
    player2_placeholder: n.p2_source_label,
    next_match_id: n.next_match_id,
    next_match_slot: n.next_match_slot,
    status: 'upcoming',
    created_at: now,
    updated_at: now,
  }));
}

// ─── 2. Group Assignment & Splitting Helpers (Explicit Group Tournaments) ─────

/**
 * Split players into groups where each group has a target size (e.g. 3 or 4 players).
 */
export function splitPlayersIntoGroupsBySize(
  playerIds: string[],
  playersPerGroup: number = 4
): Record<string, string[]> {
  const count = playerIds.length;
  if (count === 0) return {};

  const sanitizedPerGroup = Math.max(2, Math.floor(playersPerGroup || 4));
  const numGroups = Math.max(1, Math.ceil(count / sanitizedPerGroup));
  return buildDefaultGroupAssignments(playerIds, numGroups);
}

/**
 * Distribute player IDs evenly into specified number of Groups (A, B, C, D...).
 */
export function buildDefaultGroupAssignments(
  playerIds: string[],
  groupCount: number = 4
): Record<string, string[]> {
  const sanitizedCount = Math.max(1, Math.floor(groupCount || 1));
  const groups: Record<string, string[]> = {};

  const groupNames: string[] = [];
  for (let i = 0; i < sanitizedCount; i++) {
    const letter = i < GROUP_LETTERS.length ? GROUP_LETTERS[i] : `${i + 1}`;
    const name = `Group ${letter}`;
    groups[name] = [];
    groupNames.push(name);
  }

  if (!playerIds || playerIds.length === 0) {
    return groups;
  }

  const totalGroups = groupNames.length;
  for (let i = 0; i < playerIds.length; i++) {
    const targetGroupName = groupNames[i % totalGroups];
    groups[targetGroupName].push(playerIds[i]);
  }

  return groups;
}

/**
 * Shuffle an array of player IDs using the Fisher-Yates algorithm.
 */
export function shufflePlayerIds(playerIds: string[]): string[] {
  const arr = [...playerIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
}

/**
 * Generate group fixtures across all groups for group-stage tournaments.
 */
export function generateAllGroupFixtures(
  tournamentId: string,
  groupAssignments: Record<string, string[]>
): Omit<Match, 'id' | 'created_at' | 'updated_at'>[] {
  const allFixtures: Omit<Match, 'id' | 'created_at' | 'updated_at'>[] = [];
  const entries = Object.entries(groupAssignments);

  for (let e = 0; e < entries.length; e++) {
    const [groupName, pIds] = entries[e];
    if (pIds && pIds.length >= 2) {
      const cleanCodePrefix = groupName.replace(/Group\s*/i, 'G');
      let matchIndex = 1;
      for (let i = 0; i < pIds.length; i++) {
        for (let j = i + 1; j < pIds.length; j++) {
          allFixtures.push({
            tournament_id: tournamentId,
            stage: 'group',
            group_name: groupName,
            round: `${groupName} - Match ${matchIndex}`,
            match_code: `${cleanCodePrefix}-M${matchIndex}`,
            player1_id: pIds[i],
            player2_id: pIds[j],
            status: 'upcoming',
          });
          matchIndex++;
        }
      }
    }
  }

  return allFixtures;
}

// ─── 3. Group Standings & Completion ──────────────────────────────────────────

export interface GroupSummary {
  groupName: string;
  players: Player[];
  matches: Match[];
  standings: StandingRow[];
  totalMatches: number;
  completedMatches: number;
  isComplete: boolean;
  winner?: Player; // 1st Place
  runnerUp?: Player; // 2nd Place
}

export function computeAllGroupSummaries(
  tournament: Tournament,
  allPlayers: Player[],
  matches: Match[],
  groupAssignments?: Record<string, string[]>
): GroupSummary[] {
  const playerMap = new Map<string, Player>();
  for (let i = 0; i < allPlayers.length; i++) {
    playerMap.set(allPlayers[i].id, allPlayers[i]);
  }

  const matchesByGroup = new Map<string, Match[]>();
  const discoveredGroups = new Set<string>();

  if (groupAssignments) {
    const assignedKeys = Object.keys(groupAssignments);
    for (let k = 0; k < assignedKeys.length; k++) {
      discoveredGroups.add(assignedKeys[k]);
      matchesByGroup.set(assignedKeys[k], []);
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const isGroupMatch = m.stage === 'group' || (m.round && /^group/i.test(m.round));
    if (!isGroupMatch) continue;

    const gName = extractGroupName(m);
    if (gName) {
      discoveredGroups.add(gName);
      let groupList = matchesByGroup.get(gName);
      if (!groupList) {
        groupList = [];
        matchesByGroup.set(gName, groupList);
      }
      groupList.push(m);
    }
  }

  if (discoveredGroups.size === 0) {
    return [];
  }

  const sortedGroupNames = Array.from(discoveredGroups).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const summaries: GroupSummary[] = [];

  for (let g = 0; g < sortedGroupNames.length; g++) {
    const gName = sortedGroupNames[g];
    const gMatches = matchesByGroup.get(gName) || [];

    const gPlayerIdSet = new Set<string>();
    if (groupAssignments && groupAssignments[gName]) {
      const explicitIds = groupAssignments[gName];
      for (let p = 0; p < explicitIds.length; p++) {
        gPlayerIdSet.add(explicitIds[p]);
      }
    }
    for (let m = 0; m < gMatches.length; m++) {
      const match = gMatches[m];
      if (match.player1_id) gPlayerIdSet.add(match.player1_id);
      if (match.player2_id) gPlayerIdSet.add(match.player2_id);
    }

    const gPlayers: Player[] = [];
    gPlayerIdSet.forEach((pid) => {
      const p = playerMap.get(pid);
      if (p) gPlayers.push(p);
    });

    const standings = computeStandings(tournament.id, gPlayers, gMatches, tournament);

    let completedCount = 0;
    for (let m = 0; m < gMatches.length; m++) {
      if (gMatches[m].status === 'completed') {
        completedCount++;
      }
    }

    const totalMatches = gMatches.length;
    const isComplete = totalMatches > 0 && completedCount === totalMatches;

    summaries.push({
      groupName: gName,
      players: gPlayers,
      matches: gMatches,
      standings,
      totalMatches,
      completedMatches: completedCount,
      isComplete,
      winner: standings[0]?.player,
      runnerUp: standings[1]?.player,
    });
  }

  return summaries;
}

export function checkAllGroupsComplete(summaries: GroupSummary[]): boolean {
  if (!summaries || summaries.length === 0) return false;
  for (let i = 0; i < summaries.length; i++) {
    if (!summaries[i].isComplete || summaries[i].totalMatches === 0) {
      return false;
    }
  }
  return true;
}

// ─── 4. World Cup Knockout Stage Generator (for Group Stage Tournaments) ───────

export function generateKnockoutBracketMatches(
  tournamentId: string,
  groupSummaries: GroupSummary[]
): Match[] {
  // Collect 1st and 2nd place qualifiers from groups
  const qualifiers: Player[] = [];
  groupSummaries.forEach(gs => {
    if (gs.winner) qualifiers.push(gs.winner);
  });
  groupSummaries.forEach(gs => {
    if (gs.runnerUp) qualifiers.push(gs.runnerUp);
  });

  return generateKnockoutBracketFromStandings(tournamentId, qualifiers);
}

// ─── 5. Knockout Match Winner Progression & Cascade Updates ────────────────────

export function advanceKnockoutWinner(
  allMatches: Match[],
  matchId: string,
  winnerId?: string | null
): Match[] {
  const currentMatch = allMatches.find(m => m.id === matchId);
  if (!currentMatch || !currentMatch.next_match_id || !currentMatch.next_match_slot) {
    return allMatches;
  }

  const nextMatchId = currentMatch.next_match_id;
  const nextSlot = currentMatch.next_match_slot;
  const targetWinnerId = winnerId ? winnerId : undefined;

  let hasChange = false;

  const nextMatches = allMatches.map(m => {
    if (m.id === nextMatchId) {
      const currentSlotVal = nextSlot === 'player1' ? m.player1_id : m.player2_id;
      if (currentSlotVal === targetWinnerId) {
        return m; // Idempotent
      }

      hasChange = true;
      const updated: Match = {
        ...m,
        updated_at: new Date().toISOString(),
      };

      if (nextSlot === 'player1') {
        updated.player1_id = targetWinnerId;
      } else {
        updated.player2_id = targetWinnerId;
      }
      return updated;
    }
    return m;
  });

  return hasChange ? nextMatches : allMatches;
}

// ─── 6. Tournament Progress Calculation ────────────────────────────────────────

export interface TournamentProgress {
  leagueProgress: number;
  groupProgress: number;
  prelimProgress: number;
  r16Progress: number;
  qfProgress: number;
  sfProgress: number;
  finalProgress: number;
  overallProgress: number;
  isComplete: boolean;
  champion?: Player;
  runnerUp?: Player;
}

export function computeTournamentProgress(
  matches: Match[],
  players: Player[]
): TournamentProgress {
  if (!matches || matches.length === 0) {
    return {
      leagueProgress: 0,
      groupProgress: 0,
      prelimProgress: 0,
      r16Progress: 0,
      qfProgress: 0,
      sfProgress: 0,
      finalProgress: 0,
      overallProgress: 0,
      isComplete: false,
    };
  }

  const playerMap = new Map<string, Player>();
  for (let i = 0; i < players.length; i++) {
    playerMap.set(players[i].id, players[i]);
  }

  let totalLeague = 0, completedLeague = 0;
  let totalGroup = 0, completedGroup = 0;
  let totalPrelim = 0, completedPrelim = 0;
  let totalR16 = 0, completedR16 = 0;
  let totalQF = 0, completedQF = 0;
  let totalSF = 0, completedSF = 0;
  let totalFinal = 0, completedFinal = 0;
  let totalMatches = 0, completedMatches = 0;

  let finalMatch: Match | undefined;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    totalMatches++;
    const isCompleted = m.status === 'completed';
    if (isCompleted) completedMatches++;

    const stage = m.stage?.toLowerCase();
    const round = (m.round || '').toLowerCase();
    const code = (m.match_code || '').toUpperCase();

    if (stage === 'league' || (!stage && round.startsWith('round '))) {
      totalLeague++;
      if (isCompleted) completedLeague++;
    } else if (stage === 'group' || round.startsWith('group')) {
      totalGroup++;
      if (isCompleted) completedGroup++;
    } else if (round.includes('preliminary') || round.includes('play-in') || code.startsWith('PI')) {
      totalPrelim++;
      if (isCompleted) completedPrelim++;
    } else if (round.includes('round of 16') || code.startsWith('R16')) {
      totalR16++;
      if (isCompleted) completedR16++;
    } else if (round.includes('quarter') || code.startsWith('QF')) {
      totalQF++;
      if (isCompleted) completedQF++;
    } else if (round.includes('semi') || code.startsWith('SF')) {
      totalSF++;
      if (isCompleted) completedSF++;
    } else if (round.includes('final') || code === 'FINAL') {
      totalFinal++;
      if (isCompleted) completedFinal++;
      finalMatch = m;
    }
  }

  const calcPct = (completed: number, total: number) =>
    total > 0 ? Math.round((completed / total) * 100) : 0;

  const leagueProgress = calcPct(completedLeague, totalLeague);
  const groupProgress = calcPct(completedGroup, totalGroup);
  const prelimProgress = calcPct(completedPrelim, totalPrelim);
  const r16Progress = calcPct(completedR16, totalR16);
  const qfProgress = calcPct(completedQF, totalQF);
  const sfProgress = calcPct(completedSF, totalSF);
  const finalProgress = calcPct(completedFinal, totalFinal);
  const overallProgress = calcPct(completedMatches, totalMatches);

  let champion: Player | undefined;
  let runnerUp: Player | undefined;

  if (finalMatch && finalMatch.status === 'completed') {
    let winnerId = finalMatch.winner_id;

    if (!winnerId && finalMatch.player1_id && finalMatch.player2_id) {
      const p1Score = finalMatch.player1_score ?? 0;
      const p2Score = finalMatch.player2_score ?? 0;
      if (p1Score > p2Score) {
        winnerId = finalMatch.player1_id;
      } else if (p2Score > p1Score) {
        winnerId = finalMatch.player2_id;
      } else if (
        finalMatch.penalty_player1_score !== undefined &&
        finalMatch.penalty_player2_score !== undefined
      ) {
        winnerId =
          finalMatch.penalty_player1_score > finalMatch.penalty_player2_score
            ? finalMatch.player1_id
            : finalMatch.player2_id;
      }
    }

    if (winnerId) {
      champion = playerMap.get(winnerId);
      const loserId =
        finalMatch.player1_id === winnerId ? finalMatch.player2_id : finalMatch.player1_id;
      if (loserId) {
        runnerUp = playerMap.get(loserId);
      }
    }
  }

  return {
    leagueProgress,
    groupProgress,
    prelimProgress,
    r16Progress,
    qfProgress,
    sfProgress,
    finalProgress,
    overallProgress,
    isComplete: finalProgress === 100 || (matches.length > 0 && overallProgress === 100),
    champion,
    runnerUp,
  };
}
