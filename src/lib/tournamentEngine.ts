import type { Player, Match, Tournament, StandingRow } from './types';
import { computeStandings } from './calculations';

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

/**
 * Universal safe UUID generator that works reliably across browser (secure & non-secure HTTP contexts) and Node.js.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC4122 v4 compliant fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Extracts normalized group name from a match entity (e.g., "Group A" from `group_name` or `round: "Group A - Match 1"`).
 * Performance: O(1) string operations.
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

// ─── 1. Group Assignment & Splitting Helpers ─────────────────────────────────

/**
 * Split players into groups where each group has a target size (e.g. 3 or 4 players).
 * Sanitizes input bounds and ensures optimal distribution.
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
 * Optimization: Uses pre-allocated arrays and single O(N) round-robin distribution.
 */
export function buildDefaultGroupAssignments(
  playerIds: string[],
  groupCount: number = 4
): Record<string, string[]> {
  const sanitizedCount = Math.max(1, Math.floor(groupCount || 1));
  const groups: Record<string, string[]> = {};

  // Build group keys up to sanitizedCount (fallback to numbers if exceeding letter alphabet)
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

  // Round-robin distribution balances player counts across all groups
  const totalGroups = groupNames.length;
  for (let i = 0; i < playerIds.length; i++) {
    const targetGroupName = groupNames[i % totalGroups];
    groups[targetGroupName].push(playerIds[i]);
  }

  return groups;
}

/**
 * Shuffle an array of player IDs using the Fisher-Yates algorithm.
 * Time Complexity: O(N), Space Complexity: O(N) (pure function).
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

// ─── 2. Group Stage Fixture Generation ─────────────────────────────────────────

/**
 * Generate single round-robin group fixtures for a specific group of players.
 * Generates balanced pairings and clean round labels.
 */
export function generateSingleGroupFixtures(
  tournamentId: string,
  groupName: string,
  playerIds: string[]
): Omit<Match, 'id' | 'created_at' | 'updated_at'>[] {
  const n = playerIds.length;
  if (n < 2) return [];

  const fixtures: Omit<Match, 'id' | 'created_at' | 'updated_at'>[] = [];
  const cleanCodePrefix = groupName.replace(/Group\s*/i, 'G');
  let matchIndex = 1;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      fixtures.push({
        tournament_id: tournamentId,
        stage: 'group',
        group_name: groupName,
        round: `${groupName} - Match ${matchIndex}`,
        match_code: `${cleanCodePrefix}-M${matchIndex}`,
        player1_id: playerIds[i],
        player2_id: playerIds[j],
        status: 'upcoming',
      });
      matchIndex++;
    }
  }

  return fixtures;
}

/**
 * Generate full group-stage schedule across all groups (e.g. Groups A–H).
 * Time Complexity: O(G * N^2) where G is groups and N is average group size.
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
      const groupMatches = generateSingleGroupFixtures(tournamentId, groupName, pIds);
      for (let m = 0; m < groupMatches.length; m++) {
        allFixtures.push(groupMatches[m]);
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
  winner?: Player; // 1st Place (e.g. A1)
  runnerUp?: Player; // 2nd Place (e.g. A2)
}

/**
 * Computes live group stage summaries, standings, and progression states.
 * 
 * Performance Optimizations:
 * 1. O(P) lookup map for players avoiding repeated O(P) array scans.
 * 2. O(M) single-pass bucket aggregation for group matches.
 * 3. Prevents phantom default groups when no groups are defined.
 */
export function computeAllGroupSummaries(
  tournament: Tournament,
  allPlayers: Player[],
  matches: Match[],
  groupAssignments?: Record<string, string[]>
): GroupSummary[] {
  // Pre-index players for O(1) ID lookups
  const playerMap = new Map<string, Player>();
  for (let i = 0; i < allPlayers.length; i++) {
    playerMap.set(allPlayers[i].id, allPlayers[i]);
  }

  // Pre-filter and bucket group matches in a single O(M) pass
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

  // Natural alphabetical sort for groups (Group A, Group B, Group C...)
  const sortedGroupNames = Array.from(discoveredGroups).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const summaries: GroupSummary[] = [];

  for (let g = 0; g < sortedGroupNames.length; g++) {
    const gName = sortedGroupNames[g];
    const gMatches = matchesByGroup.get(gName) || [];

    // Collect all players participating in this group (from assignments and matches)
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

    // Compute standings for this group
    const standings = computeStandings(tournament.id, gPlayers, gMatches, tournament);

    // Single-pass match completion status
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

/**
 * Check if ALL defined groups have completed all their fixtures.
 */
export function checkAllGroupsComplete(summaries: GroupSummary[]): boolean {
  if (!summaries || summaries.length === 0) return false;
  for (let i = 0; i < summaries.length; i++) {
    if (!summaries[i].isComplete || summaries[i].totalMatches === 0) {
      return false;
    }
  }
  return true;
}

// ─── 4. World Cup Knockout Stage Generator ─────────────────────────────────────

export interface KnockoutBlueprintNode {
  match_code: string;
  round: string;
  p1_source: { type: 'group_winner' | 'group_runner_up' | 'match_winner'; code: string; label: string };
  p2_source: { type: 'group_winner' | 'group_runner_up' | 'match_winner'; code: string; label: string };
  next_match_code?: string;
  next_slot?: 'player1' | 'player2';
}

/**
 * World Cup Knockout Bracket Template Generator.
 * Handles 1, 2, 3, 4, 6, 8+ groups with valid crossover trees and prevents dropouts.
 */
export function getKnockoutTemplate(groupCount: number = 8): KnockoutBlueprintNode[] {
  const sanitizedCount = Math.max(1, Math.floor(groupCount || 8));

  if (sanitizedCount >= 8) {
    // 8 Groups -> 16 Qualifiers (Round of 16 -> Quarter-Finals -> Semi-Finals -> Final)
    return [
      // Round of 16
      { match_code: 'R16-1', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'B', label: '2nd Group B' }, next_match_code: 'QF1', next_slot: 'player1' },
      { match_code: 'R16-2', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'C', label: '1st Group C' }, p2_source: { type: 'group_runner_up', code: 'D', label: '2nd Group D' }, next_match_code: 'QF1', next_slot: 'player2' },
      { match_code: 'R16-3', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'E', label: '1st Group E' }, p2_source: { type: 'group_runner_up', code: 'F', label: '2nd Group F' }, next_match_code: 'QF2', next_slot: 'player1' },
      { match_code: 'R16-4', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'G', label: '1st Group G' }, p2_source: { type: 'group_runner_up', code: 'H', label: '2nd Group H' }, next_match_code: 'QF2', next_slot: 'player2' },
      { match_code: 'R16-5', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'B', label: '1st Group B' }, p2_source: { type: 'group_runner_up', code: 'A', label: '2nd Group A' }, next_match_code: 'QF3', next_slot: 'player1' },
      { match_code: 'R16-6', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'D', label: '1st Group D' }, p2_source: { type: 'group_runner_up', code: 'C', label: '2nd Group C' }, next_match_code: 'QF3', next_slot: 'player2' },
      { match_code: 'R16-7', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'F', label: '1st Group F' }, p2_source: { type: 'group_runner_up', code: 'E', label: '2nd Group E' }, next_match_code: 'QF4', next_slot: 'player1' },
      { match_code: 'R16-8', round: 'Round of 16', p1_source: { type: 'group_winner', code: 'H', label: '1st Group H' }, p2_source: { type: 'group_runner_up', code: 'G', label: '2nd Group G' }, next_match_code: 'QF4', next_slot: 'player2' },

      // Quarter-Finals
      { match_code: 'QF1', round: 'Quarter-Final', p1_source: { type: 'match_winner', code: 'R16-1', label: 'Winner R16-1' }, p2_source: { type: 'match_winner', code: 'R16-2', label: 'Winner R16-2' }, next_match_code: 'SF1', next_slot: 'player1' },
      { match_code: 'QF2', round: 'Quarter-Final', p1_source: { type: 'match_winner', code: 'R16-3', label: 'Winner R16-3' }, p2_source: { type: 'match_winner', code: 'R16-4', label: 'Winner R16-4' }, next_match_code: 'SF1', next_slot: 'player2' },
      { match_code: 'QF3', round: 'Quarter-Final', p1_source: { type: 'match_winner', code: 'R16-5', label: 'Winner R16-5' }, p2_source: { type: 'match_winner', code: 'R16-6', label: 'Winner R16-6' }, next_match_code: 'SF2', next_slot: 'player1' },
      { match_code: 'QF4', round: 'Quarter-Final', p1_source: { type: 'match_winner', code: 'R16-7', label: 'Winner R16-7' }, p2_source: { type: 'match_winner', code: 'R16-8', label: 'Winner R16-8' }, next_match_code: 'SF2', next_slot: 'player2' },

      // Semi-Finals
      { match_code: 'SF1', round: 'Semi-Final', p1_source: { type: 'match_winner', code: 'QF1', label: 'Winner QF1' }, p2_source: { type: 'match_winner', code: 'QF2', label: 'Winner QF2' }, next_match_code: 'FINAL', next_slot: 'player1' },
      { match_code: 'SF2', round: 'Semi-Final', p1_source: { type: 'match_winner', code: 'QF3', label: 'Winner QF3' }, p2_source: { type: 'match_winner', code: 'QF4', label: 'Winner QF4' }, next_match_code: 'FINAL', next_slot: 'player2' },

      // Final
      { match_code: 'FINAL', round: 'Final', p1_source: { type: 'match_winner', code: 'SF1', label: 'Winner SF1' }, p2_source: { type: 'match_winner', code: 'SF2', label: 'Winner SF2' } },
    ];
  }

  if (sanitizedCount >= 4) {
    // 4 Groups -> 8 Qualifiers (Quarter-Finals -> Semi-Finals -> Final)
    return [
      { match_code: 'QF1', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'B', label: '2nd Group B' }, next_match_code: 'SF1', next_slot: 'player1' },
      { match_code: 'QF2', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'C', label: '1st Group C' }, p2_source: { type: 'group_runner_up', code: 'D', label: '2nd Group D' }, next_match_code: 'SF1', next_slot: 'player2' },
      { match_code: 'QF3', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'B', label: '1st Group B' }, p2_source: { type: 'group_runner_up', code: 'A', label: '2nd Group A' }, next_match_code: 'SF2', next_slot: 'player1' },
      { match_code: 'QF4', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'D', label: '1st Group D' }, p2_source: { type: 'group_runner_up', code: 'C', label: '2nd Group C' }, next_match_code: 'SF2', next_slot: 'player2' },

      { match_code: 'SF1', round: 'Semi-Final', p1_source: { type: 'match_winner', code: 'QF1', label: 'Winner QF1' }, p2_source: { type: 'match_winner', code: 'QF2', label: 'Winner QF2' }, next_match_code: 'FINAL', next_slot: 'player1' },
      { match_code: 'SF2', round: 'Semi-Final', p1_source: { type: 'match_winner', code: 'QF3', label: 'Winner QF3' }, p2_source: { type: 'match_winner', code: 'QF4', label: 'Winner QF4' }, next_match_code: 'FINAL', next_slot: 'player2' },

      { match_code: 'FINAL', round: 'Final', p1_source: { type: 'match_winner', code: 'SF1', label: 'Winner SF1' }, p2_source: { type: 'match_winner', code: 'SF2', label: 'Winner SF2' } },
    ];
  }

  if (sanitizedCount === 3) {
    // 3 Groups -> 4 Qualifiers (SF1: 1st A vs 2nd B, SF2: 1st B vs 1st C -> Final)
    return [
      { match_code: 'SF1', round: 'Semi-Final', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'B', label: '2nd Group B' }, next_match_code: 'FINAL', next_slot: 'player1' },
      { match_code: 'SF2', round: 'Semi-Final', p1_source: { type: 'group_winner', code: 'B', label: '1st Group B' }, p2_source: { type: 'group_winner', code: 'C', label: '1st Group C' }, next_match_code: 'FINAL', next_slot: 'player2' },

      { match_code: 'FINAL', round: 'Final', p1_source: { type: 'match_winner', code: 'SF1', label: 'Winner SF1' }, p2_source: { type: 'match_winner', code: 'SF2', label: 'Winner SF2' } },
    ];
  }

  if (sanitizedCount === 2) {
    // 2 Groups -> 4 Qualifiers (Semi-Finals -> Final)
    return [
      { match_code: 'SF1', round: 'Semi-Final', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'B', label: '2nd Group B' }, next_match_code: 'FINAL', next_slot: 'player1' },
      { match_code: 'SF2', round: 'Semi-Final', p1_source: { type: 'group_winner', code: 'B', label: '1st Group B' }, p2_source: { type: 'group_runner_up', code: 'A', label: '2nd Group A' }, next_match_code: 'FINAL', next_slot: 'player2' },

      { match_code: 'FINAL', round: 'Final', p1_source: { type: 'match_winner', code: 'SF1', label: 'Winner SF1' }, p2_source: { type: 'match_winner', code: 'SF2', label: 'Winner SF2' } },
    ];
  }

  // 1 Group -> Direct Final between 1st and 2nd place
  return [
    { match_code: 'FINAL', round: 'Final', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'A', label: '2nd Group A' } },
  ];
}

/**
 * Generate the entire World Cup Knockout Stage matches with linked bracket IDs.
 * Optimization: Uses O(1) identifier mapping and safe UUID generation.
 */
export function generateKnockoutBracketMatches(
  tournamentId: string,
  groupSummaries: GroupSummary[]
): Match[] {
  const groupCount = groupSummaries.length;
  const template = getKnockoutTemplate(groupCount);

  // Map group winners and runners up: "A1" -> Player, "B2" -> Player
  const qualifierMap = new Map<string, Player>();
  for (let i = 0; i < groupSummaries.length; i++) {
    const gs = groupSummaries[i];
    const letter = gs.groupName.replace(/Group\s*/i, '').trim().toUpperCase();
    if (gs.winner) qualifierMap.set(`${letter}1`, gs.winner);
    if (gs.runnerUp) qualifierMap.set(`${letter}2`, gs.runnerUp);
  }

  const now = new Date().toISOString();

  // Create match entities with generated UUIDs in O(N)
  const matchIdMap = new Map<string, string>();
  for (let i = 0; i < template.length; i++) {
    matchIdMap.set(template[i].match_code, generateUUID());
  }

  const resultMatches: Match[] = [];

  for (let i = 0; i < template.length; i++) {
    const node = template[i];
    const id = matchIdMap.get(node.match_code)!;
    const nextMatchId = node.next_match_code ? matchIdMap.get(node.next_match_code) : undefined;

    // Resolve initial qualified players for the opening knockout round
    let p1Id: string | undefined;
    let p2Id: string | undefined;

    if (node.p1_source.type === 'group_winner') {
      p1Id = qualifierMap.get(`${node.p1_source.code}1`)?.id;
    }
    if (node.p2_source.type === 'group_runner_up') {
      p2Id = qualifierMap.get(`${node.p2_source.code}2`)?.id;
    }

    resultMatches.push({
      id,
      tournament_id: tournamentId,
      stage: 'knockout',
      round: node.round,
      match_code: node.match_code,
      player1_id: p1Id,
      player2_id: p2Id,
      player1_placeholder: node.p1_source.label,
      player2_placeholder: node.p2_source.label,
      next_match_id: nextMatchId,
      next_match_slot: node.next_slot,
      status: 'upcoming',
      created_at: now,
      updated_at: now,
    });
  }

  return resultMatches;
}

// ─── 5. Knockout Match Winner Progression & Cascade Updates ────────────────────

/**
 * Advances a match winner to the subsequent knockout match slot.
 * 
 * Correctness & Idempotency:
 * - If winnerId is falsy / undefined (e.g. match was reset), safely clears the downstream slot.
 * - If target slot already matches winnerId, returns original array to prevent spurious React re-renders.
 */
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
        return m; // Idempotent: No change needed
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
  groupProgress: number; // 0-100%
  r16Progress: number;
  qfProgress: number;
  sfProgress: number;
  finalProgress: number;
  overallProgress: number;
  isComplete: boolean;
  champion?: Player;
  runnerUp?: Player;
}

/**
 * Fast single-pass calculation of tournament completion metrics and final podium standings.
 * 
 * Performance & Robustness:
 * - Computes all stages in a single O(M) loop instead of multiple `.filter()` passes.
 * - Handles diverse round naming conventions ('Round of 16', 'Quarter-Final', 'QF1', 'Semi-Final', 'Final', etc.).
 * - Correctly resolves champion/runnerUp even in penalty shootouts or score-based outcomes.
 */
export function computeTournamentProgress(
  matches: Match[],
  players: Player[]
): TournamentProgress {
  if (!matches || matches.length === 0) {
    return {
      groupProgress: 0,
      r16Progress: 0,
      qfProgress: 0,
      sfProgress: 0,
      finalProgress: 0,
      overallProgress: 0,
      isComplete: false,
    };
  }

  // Pre-index players for O(1) champion / runner-up resolution
  const playerMap = new Map<string, Player>();
  for (let i = 0; i < players.length; i++) {
    playerMap.set(players[i].id, players[i]);
  }

  let totalGroup = 0, completedGroup = 0;
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

    if (stage === 'group' || round.startsWith('group')) {
      totalGroup++;
      if (isCompleted) completedGroup++;
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

  const groupProgress = calcPct(completedGroup, totalGroup);
  const r16Progress = calcPct(completedR16, totalR16);
  const qfProgress = calcPct(completedQF, totalQF);
  const sfProgress = calcPct(completedSF, totalSF);
  const finalProgress = calcPct(completedFinal, totalFinal);
  const overallProgress = calcPct(completedMatches, totalMatches);

  let champion: Player | undefined;
  let runnerUp: Player | undefined;

  if (finalMatch && finalMatch.status === 'completed') {
    let winnerId = finalMatch.winner_id;

    // Fallback: Infer winner from match or penalty scores if winner_id is not explicitly set
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
    groupProgress,
    r16Progress,
    qfProgress,
    sfProgress,
    finalProgress,
    overallProgress,
    isComplete: finalProgress === 100,
    champion,
    runnerUp,
  };
}
