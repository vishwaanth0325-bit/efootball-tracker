// ─── Enums / Unions ──────────────────────────────────────────────────────────

export type Platform = 'PS5' | 'PS4' | 'Xbox' | 'Mobile' | 'PC';
export type TournamentFormat = 'league' | 'round_robin' | 'groups' | 'knockout' | 'group_knockout';
export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed';
export type MatchStatus = 'upcoming' | 'completed' | 'postponed' | 'cancelled';
export type PlayerStatus = 'active' | 'inactive';
export type MatchResult = 'W' | 'D' | 'L';
export type ToastType = 'success' | 'error' | 'info';

// ─── Entity Types (persisted) ─────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  efootball_username: string;
  platform: Platform;
  profile_image?: string;
  team?: string;
  notes?: string;
  status: PlayerStatus;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  season: string;
  description?: string;
  format: TournamentFormat;
  start_date?: string;
  end_date?: string;
  status: TournamentStatus;
  points_win: number;
  points_draw: number;
  points_loss: number;
  created_at: string;
}

export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  round?: string;
  player1_id: string;
  player2_id: string;
  scheduled_date?: string;
  scheduled_time?: string;
  status: MatchStatus;
  player1_score?: number;
  player2_score?: number;
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
