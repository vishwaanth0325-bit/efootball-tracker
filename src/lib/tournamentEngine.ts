import type { Player, Match, Tournament, StandingRow } from './types';
import { computeStandings } from './calculations';

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

// ─── 1. Group Assignment ───────────────────────────────────────────────────────

/**
 * Distribute player IDs evenly into Groups A–H (or 2/4/8 groups).
 */
export function buildDefaultGroupAssignments(
  playerIds: string[],
  groupCount: number = 8
): Record<string, string[]> {
  const actualCount = Math.max(1, Math.min(groupCount, GROUP_LETTERS.length));
  const groups: Record<string, string[]> = {};

  for (let i = 0; i < actualCount; i++) {
    groups[`Group ${GROUP_LETTERS[i]}`] = [];
  }

  playerIds.forEach((pid, idx) => {
    const groupName = `Group ${GROUP_LETTERS[idx % actualCount]}`;
    groups[groupName].push(pid);
  });

  return groups;
}

// ─── 2. Group Stage Fixture Generation ─────────────────────────────────────────

/**
 * Generate single round-robin group fixtures for a specific group of players.
 * For 4 players (A, B, C, D):
 * Match 1: A vs B, Match 2: C vs D
 * Match 3: A vs C, Match 4: B vs D
 * Match 5: A vs D, Match 6: B vs C
 */
export function generateSingleGroupFixtures(
  tournamentId: string,
  groupName: string,
  playerIds: string[]
): Omit<Match, 'id' | 'created_at' | 'updated_at'>[] {
  const fixtures: Omit<Match, 'id' | 'created_at' | 'updated_at'>[] = [];
  const n = playerIds.length;
  if (n < 2) return [];

  let matchIndex = 1;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      fixtures.push({
        tournament_id: tournamentId,
        stage: 'group',
        group_name: groupName,
        round: `${groupName} - Match ${matchIndex}`,
        match_code: `${groupName.replace('Group ', 'G')}-M${matchIndex}`,
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
 */
export function generateAllGroupFixtures(
  tournamentId: string,
  groupAssignments: Record<string, string[]>
): Omit<Match, 'id' | 'created_at' | 'updated_at'>[] {
  const allFixtures: Omit<Match, 'id' | 'created_at' | 'updated_at'>[] = [];

  Object.entries(groupAssignments).forEach(([groupName, pIds]) => {
    const groupMatches = generateSingleGroupFixtures(tournamentId, groupName, pIds);
    allFixtures.push(...groupMatches);
  });

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

export function computeAllGroupSummaries(
  tournament: Tournament,
  allPlayers: Player[],
  matches: Match[],
  groupAssignments?: Record<string, string[]>
): GroupSummary[] {
  const groupMatches = matches.filter(m => m.stage === 'group' || (m.round && m.round.toLowerCase().startsWith('group')));

  // Gather unique group names
  const groupNameSet = new Set<string>();
  if (groupAssignments) {
    Object.keys(groupAssignments).forEach(g => groupNameSet.add(g));
  }
  groupMatches.forEach(m => {
    if (m.group_name) groupNameSet.add(m.group_name);
    else if (m.round && m.round.startsWith('Group ')) {
      groupNameSet.add(m.round.split(' - ')[0]);
    }
  });

  // Default to Group A & B if empty
  if (groupNameSet.size === 0) {
    groupNameSet.add('Group A');
    groupNameSet.add('Group B');
  }

  const groupNames = Array.from(groupNameSet).sort();

  return groupNames.map(gName => {
    const gMatches = groupMatches.filter(m => m.group_name === gName || (m.round && m.round.startsWith(gName)));
    
    // Get players in this group
    let gPlayerIds = new Set<string>();
    if (groupAssignments && groupAssignments[gName]) {
      groupAssignments[gName].forEach(id => gPlayerIds.add(id));
    }
    gMatches.forEach(m => {
      if (m.player1_id) gPlayerIds.add(m.player1_id);
      if (m.player2_id) gPlayerIds.add(m.player2_id);
    });

    const gPlayers = allPlayers.filter(p => gPlayerIds.has(p.id));
    const standings = computeStandings(tournament.id, gPlayers, gMatches, tournament);

    const completed = gMatches.filter(m => m.status === 'completed').length;
    const isComplete = gMatches.length > 0 && completed === gMatches.length;

    return {
      groupName: gName,
      players: gPlayers,
      matches: gMatches,
      standings,
      totalMatches: gMatches.length,
      completedMatches: completed,
      isComplete,
      winner: standings[0]?.player,
      runnerUp: standings[1]?.player,
    };
  });
}

/**
 * Check if ALL groups have completed all their matches.
 */
export function checkAllGroupsComplete(summaries: GroupSummary[]): boolean {
  if (summaries.length === 0) return false;
  return summaries.every(s => s.isComplete && s.totalMatches > 0);
}

// ─── 4. World Cup Knockout Stage Generator ─────────────────────────────────────

export interface KnockoutBlueprintNode {
  match_code: string; // e.g. "R16-1", "QF1", "SF1", "FINAL"
  round: string; // e.g. "Round of 16", "Quarter-Final", "Semi-Final", "Final"
  p1_source: { type: 'group_winner' | 'group_runner_up' | 'match_winner'; code: string; label: string };
  p2_source: { type: 'group_winner' | 'group_runner_up' | 'match_winner'; code: string; label: string };
  next_match_code?: string;
  next_slot?: 'player1' | 'player2';
}

/**
 * World Cup Knockout Bracket Template
 */
export function getKnockoutTemplate(groupCount: number = 8): KnockoutBlueprintNode[] {
  if (groupCount >= 8) {
    // 8 Groups -> 16 Qualifiers (Round of 16, QF, SF, Final)
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
  } else if (groupCount >= 4) {
    // 4 Groups -> 8 Qualifiers (Quarter-Finals, Semi-Finals, Final)
    return [
      { match_code: 'QF1', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'B', label: '2nd Group B' }, next_match_code: 'SF1', next_slot: 'player1' },
      { match_code: 'QF2', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'C', label: '1st Group C' }, p2_source: { type: 'group_runner_up', code: 'D', label: '2nd Group D' }, next_match_code: 'SF1', next_slot: 'player2' },
      { match_code: 'QF3', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'B', label: '1st Group B' }, p2_source: { type: 'group_runner_up', code: 'A', label: '2nd Group A' }, next_match_code: 'SF2', next_slot: 'player1' },
      { match_code: 'QF4', round: 'Quarter-Final', p1_source: { type: 'group_winner', code: 'D', label: '1st Group D' }, p2_source: { type: 'group_runner_up', code: 'C', label: '2nd Group C' }, next_match_code: 'SF2', next_slot: 'player2' },

      { match_code: 'SF1', round: 'Semi-Final', p1_source: { type: 'match_winner', code: 'QF1', label: 'Winner QF1' }, p2_source: { type: 'match_winner', code: 'QF2', label: 'Winner QF2' }, next_match_code: 'FINAL', next_slot: 'player1' },
      { match_code: 'SF2', round: 'Semi-Final', p1_source: { type: 'match_winner', code: 'QF3', label: 'Winner QF3' }, p2_source: { type: 'match_winner', code: 'QF4', label: 'Winner QF4' }, next_match_code: 'FINAL', next_slot: 'player2' },

      { match_code: 'FINAL', round: 'Final', p1_source: { type: 'match_winner', code: 'SF1', label: 'Winner SF1' }, p2_source: { type: 'match_winner', code: 'SF2', label: 'Winner SF2' } },
    ];
  } else {
    // 2 Groups -> 4 Qualifiers (Semi-Finals, Final)
    return [
      { match_code: 'SF1', round: 'Semi-Final', p1_source: { type: 'group_winner', code: 'A', label: '1st Group A' }, p2_source: { type: 'group_runner_up', code: 'B', label: '2nd Group B' }, next_match_code: 'FINAL', next_slot: 'player1' },
      { match_code: 'SF2', round: 'Semi-Final', p1_source: { type: 'group_winner', code: 'B', label: '1st Group B' }, p2_source: { type: 'group_runner_up', code: 'A', label: '2nd Group A' }, next_match_code: 'FINAL', next_slot: 'player2' },

      { match_code: 'FINAL', round: 'Final', p1_source: { type: 'match_winner', code: 'SF1', label: 'Winner SF1' }, p2_source: { type: 'match_winner', code: 'SF2', label: 'Winner SF2' } },
    ];
  }
}

/**
 * Generate the entire World Cup Knockout Stage matches with linked bracket IDs.
 */
export function generateKnockoutBracketMatches(
  tournamentId: string,
  groupSummaries: GroupSummary[]
): Match[] {
  const groupCount = groupSummaries.length;
  const template = getKnockoutTemplate(groupCount);

  // Map group winners and runners up: "A1" -> playerId, "B2" -> playerId
  const qualifierMap = new Map<string, Player>();
  groupSummaries.forEach(gs => {
    const letter = gs.groupName.replace('Group ', '').trim();
    if (gs.winner) qualifierMap.set(`${letter}1`, gs.winner);
    if (gs.runnerUp) qualifierMap.set(`${letter}2`, gs.runnerUp);
  });

  const now = new Date().toISOString();

  // Create match entities with generated UUIDs
  const matchIdMap = new Map<string, string>();
  template.forEach(node => {
    matchIdMap.set(node.match_code, crypto.randomUUID());
  });

  return template.map(node => {
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

    return {
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
    };
  });
}

// ─── 5. Knockout Match Winner Progression & Cascade Updates ────────────────────

/**
 * When a knockout match score is saved:
 * 1. Determines the winner (regular score or penalties).
 * 2. Advances winner to downstream next_match_id (player1 or player2 slot).
 * 3. If the winner changed, updates or clears downstream match if already completed.
 */
export function advanceKnockoutWinner(
  allMatches: Match[],
  matchId: string,
  winnerId: string
): Match[] {
  const currentMatch = allMatches.find(m => m.id === matchId);
  if (!currentMatch || !currentMatch.next_match_id || !currentMatch.next_match_slot) {
    return allMatches;
  }

  const nextMatchId = currentMatch.next_match_id;
  const nextSlot = currentMatch.next_match_slot;

  return allMatches.map(m => {
    if (m.id === nextMatchId) {
      const updated = { ...m, updated_at: new Date().toISOString() };
      if (nextSlot === 'player1') {
        updated.player1_id = winnerId;
      } else {
        updated.player2_id = winnerId;
      }
      return updated;
    }
    return m;
  });
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

export function computeTournamentProgress(
  matches: Match[],
  players: Player[]
): TournamentProgress {
  const groupMatches = matches.filter(m => m.stage === 'group' || (m.round && m.round.startsWith('Group')));
  const r16Matches = matches.filter(m => m.round === 'Round of 16');
  const qfMatches = matches.filter(m => m.round === 'Quarter-Final');
  const sfMatches = matches.filter(m => m.round === 'Semi-Final');
  const finalMatch = matches.find(m => m.round === 'Final');

  const calcPct = (ms: Match[]) => {
    if (ms.length === 0) return 0;
    const completed = ms.filter(m => m.status === 'completed').length;
    return Math.round((completed / ms.length) * 100);
  };

  const groupProgress = calcPct(groupMatches);
  const r16Progress = calcPct(r16Matches);
  const qfProgress = calcPct(qfMatches);
  const sfProgress = calcPct(sfMatches);
  const finalProgress = finalMatch ? (finalMatch.status === 'completed' ? 100 : 0) : 0;

  const totalMatches = matches.length;
  const totalCompleted = matches.filter(m => m.status === 'completed').length;
  const overallProgress = totalMatches > 0 ? Math.round((totalCompleted / totalMatches) * 100) : 0;

  let champion: Player | undefined;
  let runnerUp: Player | undefined;

  if (finalMatch && finalMatch.status === 'completed' && finalMatch.winner_id) {
    champion = players.find(p => p.id === finalMatch.winner_id);
    const loserId = finalMatch.player1_id === finalMatch.winner_id ? finalMatch.player2_id : finalMatch.player1_id;
    runnerUp = players.find(p => p.id === loserId);
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
