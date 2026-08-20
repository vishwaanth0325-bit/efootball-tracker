import type { Player, Match, Tournament, StandingRow } from './types';
import { computeStandings } from './calculations';

export const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

// ─── Utilities ────────────────────────────────────────────────────────────────

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function extractGroupName(match: Match): string | null {
  if (match.group_name && match.group_name.trim().length > 0) {
    return match.group_name.trim();
  }
  if (match.round && /^group\s+[a-z0-9]+/i.test(match.round)) {
    const m = match.round.match(/^Group\s+([A-Z0-9]+)/i);
    if (m) return `Group ${m[1].toUpperCase()}`;
  }
  return null;
}

export function getRoundNameForSize(size: number): string {
  switch (size) {
    case 2:  return 'Final';
    case 4:  return 'Semi-Final';
    case 8:  return 'Quarter-Final';
    case 16: return 'Round of 16';
    case 32: return 'Round of 32';
    case 64: return 'Round of 64';
    default: return `Round of ${size}`;
  }
}

function getRoundCodePrefix(size: number): string {
  switch (size) {
    case 2:  return 'FINAL';
    case 4:  return 'SF';
    case 8:  return 'QF';
    case 16: return 'R16';
    case 32: return 'R32';
    default: return `R${size}`;
  }
}

// ─── 1. Single Elimination (Knockout) ─────────────────────────────────────────
//
// Algorithm (from reference image):
//   P  = 2^⌈log₂N⌉  — next power of 2 ≥ N
//   B  = P − N       — number of byes (assigned to top seeds 1..B)
//   M₁ = N − P/2     — round-1 matches (lowest 2E seeds play; winner advances to round of P/2)
//   Total matches = N − 1
//   Seeding: seed i is paired with seed (P+1−i) to keep top seeds apart
//   Byes go to seeds 1 through B automatically.

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function getBracketSeeds(size: number): number[] {
  if (size <= 2) return [1, 2];
  const prev = getBracketSeeds(size / 2);
  const result: number[] = [];
  for (const s of prev) {
    result.push(s);
    result.push(size + 1 - s);
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
 * Generates a complete Single-Elimination bracket for N teams.
 *
 * Math (from image):
 *   P = 2^⌈log₂N⌉   (next power of 2 ≥ N)
 *   B = P − N        (byes; top B seeds advance directly)
 *   Round 1 has (N − B) / 2 = N − P/2 matches among seeds (B+1)..N
 *   Seeds are paired: seed i vs seed (P+1−i) to separate top seeds
 */
export function generateKnockoutBracketFromStandings(
  tournamentId: string,
  qualifiedPlayers: Player[]
): Match[] {
  const N = qualifiedPlayers.length;
  if (N < 2) return [];

  const P = nextPow2(N);  // Next power of 2 ≥ N
  const now = new Date().toISOString();
  const playerBySeed = new Map<number, Player>();
  for (let i = 0; i < N; i++) {
    playerBySeed.set(i + 1, qualifiedPlayers[i]);
  }

  // 1. Build all downstream round nodes (from P/2 down to 2)
  const matchesByRound = new Map<number, KnockoutStructureNode[]>();
  let curSize = P / 2;
  while (curSize >= 2) {
    const numMatches = curSize / 2;
    const nodes: KnockoutStructureNode[] = [];
    const prefix = getRoundCodePrefix(curSize);
    const rName = getRoundNameForSize(curSize);
    for (let i = 0; i < numMatches; i++) {
      const code = curSize === 2 ? 'FINAL' : `${prefix}${i + 1}`;
      nodes.push({
        id: generateUUID(),
        match_code: code,
        round: rName,
        round_size: curSize,
        p1_source_label: '',
        p2_source_label: '',
      });
    }
    matchesByRound.set(curSize, nodes);
    curSize = curSize / 2;
  }

  // 2. Wire downstream progression links (e.g. QF -> SF -> Final)
  curSize = P / 2;
  while (curSize > 2) {
    const cur = matchesByRound.get(curSize)!;
    const next = matchesByRound.get(curSize / 2)!;
    for (let i = 0; i < cur.length; i++) {
      cur[i].next_match_id = next[Math.floor(i / 2)].id;
      cur[i].next_match_slot = i % 2 === 0 ? 'player1' : 'player2';
    }
    curSize = curSize / 2;
  }

  // 3. Handle First Round (size P)
  const seedOrder = getBracketSeeds(P);
  const firstRoundNodes: KnockoutStructureNode[] = [];
  const pPrefix = getRoundCodePrefix(P);
  const pRoundName = getRoundNameForSize(P);
  let matchIndex = 1;

  for (let mIdx = 0; mIdx < P / 2; mIdx++) {
    const s1 = seedOrder[mIdx * 2];
    const s2 = seedOrder[mIdx * 2 + 1];
    const p1 = playerBySeed.get(s1);
    const p2 = playerBySeed.get(s2);

    const downstreamMatch = matchesByRound.get(P / 2)?.[Math.floor(mIdx / 2)];
    const downstreamSlot: 'player1' | 'player2' = mIdx % 2 === 0 ? 'player1' : 'player2';

    if (p1 && p2) {
      // Both players exist -> Real match in Round of size P
      const code = `${pPrefix}${matchIndex++}`;
      const node: KnockoutStructureNode = {
        id: generateUUID(),
        match_code: code,
        round: pRoundName,
        round_size: P,
        seed1: s1,
        seed2: s2,
        p1_player_id: p1.id,
        p2_player_id: p2.id,
        p1_source_label: `Seed ${s1}: ${p1.name}`,
        p2_source_label: `Seed ${s2}: ${p2.name}`,
        next_match_id: downstreamMatch?.id,
        next_match_slot: downstreamSlot,
      };
      firstRoundNodes.push(node);

      if (downstreamMatch) {
        if (downstreamSlot === 'player1') {
          downstreamMatch.p1_source_label = `Winner ${code} (${p1.name} / ${p2.name})`;
        } else {
          downstreamMatch.p2_source_label = `Winner ${code} (${p1.name} / ${p2.name})`;
        }
      }
    } else if (p1 && !p2) {
      // Player 1 gets a BYE -> Advances directly to downstream match
      if (downstreamMatch) {
        if (downstreamSlot === 'player1') {
          downstreamMatch.p1_player_id = p1.id;
          downstreamMatch.p1_source_label = `Seed ${s1}: ${p1.name} (Bye)`;
        } else {
          downstreamMatch.p2_player_id = p1.id;
          downstreamMatch.p2_source_label = `Seed ${s1}: ${p1.name} (Bye)`;
        }
      }
    } else if (!p1 && p2) {
      // Player 2 gets a BYE -> Advances directly to downstream match
      if (downstreamMatch) {
        if (downstreamSlot === 'player1') {
          downstreamMatch.p1_player_id = p2.id;
          downstreamMatch.p1_source_label = `Seed ${s2}: ${p2.name} (Bye)`;
        } else {
          downstreamMatch.p2_player_id = p2.id;
          downstreamMatch.p2_source_label = `Seed ${s2}: ${p2.name} (Bye)`;
        }
      }
    }
  }

  // 4. Collect all generated matches
  const allNodes: KnockoutStructureNode[] = [...firstRoundNodes];
  matchesByRound.forEach(nodes => allNodes.push(...nodes));

  return allNodes.map(n => ({
    id: n.id,
    tournament_id: tournamentId,
    stage: 'knockout' as const,
    round: n.round,
    match_code: n.match_code,
    player1_id: n.p1_player_id,
    player2_id: n.p2_player_id,
    player1_placeholder: n.p1_source_label || (n.p1_player_id ? undefined : 'TBD'),
    player2_placeholder: n.p2_source_label || (n.p2_player_id ? undefined : 'TBD'),
    next_match_id: n.next_match_id,
    next_match_slot: n.next_match_slot,
    status: 'upcoming' as const,
    created_at: now,
    updated_at: now,
  }));
}

// ─── 2. Round Robin (League) ──────────────────────────────────────────────────
//
// Algorithm (from reference image — Circle / Berger Table method):
//   If N is odd: add a ghost "Bye" team → N' = N+1
//   If N is even: N' = N
//   Total rounds R = N' − 1
//   Matches per round M_r = N'/2
//   Total matches = N(N−1)/2
//
//   Fix Team 1 at position 0. Rotate remaining N'−1 teams clockwise each round.
//   For each round, pair opposing slots: (slot 0 vs slot N'−1), (slot 1 vs slot N'−2)...
//   Teams paired with ghost have a rest week (match excluded).

// (Round-robin fixture generation lives in fixtures.ts — buildRoundRobinRounds)

// ─── 3. Hybrid (Groups + Knockout) ───────────────────────────────────────────
//
// Algorithm (from reference image):
//   G = ⌊N/4⌋   — target 4 per group
//   K = largest power of 2 ≤ N — knockout target
//   q = K/G     — qualifiers per group
//   Bracket crossing: 1A vs 2B, 1B vs 2A (avoid early rematches)

/**
 * Given N players, compute the hybrid (group+knockout) configuration.
 * Returns: groupCount G, knockoutTarget K, qualifiersPerGroup q (possibly decimal → ceil needed).
 */
export function computeHybridConfig(N: number): { G: number; K: number; q: number } {
  const G = Math.max(1, Math.floor(N / 4));
  // Largest power of 2 ≤ N
  let K = 1;
  while (K * 2 <= N) K *= 2;
  const q = K / G;
  return { G, K, q };
}

/**
 * Distribute N player IDs evenly across G groups (A, B, C, ...).
 * Uses G = ⌊N/4⌋ as specified in the hybrid algorithm.
 */
export function buildGroupAssignments(
  playerIds: string[],
  groupCount: number
): Record<string, string[]> {
  const G = Math.max(1, groupCount);
  const groups: Record<string, string[]> = {};
  const names: string[] = [];
  for (let i = 0; i < G; i++) {
    const letter = i < GROUP_LETTERS.length ? GROUP_LETTERS[i] : `${i + 1}`;
    const name = `Group ${letter}`;
    groups[name] = [];
    names.push(name);
  }
  for (let i = 0; i < playerIds.length; i++) {
    groups[names[i % G]].push(playerIds[i]);
  }
  return groups;
}

/**
 * Generate all group-stage round-robin fixtures from a group assignment map.
 * Uses single round-robin within each group.
 */
export function generateAllGroupFixtures(
  tournamentId: string,
  groupAssignments: Record<string, string[]>
): Omit<Match, 'id' | 'created_at' | 'updated_at'>[] {
  const fixtures: Omit<Match, 'id' | 'created_at' | 'updated_at'>[] = [];
  for (const [groupName, pIds] of Object.entries(groupAssignments)) {
    if (!pIds || pIds.length < 2) continue;
    const codePrefix = groupName.replace(/Group\s*/i, 'G');
    let idx = 1;
    for (let i = 0; i < pIds.length; i++) {
      for (let j = i + 1; j < pIds.length; j++) {
        fixtures.push({
          tournament_id: tournamentId,
          stage: 'group',
          group_name: groupName,
          round: `${groupName} - Match ${idx}`,
          match_code: `${codePrefix}-M${idx}`,
          player1_id: pIds[i],
          player2_id: pIds[j],
          status: 'upcoming',
        });
        idx++;
      }
    }
  }
  return fixtures;
}

// ─── Legacy compat alias (used in TournamentDetails for group-knockout format) ──
/** @deprecated Use buildGroupAssignments instead. Kept for internal compatibility. */
export function splitPlayersIntoGroupsBySize(
  playerIds: string[],
  playersPerGroup: number = 4
): Record<string, string[]> {
  const count = playerIds.length;
  if (count === 0) return {};
  const G = Math.max(1, Math.ceil(count / Math.max(2, playersPerGroup)));
  return buildGroupAssignments(playerIds, G);
}

/** @deprecated Use buildGroupAssignments instead. */
export function buildDefaultGroupAssignments(
  playerIds: string[],
  groupCount: number = 4
): Record<string, string[]> {
  return buildGroupAssignments(playerIds, groupCount);
}

/** Fisher-Yates shuffle — returns a new randomised copy of the array. */
export function shufflePlayerIds(playerIds: string[]): string[] {
  const arr = [...playerIds];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Group Summaries ──────────────────────────────────────────────────────────

export interface GroupSummary {
  groupName: string;
  players: Player[];
  matches: Match[];
  standings: StandingRow[];
  totalMatches: number;
  completedMatches: number;
  isComplete: boolean;
  winner?: Player;
  runnerUp?: Player;
}

export function computeAllGroupSummaries(
  tournament: Tournament,
  allPlayers: Player[],
  matches: Match[],
  groupAssignments?: Record<string, string[]>
): GroupSummary[] {
  const playerMap = new Map<string, Player>();
  for (const p of allPlayers) playerMap.set(p.id, p);

  const matchesByGroup = new Map<string, Match[]>();
  const discovered = new Set<string>();

  if (groupAssignments) {
    for (const key of Object.keys(groupAssignments)) {
      discovered.add(key);
      matchesByGroup.set(key, []);
    }
  }

  for (const m of matches) {
    const isGroup = m.stage === 'group' || (m.round && /^group/i.test(m.round));
    if (!isGroup) continue;
    const gName = extractGroupName(m);
    if (!gName) continue;
    discovered.add(gName);
    if (!matchesByGroup.has(gName)) matchesByGroup.set(gName, []);
    matchesByGroup.get(gName)!.push(m);
  }

  if (discovered.size === 0) return [];

  const sorted = Array.from(discovered).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  return sorted.map(gName => {
    const gMatches = matchesByGroup.get(gName) || [];
    const pidSet = new Set<string>();

    if (groupAssignments?.[gName]) {
      for (const id of groupAssignments[gName]) pidSet.add(id);
    }
    for (const m of gMatches) {
      if (m.player1_id) pidSet.add(m.player1_id);
      if (m.player2_id) pidSet.add(m.player2_id);
    }

    const gPlayers: Player[] = [];
    pidSet.forEach(id => { const p = playerMap.get(id); if (p) gPlayers.push(p); });

    const standings = computeStandings(tournament.id, gPlayers, gMatches, tournament);
    const completedCount = gMatches.filter(m => m.status === 'completed').length;
    const total = gMatches.length;

    return {
      groupName: gName,
      players: gPlayers,
      matches: gMatches,
      standings,
      totalMatches: total,
      completedMatches: completedCount,
      isComplete: total > 0 && completedCount === total,
      winner: standings[0]?.player,
      runnerUp: standings[1]?.player,
    };
  });
}

export function checkAllGroupsComplete(summaries: GroupSummary[]): boolean {
  if (!summaries || summaries.length === 0) return false;
  return summaries.every(s => s.isComplete && s.totalMatches > 0);
}

// ─── Knockout Stage from Group Results ────────────────────────────────────────
//
// Bracket crossing (from image): 1A vs 2B, 1B vs 2A to avoid early rematches.
// For more than 2 groups, standard cross-bracket seeding is applied.

export function generateKnockoutBracketMatches(
  tournamentId: string,
  groupSummaries: GroupSummary[]
): Match[] {
  const G = groupSummaries.length;
  if (G === 0) return [];

  const winners = groupSummaries.map(gs => gs.winner).filter(Boolean) as Player[];
  const runners = groupSummaries.map(gs => gs.runnerUp).filter(Boolean) as Player[];

  let qualifiers: Player[] = [];

  if (G === 2) {
    // 2 groups (A & B) -> A1, B1, A2, B2 -> SF1: A1 vs B2, SF2: B1 vs A2
    qualifiers = [winners[0], winners[1], runners[0], runners[1]].filter(Boolean);
  } else if (G === 4) {
    // 4 groups (A, B, C, D) -> A1, B1, C1, D1, C2, D2, A2, B2
    qualifiers = [
      winners[0], winners[1], winners[2], winners[3],
      runners[2], runners[3], runners[0], runners[1],
    ].filter(Boolean);
  } else {
    // General G: Interleave winners and reverse runners
    qualifiers = [...winners, ...runners.reverse()].filter(Boolean);
  }

  return generateKnockoutBracketFromStandings(tournamentId, qualifiers);
}

// ─── Knockout Winner Progression ─────────────────────────────────────────────

export function advanceKnockoutWinner(
  allMatches: Match[],
  matchId: string,
  winnerId?: string | null
): Match[] {
  const current = allMatches.find(m => m.id === matchId);
  if (!current?.next_match_id || !current?.next_match_slot) return allMatches;

  const targetWinnerId = winnerId ?? undefined;
  let changed = false;

  const updated = allMatches.map(m => {
    if (m.id !== current.next_match_id) return m;
    const slot = current.next_match_slot!;
    const existing = slot === 'player1' ? m.player1_id : m.player2_id;
    if (existing === targetWinnerId) return m;
    changed = true;
    const next: Match = { ...m, updated_at: new Date().toISOString() };
    if (slot === 'player1') next.player1_id = targetWinnerId;
    else next.player2_id = targetWinnerId;
    return next;
  });

  return changed ? updated : allMatches;
}

// ─── Tournament Progress ──────────────────────────────────────────────────────

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
  const empty: TournamentProgress = {
    leagueProgress: 0, groupProgress: 0, prelimProgress: 0,
    r16Progress: 0, qfProgress: 0, sfProgress: 0,
    finalProgress: 0, overallProgress: 0, isComplete: false,
  };

  if (!matches || matches.length === 0) return empty;

  const playerMap = new Map<string, Player>();
  for (const p of players) playerMap.set(p.id, p);

  const counts = {
    league: [0, 0], group: [0, 0], prelim: [0, 0],
    r16: [0, 0], qf: [0, 0], sf: [0, 0], final: [0, 0],
    total: [0, 0],
  };

  let finalMatch: Match | undefined;

  for (const m of matches) {
    const done = m.status === 'completed' ? 1 : 0;
    counts.total[0]++;
    counts.total[1] += done;

    const stage = m.stage?.toLowerCase() ?? '';
    const round = (m.round ?? '').toLowerCase();
    const code = (m.match_code ?? '').toUpperCase();

    if (stage === 'league' || (!stage && round.startsWith('round '))) {
      counts.league[0]++; counts.league[1] += done;
    } else if (stage === 'group' || round.startsWith('group')) {
      counts.group[0]++; counts.group[1] += done;
    } else if (round.includes('preliminary') || round.includes('play-in') || code.startsWith('PI')) {
      counts.prelim[0]++; counts.prelim[1] += done;
    } else if (round.includes('round of 16') || code.startsWith('R16')) {
      counts.r16[0]++; counts.r16[1] += done;
    } else if (round.includes('quarter') || code.startsWith('QF')) {
      counts.qf[0]++; counts.qf[1] += done;
    } else if (round.includes('semi') || code.startsWith('SF')) {
      counts.sf[0]++; counts.sf[1] += done;
    } else if (round.includes('final') || code === 'FINAL') {
      counts.final[0]++; counts.final[1] += done;
      finalMatch = m;
    }
  }

  const pct = (c: number, t: number) => t > 0 ? Math.round((c / t) * 100) : 0;

  let champion: Player | undefined;
  let runnerUp: Player | undefined;

  if (finalMatch?.status === 'completed') {
    let winnerId = finalMatch.winner_id;
    if (!winnerId && finalMatch.player1_id && finalMatch.player2_id) {
      const s1 = finalMatch.player1_score ?? 0;
      const s2 = finalMatch.player2_score ?? 0;
      if (s1 > s2) winnerId = finalMatch.player1_id;
      else if (s2 > s1) winnerId = finalMatch.player2_id;
      else if (finalMatch.penalty_player1_score !== undefined && finalMatch.penalty_player2_score !== undefined) {
        winnerId = finalMatch.penalty_player1_score > finalMatch.penalty_player2_score
          ? finalMatch.player1_id : finalMatch.player2_id;
      }
    }
    if (winnerId) {
      champion = playerMap.get(winnerId);
      const loserId = finalMatch.player1_id === winnerId ? finalMatch.player2_id : finalMatch.player1_id;
      if (loserId) runnerUp = playerMap.get(loserId);
    }
  }

  const finalProgress = pct(counts.final[1], counts.final[0]);
  const overallProgress = pct(counts.total[1], counts.total[0]);

  return {
    leagueProgress: pct(counts.league[1], counts.league[0]),
    groupProgress: pct(counts.group[1], counts.group[0]),
    prelimProgress: pct(counts.prelim[1], counts.prelim[0]),
    r16Progress: pct(counts.r16[1], counts.r16[0]),
    qfProgress: pct(counts.qf[1], counts.qf[0]),
    sfProgress: pct(counts.sf[1], counts.sf[0]),
    finalProgress,
    overallProgress,
    isComplete: finalProgress === 100 || (matches.length > 0 && overallProgress === 100),
    champion,
    runnerUp,
  };
}
