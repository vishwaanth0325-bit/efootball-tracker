import type { Player, Tournament, TournamentPlayer, Match } from './types';

// ─── Storage Keys ─────────────────────────────────────────────────────────────

const KEYS = {
  PLAYERS: 'ef_players',
  TOURNAMENTS: 'ef_tournaments',
  TOURNAMENT_PLAYERS: 'ef_tournament_players',
  MATCHES: 'ef_matches',
  ACTIVE_TOURNAMENT: 'ef_active_tournament',
  SEEDED: 'ef_seeded',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Storage error for key "${key}":`, err);
  }
}

// ─── Storage API ──────────────────────────────────────────────────────────────

export const storage = {
  // Players
  getPlayers: (): Player[] => getItem<Player[]>(KEYS.PLAYERS, []),
  savePlayers: (players: Player[]): void => setItem(KEYS.PLAYERS, players),

  // Tournaments
  getTournaments: (): Tournament[] => getItem<Tournament[]>(KEYS.TOURNAMENTS, []),
  saveTournaments: (tournaments: Tournament[]): void => setItem(KEYS.TOURNAMENTS, tournaments),

  // Tournament Players
  getTournamentPlayers: (): TournamentPlayer[] => getItem<TournamentPlayer[]>(KEYS.TOURNAMENT_PLAYERS, []),
  saveTournamentPlayers: (tps: TournamentPlayer[]): void => setItem(KEYS.TOURNAMENT_PLAYERS, tps),

  // Matches
  getMatches: (): Match[] => getItem<Match[]>(KEYS.MATCHES, []),
  saveMatches: (matches: Match[]): void => setItem(KEYS.MATCHES, matches),

  // Active tournament selection
  getActiveTournamentId: (): string | null => getItem<string | null>(KEYS.ACTIVE_TOURNAMENT, null),
  saveActiveTournamentId: (id: string | null): void => setItem(KEYS.ACTIVE_TOURNAMENT, id),

  // Seed flag
  isSeeded: (): boolean => getItem<boolean>(KEYS.SEEDED, false),
  markSeeded: (): void => setItem(KEYS.SEEDED, true),

  // Clear everything
  clearAll: (): void => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  },

  // Load full state
  loadAll: () => ({
    players: getItem<Player[]>(KEYS.PLAYERS, []),
    tournaments: getItem<Tournament[]>(KEYS.TOURNAMENTS, []),
    tournamentPlayers: getItem<TournamentPlayer[]>(KEYS.TOURNAMENT_PLAYERS, []),
    matches: getItem<Match[]>(KEYS.MATCHES, []),
    activeTournamentId: getItem<string | null>(KEYS.ACTIVE_TOURNAMENT, null),
  }),
};
