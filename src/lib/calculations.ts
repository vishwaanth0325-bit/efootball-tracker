import type {
  Match,
  Player,
  PlayerStats,
  StandingRow,
  Tournament,
  HeadToHeadRecord,
  MatchResult,
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get the sort key for a match */
function matchSortKey(m: Match): string {
  return m.created_at || '';
}

/** Completed matches involving a specific player, optionally in a specific tournament */
export function getCompletedPlayerMatches(
  playerId: string,
  matches: Match[],
  tournamentId?: string
): Match[] {
  return matches
    .filter((m) => {
      const correctTournament = tournamentId ? m.tournament_id === tournamentId : true;
      const isPlayer = m.player1_id === playerId || m.player2_id === playerId;
      return correctTournament && isPlayer && m.status === 'completed';
    })
    .sort((a, b) => matchSortKey(a).localeCompare(matchSortKey(b)));
}

// ─── Streaks ──────────────────────────────────────────────────────────────────

interface Streaks {
  currentWinStreak: number;
  longestWinStreak: number;
  currentUnbeatenStreak: number;
  longestUnbeatenStreak: number;
  currentLosingStreak: number;
  longestLosingStreak: number;
}

function computeStreaks(results: MatchResult[]): Streaks {
  // Longest streaks — scan forward
  let ws = 0, longestWinStreak = 0;
  let us = 0, longestUnbeatenStreak = 0;
  let ls = 0, longestLosingStreak = 0;

  for (const r of results) {
    ws = r === 'W' ? ws + 1 : 0;
    us = r !== 'L' ? us + 1 : 0;
    ls = r === 'L' ? ls + 1 : 0;
    if (ws > longestWinStreak) longestWinStreak = ws;
    if (us > longestUnbeatenStreak) longestUnbeatenStreak = us;
    if (ls > longestLosingStreak) longestLosingStreak = ls;
  }

  // Current streaks — scan backward from latest
  let currentWinStreak = 0;
  let currentUnbeatenStreak = 0;
  let currentLosingStreak = 0;
  let winDone = false, unbeatenDone = false, loseDone = false;

  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i];
    if (!winDone) { if (r === 'W') currentWinStreak++; else winDone = true; }
    if (!unbeatenDone) { if (r !== 'L') currentUnbeatenStreak++; else unbeatenDone = true; }
    if (!loseDone) { if (r === 'L') currentLosingStreak++; else loseDone = true; }
    if (winDone && unbeatenDone && loseDone) break;
  }

  return {
    currentWinStreak, longestWinStreak,
    currentUnbeatenStreak, longestUnbeatenStreak,
    currentLosingStreak, longestLosingStreak,
  };
}

// ─── Player Stats ─────────────────────────────────────────────────────────────

export function computePlayerStats(
  playerId: string,
  matches: Match[],
  tournamentId?: string,
  tournament?: Tournament
): PlayerStats {
  const ptsWin = tournament?.points_win ?? 3;
  const ptsDraw = tournament?.points_draw ?? 1;
  const ptsLoss = tournament?.points_loss ?? 0;

  const playerMatches = getCompletedPlayerMatches(playerId, matches, tournamentId);

  let wins = 0, draws = 0, losses = 0;
  let goals_for = 0, goals_against = 0;
  const results: MatchResult[] = [];

  for (const m of playerMatches) {
    const isP1 = m.player1_id === playerId;
    const myScore = isP1 ? (m.player1_score ?? 0) : (m.player2_score ?? 0);
    const opScore = isP1 ? (m.player2_score ?? 0) : (m.player1_score ?? 0);

    goals_for += myScore;
    goals_against += opScore;

    const isTie = myScore === opScore;
    const isKnockout = m.stage === 'knockout' || (!m.group_name && !!m.round && !m.round.startsWith('Group') && (m.round.includes('Final') || m.round.includes('Round of')));

    // Respect winner_id for knockout tiebreakers or normal non-tie games (e.g. overturned results)
    if (m.winner_id && (!isTie || isKnockout)) {
      if (m.winner_id === playerId) { wins++; results.push('W'); }
      else { losses++; results.push('L'); }
    } else if (myScore > opScore) { wins++; results.push('W'); }
    else if (myScore === opScore) { draws++; results.push('D'); }
    else { losses++; results.push('L'); }
  }

  const played = playerMatches.length;
  const points = wins * ptsWin + draws * ptsDraw + losses * ptsLoss;
  const win_rate = played > 0 ? (wins / played) * 100 : 0;
  const form = results.slice(-5) as MatchResult[];

  const streaks = computeStreaks(results);

  return {
    player_id: playerId,
    tournament_id: tournamentId,
    played,
    wins,
    draws,
    losses,
    goals_for,
    goals_against,
    goal_diff: goals_for - goals_against,
    points,
    win_rate,
    goals_per_match: played > 0 ? goals_for / played : 0,
    goals_conceded_per_match: played > 0 ? goals_against / played : 0,
    form,
    current_win_streak: streaks.currentWinStreak,
    longest_win_streak: streaks.longestWinStreak,
    current_unbeaten_streak: streaks.currentUnbeatenStreak,
    longest_unbeaten_streak: streaks.longestUnbeatenStreak,
    current_losing_streak: streaks.currentLosingStreak,
    longest_losing_streak: streaks.longestLosingStreak,
  };
}

// ─── Standings ────────────────────────────────────────────────────────────────

export function computeStandings(
  tournamentId: string,
  players: Player[],
  matches: Match[],
  tournament: Tournament
): StandingRow[] {
  // Build stats map
  const statsMap = new Map<string, PlayerStats>();
  for (const p of players) {
    statsMap.set(p.id, computePlayerStats(p.id, matches, tournamentId, tournament));
  }

  const completedTournamentMatches = matches.filter(
    (m) => m.tournament_id === tournamentId && m.status === 'completed'
  );

  const sorted = [...players].sort((a, b) => {
    const sa = statsMap.get(a.id)!;
    const sb = statsMap.get(b.id)!;

    if (sb.points !== sa.points) return sb.points - sa.points;
    if (sb.goal_diff !== sa.goal_diff) return sb.goal_diff - sa.goal_diff;
    if (sb.goals_for !== sa.goals_for) return sb.goals_for - sa.goals_for;
    if (sb.wins !== sa.wins) return sb.wins - sa.wins;

    // Head-to-head tiebreaker
    const h2h = computeH2H(a.id, b.id, completedTournamentMatches);
    const gdH2H_a = h2h.player1_goals - h2h.player1_goals_against;
    const gdH2H_b = h2h.player2_goals - h2h.player2_goals_against;
    if (h2h.player1_wins !== h2h.player2_wins) return h2h.player2_wins - h2h.player1_wins;
    if (gdH2H_a !== gdH2H_b) return gdH2H_b - gdH2H_a;
    return h2h.player2_goals - h2h.player1_goals;
  });

  return sorted.map((player, idx) => ({
    rank: idx + 1,
    player,
    stats: statsMap.get(player.id)!,
  }));
}

// ─── Head-to-Head ─────────────────────────────────────────────────────────────

interface InternalH2H {
  player1_wins: number;
  player2_wins: number;
  draws: number;
  player1_goals: number;
  player2_goals: number;
  player1_goals_against: number;
  player2_goals_against: number;
}

function computeH2H(
  player1Id: string,
  player2Id: string,
  completedMatches: Match[]
): InternalH2H {
  let p1Wins = 0, p2Wins = 0, draws = 0;
  let p1Goals = 0, p2Goals = 0;
  let p1GA = 0, p2GA = 0;

  for (const m of completedMatches) {
    const isBetween =
      (m.player1_id === player1Id && m.player2_id === player2Id) ||
      (m.player1_id === player2Id && m.player2_id === player1Id);
    if (!isBetween) continue;

    const p1IsP1 = m.player1_id === player1Id;
    const p1Score = p1IsP1 ? (m.player1_score ?? 0) : (m.player2_score ?? 0);
    const p2Score = p1IsP1 ? (m.player2_score ?? 0) : (m.player1_score ?? 0);

    p1Goals += p1Score;
    p2Goals += p2Score;
    p1GA += p2Score;
    p2GA += p1Score;

    if (p1Score > p2Score) p1Wins++;
    else if (p1Score < p2Score) p2Wins++;
    else draws++;
  }

  return {
    player1_wins: p1Wins, player2_wins: p2Wins, draws,
    player1_goals: p1Goals, player2_goals: p2Goals,
    player1_goals_against: p1GA, player2_goals_against: p2GA,
  };
}

export function getHeadToHead(
  player1Id: string,
  player2Id: string,
  matches: Match[],
  tournamentId?: string
): HeadToHeadRecord {
  const filtered = matches.filter((m) => {
    const correctTournament = tournamentId ? m.tournament_id === tournamentId : true;
    const isCompleted = m.status === 'completed';
    const isBetween =
      (m.player1_id === player1Id && m.player2_id === player2Id) ||
      (m.player1_id === player2Id && m.player2_id === player1Id);
    return correctTournament && isCompleted && isBetween;
  });

  const h2h = computeH2H(player1Id, player2Id, filtered);

  return {
    player1_wins: h2h.player1_wins,
    player2_wins: h2h.player2_wins,
    draws: h2h.draws,
    player1_goals: h2h.player1_goals,
    player2_goals: h2h.player2_goals,
    matches: [...filtered].sort((a, b) =>
      matchSortKey(b).localeCompare(matchSortKey(a))
    ),
  };
}

// ─── Career Stats ─────────────────────────────────────────────────────────────

export function getCareerStats(playerId: string, matches: Match[]): PlayerStats {
  return computePlayerStats(playerId, matches, undefined, undefined);
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function getMatchResult(
  match: Match,
  playerId: string
): MatchResult | null {
  if (match.status !== 'completed') return null;
  const isP1 = match.player1_id === playerId;
  const myScore = isP1 ? (match.player1_score ?? 0) : (match.player2_score ?? 0);
  const opScore = isP1 ? (match.player2_score ?? 0) : (match.player1_score ?? 0);
  const isTie = myScore === opScore;
  const isKnockout = match.stage === 'knockout' || (!match.group_name && !!match.round && !match.round.startsWith('Group') && (match.round.includes('Final') || match.round.includes('Round of')));

  if (match.winner_id && (!isTie || isKnockout)) {
    return match.winner_id === playerId ? 'W' : 'L';
  }
  
  if (myScore > opScore) return 'W';
  if (myScore === opScore) return 'D';
  return 'L';
}


export function formatWinRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

export function formatGD(gd: number): string {
  return gd > 0 ? `+${gd}` : `${gd}`;
}
