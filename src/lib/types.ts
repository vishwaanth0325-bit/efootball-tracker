// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type TournamentFormat = 'league' | 'round_robin' | 'groups' | 'knockout' | 'group_knockout';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';
export type MatchStatus = 'upcoming' | 'completed';
export type MatchResult = 'W' | 'D' | 'L';
export type ToastType = 'success' | 'error' | 'info';

// ─── Entity Types ─────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  efootball_username?: string;
  team?: string;
  profile_image?: string;
  platform?: string;
  status?: string;
  notes?: string;
  created_at: string;
}

export interface TournamentGroupConfig {
  group_count: number;
  qualifiers_per_group: number;
  group_assignments?: Record<string, string[]>; // "Group A" -> ["id1", "id2", ...]
}

export interface Tournament {
  id: string;
  name: string;
  season: string;
  description?: string;
  format: TournamentFormat;
  status: TournamentStatus;
  points_win: number;
  points_draw: number;
  points_loss: number;
  start_date?: string;
  end_date?: string;
  champion_id?: string;
  runner_up_id?: string;
  group_config?: TournamentGroupConfig;
  created_at: string;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  group_name?: string; // e.g. "Group A"
  seed?: number;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  stage?: 'group' | 'knockout';
  group_name?: string; // e.g. "Group A"
  round?: string; // e.g. "Group A - Match 1", "Round of 16", "Quarter-Final", "Semi-Final", "Final"
  match_code?: string; // e.g. "R16-1", "QF1", "SF1", "FINAL"
  player1_id?: string;
  player2_id?: string;
  player1_placeholder?: string; // e.g. "A1 (Winner Group A)", "Winner R16-1"
  player2_placeholder?: string; // e.g. "B2 (Runner-up Group B)", "Winner R16-2"
  player1_score?: number;
  player2_score?: number;
  penalty_player1_score?: number;
  penalty_player2_score?: number;
  winner_id?: string;
  next_match_id?: string;
  next_match_slot?: 'player1' | 'player2';
  source_match_1_id?: string;
  source_match_2_id?: string;
  status: MatchStatus;
  scheduled_date?: string;
  scheduled_time?: string;
  created_at: string;
  updated_at: string;
}

// ─── Computed Types (never persisted) ────────────────────────────────────────

export interface PlayerStats {
  player_id: string;
  tournament_id?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  win_rate: number;
  goals_per_match: number;
  goals_conceded_per_match: number;
  form: MatchResult[];
  current_win_streak: number;
  longest_win_streak: number;
  current_unbeaten_streak: number;
  longest_unbeaten_streak: number;
  current_losing_streak: number;
  longest_losing_streak: number;
}

export interface StandingRow {
  rank: number;
  player: Player;
  stats: PlayerStats;
}

export interface HeadToHeadRecord {
  player1_wins: number;
  player2_wins: number;
  draws: number;
  player1_goals: number;
  player2_goals: number;
  matches: Match[];
}

// ─── App State ────────────────────────────────────────────────────────────────

export interface AppState {
  players: Player[];
  tournaments: Tournament[];
  tournamentPlayers: TournamentPlayer[];
  matches: Match[];
  activeTournamentId: string | null;
  loading: boolean;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}
