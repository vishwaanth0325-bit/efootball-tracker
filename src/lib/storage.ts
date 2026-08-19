import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Player, Tournament, TournamentPlayer, Match } from './types';

// ─── Environment & Supabase Client Initialization ────────────────────────────

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zbdbfkuosaunqaawbzvn.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_RqJNaSpqK3roXxnJas0bTQ_K8J8xrRr';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Local UI Preferences Only (Not the database!) ────────────────────────────

const PREF_KEYS = {
  ACTIVE_TOURNAMENT: 'ef_active_tournament_pref',
} as const;

export const preferences = {
  getActiveTournamentId: (): string | null => {
    try {
      return localStorage.getItem(PREF_KEYS.ACTIVE_TOURNAMENT);
    } catch {
      return null;
    }
  },
  saveActiveTournamentId: (id: string | null): void => {
    try {
      if (id) {
        localStorage.setItem(PREF_KEYS.ACTIVE_TOURNAMENT, id);
      } else {
        localStorage.removeItem(PREF_KEYS.ACTIVE_TOURNAMENT);
      }
    } catch (err) {
      console.warn('Failed to save active tournament preference:', err);
    }
  },
};

// ─── Data Sanitizers / Normalizers ───────────────────────────────────────────

function sanitizePlayerForDb(player: Partial<Player>): Record<string, any> {
  const result: Record<string, any> = {};
  if (player.id !== undefined) result.id = player.id;
  if (player.name !== undefined) result.name = player.name;
  if (player.efootball_username !== undefined) {
    result.efootball_username = player.efootball_username || player.name || 'player';
  } else if (player.name) {
    result.efootball_username = player.name;
  }
  if (player.platform !== undefined) result.platform = player.platform || 'Mobile';
  else result.platform = 'Mobile';
  if (player.profile_image !== undefined) result.profile_image = player.profile_image || null;
  if (player.team !== undefined) result.team = player.team || null;
  if (player.notes !== undefined) result.notes = player.notes || null;
  if (player.status !== undefined) result.status = player.status || 'active';
  else result.status = 'active';
  if (player.created_at !== undefined) result.created_at = player.created_at;
  return result;
}

function sanitizeTournamentForDb(t: Partial<Tournament>): Record<string, any> {
  const result: Record<string, any> = {};
  if (t.id !== undefined) result.id = t.id;
  if (t.name !== undefined) result.name = t.name;
  if (t.season !== undefined) result.season = t.season;
  if (t.description !== undefined) result.description = t.description || null;
  if (t.format !== undefined) result.format = t.format;
  if (t.start_date !== undefined) result.start_date = t.start_date || null;
  if (t.end_date !== undefined) result.end_date = t.end_date || null;
  if (t.status !== undefined) result.status = t.status || 'upcoming';
  if (t.points_win !== undefined) result.points_win = t.points_win;
  if (t.points_draw !== undefined) result.points_draw = t.points_draw;
  if (t.points_loss !== undefined) result.points_loss = t.points_loss;
  if (t.knockout_qualifiers !== undefined) result.knockout_qualifiers = t.knockout_qualifiers ?? null;
  if (t.group_config !== undefined) result.group_config = t.group_config ?? null;
  if (t.champion_id !== undefined) result.champion_id = t.champion_id ?? null;
  if (t.runner_up_id !== undefined) result.runner_up_id = t.runner_up_id ?? null;
  if (t.created_at !== undefined) result.created_at = t.created_at;
  return result;
}


function sanitizeTournamentPlayerForDb(tp: Partial<TournamentPlayer>): Record<string, any> {
  const result: Record<string, any> = {};
  if (tp.id !== undefined) result.id = tp.id;
  if (tp.tournament_id !== undefined) result.tournament_id = tp.tournament_id;
  if (tp.player_id !== undefined) result.player_id = tp.player_id;
  if (tp.created_at !== undefined) result.created_at = tp.created_at;
  return result;
}

function sanitizeMatchForDb(m: Partial<Match>): Record<string, any> {
  const result: Record<string, any> = {};
  if (m.id !== undefined) result.id = m.id;
  if (m.tournament_id !== undefined) result.tournament_id = m.tournament_id;
  if (m.stage !== undefined) result.stage = m.stage || null;
  if (m.group_name !== undefined) result.group_name = m.group_name || null;
  if (m.round !== undefined) result.round = m.round || null;
  if (m.match_code !== undefined) result.match_code = m.match_code || null;
  if (m.player1_id !== undefined) result.player1_id = m.player1_id || null;
  if (m.player2_id !== undefined) result.player2_id = m.player2_id || null;
  if (m.player1_placeholder !== undefined) result.player1_placeholder = m.player1_placeholder || null;
  if (m.player2_placeholder !== undefined) result.player2_placeholder = m.player2_placeholder || null;
  if (m.scheduled_date !== undefined) result.scheduled_date = m.scheduled_date || null;
  if (m.scheduled_time !== undefined) result.scheduled_time = m.scheduled_time || null;
  if (m.status !== undefined) result.status = m.status || 'upcoming';
  if (m.player1_score !== undefined) result.player1_score = m.player1_score ?? null;
  if (m.player2_score !== undefined) result.player2_score = m.player2_score ?? null;
  if (m.penalty_player1_score !== undefined) result.penalty_player1_score = m.penalty_player1_score ?? null;
  if (m.penalty_player2_score !== undefined) result.penalty_player2_score = m.penalty_player2_score ?? null;
  if (m.winner_id !== undefined) result.winner_id = m.winner_id ?? null;
  if (m.next_match_id !== undefined) result.next_match_id = m.next_match_id ?? null;
  if (m.next_match_slot !== undefined) result.next_match_slot = m.next_match_slot ?? null;
  if (m.created_at !== undefined) result.created_at = m.created_at;
  if (m.updated_at !== undefined) result.updated_at = m.updated_at;
  return result;
}

// ─── Primary Supabase Database Service API ───────────────────────────────────

export interface InitialData {
  players: Player[];
  tournaments: Tournament[];
  tournamentPlayers: TournamentPlayer[];
  matches: Match[];
}

export const supabaseApi = {
  // 1. Initial full fetch
  fetchInitialData: async (): Promise<{ data: InitialData | null; error: Error | null }> => {
    try {
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

      if (pErr) throw new Error(`Failed to load players: ${pErr.message}`);
      if (tErr) throw new Error(`Failed to load tournaments: ${tErr.message}`);
      if (tpErr) throw new Error(`Failed to load tournament players: ${tpErr.message}`);
      if (mErr) throw new Error(`Failed to load matches: ${mErr.message}`);

      return {
        data: {
          players: (players as Player[]) || [],
          tournaments: (tournaments as Tournament[]) || [],
          tournamentPlayers: (tournamentPlayers as TournamentPlayer[]) || [],
          matches: (matches as Match[]) || [],
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Supabase fetchInitialData error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
    }
  },

  // 2. Players CRUD
  createPlayer: async (input: Omit<Player, 'id' | 'created_at'>): Promise<{ data: Player | null; error: Error | null }> => {
    try {
      const player: Player = {
        ...input,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      const dbPayload = sanitizePlayerForDb(player);
      const { data, error } = await supabase.from('players').insert([dbPayload]).select().single();
      if (error) throw error;
      return { data: (data as Player) || player, error: null };
    } catch (err: any) {
      console.error('Supabase createPlayer error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  updatePlayer: async (player: Player): Promise<{ data: Player | null; error: Error | null }> => {
    try {
      const dbPayload = sanitizePlayerForDb(player);
      const { data, error } = await supabase
        .from('players')
        .update(dbPayload)
        .eq('id', player.id)
        .select()
        .single();
      if (error) throw error;
      return { data: (data as Player) || player, error: null };
    } catch (err: any) {
      console.error('Supabase updatePlayer error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  deletePlayer: async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.from('players').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Supabase deletePlayer error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  // 3. Tournaments CRUD
  createTournament: async (
    input: Omit<Tournament, 'id' | 'created_at'>,
    playerIds?: string[]
  ): Promise<{ data: { tournament: Tournament; tournamentPlayers: TournamentPlayer[] } | null; error: Error | null }> => {
    try {
      const tournamentId = crypto.randomUUID();
      const now = new Date().toISOString();
      const tournament: Tournament = {
        ...input,
        id: tournamentId,
        created_at: now,
      };
      const dbPayload = sanitizeTournamentForDb(tournament);
      const { data: tData, error: tErr } = await supabase
        .from('tournaments')
        .insert([dbPayload])
        .select()
        .single();
      if (tErr) throw tErr;

      let createdTps: TournamentPlayer[] = [];
      if (playerIds && playerIds.length > 0) {
        createdTps = playerIds.map(pid => ({
          id: crypto.randomUUID(),
          tournament_id: tournamentId,
          player_id: pid,
          created_at: now,
        }));
        const tpPayloads = createdTps.map(sanitizeTournamentPlayerForDb);
        const { error: tpErr } = await supabase.from('tournament_players').insert(tpPayloads);
        if (tpErr) throw tpErr;
      }

      return {
        data: {
          tournament: (tData as Tournament) || tournament,
          tournamentPlayers: createdTps,
        },
        error: null,
      };
    } catch (err: any) {
      console.error('Supabase createTournament error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  updateTournament: async (tournament: Tournament): Promise<{ data: Tournament | null; error: Error | null }> => {
    try {
      const dbPayload = sanitizeTournamentForDb(tournament);
      const { data, error } = await supabase
        .from('tournaments')
        .update(dbPayload)
        .eq('id', tournament.id)
        .select()
        .single();
      if (error) throw error;
      return { data: (data as Tournament) || tournament, error: null };
    } catch (err: any) {
      console.error('Supabase updateTournament error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  deleteTournament: async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.from('tournaments').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Supabase deleteTournament error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  // 4. Tournament Players
  addTournamentPlayer: async (
    tournamentId: string,
    playerId: string
  ): Promise<{ data: TournamentPlayer | null; error: Error | null }> => {
    try {
      const tp: TournamentPlayer = {
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        player_id: playerId,
        created_at: new Date().toISOString(),
      };
      const dbPayload = sanitizeTournamentPlayerForDb(tp);
      const { data, error } = await supabase
        .from('tournament_players')
        .insert([dbPayload])
        .select()
        .single();
      if (error) throw error;
      return { data: (data as TournamentPlayer) || tp, error: null };
    } catch (err: any) {
      console.error('Supabase addTournamentPlayer error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  addTournamentPlayers: async (
    tournamentId: string,
    playerIds: string[]
  ): Promise<{ data: TournamentPlayer[] | null; error: Error | null }> => {
    try {
      if (playerIds.length === 0) return { data: [], error: null };
      const now = new Date().toISOString();
      const tps: TournamentPlayer[] = playerIds.map(pid => ({
        id: crypto.randomUUID(),
        tournament_id: tournamentId,
        player_id: pid,
        created_at: now,
      }));
      const dbPayloads = tps.map(sanitizeTournamentPlayerForDb);
      const { data, error } = await supabase
        .from('tournament_players')
        .insert(dbPayloads)
        .select();
      if (error) throw error;
      return { data: (data as TournamentPlayer[]) || tps, error: null };
    } catch (err: any) {
      console.error('Supabase addTournamentPlayers error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  removeTournamentPlayer: async (
    tournamentId: string,
    playerId: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase
        .from('tournament_players')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Supabase removeTournamentPlayer error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  // 5. Matches CRUD
  createMatch: async (
    input: Omit<Match, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: Match | null; error: Error | null }> => {
    try {
      const now = new Date().toISOString();
      const match: Match = {
        ...input,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      const dbPayload = sanitizeMatchForDb(match);
      const { data, error } = await supabase.from('matches').insert([dbPayload]).select().single();
      if (error) throw error;
      return { data: (data as Match) || match, error: null };
    } catch (err: any) {
      console.error('Supabase createMatch error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  createMatches: async (
    inputs: (Omit<Match, 'id' | 'created_at' | 'updated_at'> | Match)[]
  ): Promise<{ data: Match[] | null; error: Error | null }> => {
    try {
      if (inputs.length === 0) return { data: [], error: null };
      const now = new Date().toISOString();
      const matches: Match[] = inputs.map(input => ({
        ...input,
        id: ('id' in input && input.id) ? input.id : crypto.randomUUID(),
        created_at: ('created_at' in input && input.created_at) ? input.created_at : now,
        updated_at: now,
      }));
      const dbPayloads = matches.map(sanitizeMatchForDb);
      const { data, error } = await supabase.from('matches').insert(dbPayloads).select();
      if (error) throw error;
      return { data: (data as Match[]) || matches, error: null };
    } catch (err: any) {
      console.error('Supabase createMatches error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  updateMatch: async (match: Match): Promise<{ data: Match | null; error: Error | null }> => {
    try {
      const updatedMatch: Match = {
        ...match,
        updated_at: new Date().toISOString(),
      };
      const dbPayload = sanitizeMatchForDb(updatedMatch);
      const { data, error } = await supabase
        .from('matches')
        .update(dbPayload)
        .eq('id', match.id)
        .select()
        .single();
      if (error) throw error;
      return { data: (data as Match) || updatedMatch, error: null };
    } catch (err: any) {
      console.error('Supabase updateMatch error:', err);
      return { data: null, error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  deleteMatch: async (id: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Supabase deleteMatch error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  deleteTournamentMatches: async (tournamentId: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.from('matches').delete().eq('tournament_id', tournamentId);
      if (error) throw error;
      return { error: null };
    } catch (err: any) {
      console.error('Supabase deleteTournamentMatches error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  // 6. Reset / Wipe Database
  clearDatabase: async (): Promise<{ error: Error | null }> => {
    try {
      const matchDel = await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (matchDel.error) throw matchDel.error;

      const tpDel = await supabase.from('tournament_players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (tpDel.error) throw tpDel.error;

      const tDel = await supabase.from('tournaments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (tDel.error) throw tDel.error;

      const pDel = await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (pDel.error) throw pDel.error;

      return { error: null };
    } catch (err: any) {
      console.error('Supabase clearDatabase error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },

  // 7. Reseed demo data
  reseedDatabase: async (seed: {
    players: Player[];
    tournaments: Tournament[];
    tournamentPlayers: TournamentPlayer[];
    matches: Match[];
  }): Promise<{ error: Error | null }> => {
    try {
      // 1. Clear first
      const clearRes = await supabaseApi.clearDatabase();
      if (clearRes.error) throw clearRes.error;

      // 2. Insert players
      if (seed.players.length > 0) {
        const pPayloads = seed.players.map(sanitizePlayerForDb);
        const { error: pErr } = await supabase.from('players').insert(pPayloads);
        if (pErr) throw pErr;
      }

      // 3. Insert tournaments
      if (seed.tournaments.length > 0) {
        const tPayloads = seed.tournaments.map(sanitizeTournamentForDb);
        const { error: tErr } = await supabase.from('tournaments').insert(tPayloads);
        if (tErr) throw tErr;
      }

      // 4. Insert tournament_players
      if (seed.tournamentPlayers.length > 0) {
        const tpPayloads = seed.tournamentPlayers.map(sanitizeTournamentPlayerForDb);
        const { error: tpErr } = await supabase.from('tournament_players').insert(tpPayloads);
        if (tpErr) throw tpErr;
      }

      // 5. Insert matches
      if (seed.matches.length > 0) {
        const mPayloads = seed.matches.map(sanitizeMatchForDb);
        const { error: mErr } = await supabase.from('matches').insert(mPayloads);
        if (mErr) throw mErr;
      }

      return { error: null };
    } catch (err: any) {
      console.error('Supabase reseedDatabase error:', err);
      return { error: err instanceof Error ? err : new Error(err.message || String(err)) };
    }
  },
};
