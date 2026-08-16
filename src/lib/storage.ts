import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Player, Tournament, TournamentPlayer, Match } from './types';

// ─── Environment & Supabase Client Initialization ────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zbdbfkuosaunqaawbzvn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RqJNaSpqK3roXxnJas0bTQ_K8J8xrRr';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ─── Storage Keys (Local Cache & Offline Fallback) ────────────────────────────

const KEYS = {
  PLAYERS: 'ef_players',
  TOURNAMENTS: 'ef_tournaments',
  TOURNAMENT_PLAYERS: 'ef_tournament_players',
  MATCHES: 'ef_matches',
  ACTIVE_TOURNAMENT: 'ef_active_tournament',
  SEEDED: 'ef_seeded',
} as const;

// ─── Local Storage Helpers ────────────────────────────────────────────────────

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

// ─── Supabase Sync Handlers ───────────────────────────────────────────────────

async function syncPlayersToSupabase(players: Player[]) {
  if (!supabase) return;
  try {
    if (players.length === 0) {
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
    const { error } = await supabase.from('players').upsert(players);
    if (error) console.error('Supabase players sync error:', error);
  } catch (err) {
    console.error('Failed to sync players to Supabase:', err);
  }
}

async function syncTournamentsToSupabase(tournaments: Tournament[]) {
  if (!supabase) return;
  try {
    if (tournaments.length === 0) {
      await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
    const { error } = await supabase.from('tournaments').upsert(tournaments);
    if (error) console.error('Supabase tournaments sync error:', error);
  } catch (err) {
    console.error('Failed to sync tournaments to Supabase:', err);
  }
}

async function syncTournamentPlayersToSupabase(tps: TournamentPlayer[]) {
  if (!supabase) return;
  try {
    if (tps.length === 0) {
      await supabase.from('tournament_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
    const { error } = await supabase.from('tournament_players').upsert(tps);
    if (error) console.error('Supabase tournament_players sync error:', error);
  } catch (err) {
    console.error('Failed to sync tournament_players to Supabase:', err);
  }
}

async function syncMatchesToSupabase(matches: Match[]) {
  if (!supabase) return;
  try {
    if (matches.length === 0) {
      await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
    const { error } = await supabase.from('matches').upsert(matches);
    if (error) console.error('Supabase matches sync error:', error);
  } catch (err) {
    console.error('Failed to sync matches to Supabase:', err);
  }
}

// Background initial fetch from Supabase if online & configured
if (supabase) {
  (async () => {
    try {
      const [
        { data: players },
        { data: tournaments },
        { data: tournamentPlayers },
        { data: matches },
      ] = await Promise.all([
        supabase.from('players').select('*'),
        supabase.from('tournaments').select('*'),
        supabase.from('tournament_players').select('*'),
        supabase.from('matches').select('*'),
      ]);

      if (players && players.length > 0) setItem(KEYS.PLAYERS, players);
      if (tournaments && tournaments.length > 0) setItem(KEYS.TOURNAMENTS, tournaments);
      if (tournamentPlayers && tournamentPlayers.length > 0) setItem(KEYS.TOURNAMENT_PLAYERS, tournamentPlayers);
      if (matches && matches.length > 0) setItem(KEYS.MATCHES, matches);
    } catch (err) {
      console.warn('Initial Supabase fetch skipped or failed:', err);
    }
  })();
}

// ─── Storage API ──────────────────────────────────────────────────────────────

export const storage = {
  // Players
  getPlayers: (): Player[] => getItem<Player[]>(KEYS.PLAYERS, []),
  savePlayers: (players: Player[]): void => {
    setItem(KEYS.PLAYERS, players);
    syncPlayersToSupabase(players);
  },

  // Tournaments
  getTournaments: (): Tournament[] => getItem<Tournament[]>(KEYS.TOURNAMENTS, []),
  saveTournaments: (tournaments: Tournament[]): void => {
    setItem(KEYS.TOURNAMENTS, tournaments);
    syncTournamentsToSupabase(tournaments);
  },

  // Tournament Players
  getTournamentPlayers: (): TournamentPlayer[] => getItem<TournamentPlayer[]>(KEYS.TOURNAMENT_PLAYERS, []),
  saveTournamentPlayers: (tps: TournamentPlayer[]): void => {
    setItem(KEYS.TOURNAMENT_PLAYERS, tps);
    syncTournamentPlayersToSupabase(tps);
  },

  // Matches
  getMatches: (): Match[] => getItem<Match[]>(KEYS.MATCHES, []),
  saveMatches: (matches: Match[]): void => {
    setItem(KEYS.MATCHES, matches);
    syncMatchesToSupabase(matches);
  },

  // Active tournament selection
  getActiveTournamentId: (): string | null => getItem<string | null>(KEYS.ACTIVE_TOURNAMENT, null),
  saveActiveTournamentId: (id: string | null): void => setItem(KEYS.ACTIVE_TOURNAMENT, id),

  // Seed flag
  isSeeded: (): boolean => getItem<boolean>(KEYS.SEEDED, false),
  markSeeded: (): void => setItem(KEYS.SEEDED, true),

  // Clear everything
  clearAll: (): void => {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    if (supabase) {
      Promise.all([
        supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('tournament_players').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]).catch(console.error);
    }
  },

  // Load full state
  loadAll: () => ({
    players: getItem<Player[]>(KEYS.PLAYERS, []),
    tournaments: getItem<Tournament[]>(KEYS.TOURNAMENTS, []),
    tournamentPlayers: getItem<TournamentPlayer[]>(KEYS.TOURNAMENT_PLAYERS, []),
    matches: getItem<Match[]>(KEYS.MATCHES, []),
    activeTournamentId: getItem<string | null>(KEYS.ACTIVE_TOURNAMENT, null),
  }),

  // Supabase Async Fetch Helper
  fetchFromSupabase: async () => {
    if (!supabase) return null;
    const [
      { data: players, error: pErr },
      { data: tournaments, error: tErr },
      { data: tournamentPlayers, error: tpErr },
      { data: matches, error: mErr },
    ] = await Promise.all([
      supabase.from('players').select('*').order('created_at', { ascending: true }),
      supabase.from('tournaments').select('*').order('created_at', { ascending: true }),
      supabase.from('tournament_players').select('*').order('created_at', { ascending: true }),
      supabase.from('matches').select('*').order('created_at', { ascending: true }),
    ]);

    if (pErr || tErr || tpErr || mErr) {
      console.error('Supabase fetch error:', { pErr, tErr, tpErr, mErr });
      return null;
    }

    return {
      players: (players as Player[]) || [],
      tournaments: (tournaments as Tournament[]) || [],
      tournamentPlayers: (tournamentPlayers as TournamentPlayer[]) || [],
      matches: (matches as Match[]) || [],
    };
  },
};
