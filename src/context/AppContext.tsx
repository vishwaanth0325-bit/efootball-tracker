import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { Player, Tournament, TournamentPlayer, Match, AppState } from '../lib/types';
import { supabaseApi, preferences, supabase } from '../lib/storage';
import { useToast } from './ToastContext';
import { buildSeedData } from '../lib/seedData';

// ─── Extended State ───────────────────────────────────────────────────────────

export interface ExtendedAppState extends AppState {
  loadError: string | null;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_SUCCESS'; payload: { players: Player[]; tournaments: Tournament[]; tournamentPlayers: TournamentPlayer[]; matches: Match[]; activeTournamentId: string | null } }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_TOURNAMENT'; payload: string | null }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'UPDATE_PLAYER'; payload: Player }
  | { type: 'DELETE_PLAYER'; payload: string }
  | { type: 'ADD_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; payload: Tournament }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'ADD_TOURNAMENT_PLAYER'; payload: TournamentPlayer }
  | { type: 'ADD_TOURNAMENT_PLAYERS'; payload: TournamentPlayer[] }
  | { type: 'REMOVE_TOURNAMENT_PLAYER'; payload: { tournament_id: string; player_id: string } }
  | { type: 'ADD_MATCH'; payload: Match }
  | { type: 'ADD_MATCHES'; payload: Match[] }
  | { type: 'UPDATE_MATCH'; payload: Match }
  | { type: 'DELETE_MATCH'; payload: string }
  | { type: 'DELETE_TOURNAMENT_MATCHES'; payload: string }
  | { type: 'CLEAR_ALL' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: ExtendedAppState = {
  players: [],
  tournaments: [],
  tournamentPlayers: [],
  matches: [],
  activeTournamentId: preferences.getActiveTournamentId(),
  loading: true,
  loadError: null,
};

function reducer(state: ExtendedAppState, action: Action): ExtendedAppState {
  switch (action.type) {
    case 'LOAD_SUCCESS': {
      // Validate saved active tournament id
      const activeExists = action.payload.tournaments.some(t => t.id === action.payload.activeTournamentId);
      const validActiveId = activeExists
        ? action.payload.activeTournamentId
        : action.payload.tournaments[0]?.id || null;

      return {
        ...state,
        players: action.payload.players,
        tournaments: action.payload.tournaments,
        tournamentPlayers: action.payload.tournamentPlayers,
        matches: action.payload.matches,
        activeTournamentId: validActiveId,
        loading: false,
        loadError: null,
      };
    }
    case 'LOAD_ERROR':
      return { ...state, loading: false, loadError: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ACTIVE_TOURNAMENT':
      return { ...state, activeTournamentId: action.payload };
    case 'ADD_PLAYER':
      return { ...state, players: [...state.players.filter(p => p.id !== action.payload.id), action.payload] };
    case 'UPDATE_PLAYER':
      return { ...state, players: state.players.map(p => (p.id === action.payload.id ? action.payload : p)) };
    case 'DELETE_PLAYER':
      return {
        ...state,
        players: state.players.filter(p => p.id !== action.payload),
        tournamentPlayers: state.tournamentPlayers.filter(tp => tp.player_id !== action.payload),
        matches: state.matches.filter(m => m.player1_id !== action.payload && m.player2_id !== action.payload),
      };
    case 'ADD_TOURNAMENT':
      return { ...state, tournaments: [...state.tournaments.filter(t => t.id !== action.payload.id), action.payload] };
    case 'UPDATE_TOURNAMENT':
      return { ...state, tournaments: state.tournaments.map(t => (t.id === action.payload.id ? action.payload : t)) };
    case 'DELETE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.filter(t => t.id !== action.payload),
        tournamentPlayers: state.tournamentPlayers.filter(tp => tp.tournament_id !== action.payload),
        matches: state.matches.filter(m => m.tournament_id !== action.payload),
        activeTournamentId: state.activeTournamentId === action.payload ? (state.tournaments.find(t => t.id !== action.payload)?.id || null) : state.activeTournamentId,
      };
    case 'ADD_TOURNAMENT_PLAYER':
      return { ...state, tournamentPlayers: [...state.tournamentPlayers.filter(tp => tp.id !== action.payload.id), action.payload] };
    case 'ADD_TOURNAMENT_PLAYERS': {
      const newIds = new Set(action.payload.map(tp => tp.id));
      return {
        ...state,
        tournamentPlayers: [...state.tournamentPlayers.filter(tp => !newIds.has(tp.id)), ...action.payload],
      };
    }
    case 'REMOVE_TOURNAMENT_PLAYER':
      return {
        ...state,
        tournamentPlayers: state.tournamentPlayers.filter(
          tp => !(tp.tournament_id === action.payload.tournament_id && tp.player_id === action.payload.player_id)
        ),
      };
    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches.filter(m => m.id !== action.payload.id), action.payload] };
    case 'ADD_MATCHES': {
      const newIds = new Set(action.payload.map(m => m.id));
      return { ...state, matches: [...state.matches.filter(m => !newIds.has(m.id)), ...action.payload] };
    }
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => (m.id === action.payload.id ? action.payload : m)) };
    case 'DELETE_MATCH':
      return { ...state, matches: state.matches.filter(m => m.id !== action.payload) };
    case 'DELETE_TOURNAMENT_MATCHES':
      return { ...state, matches: state.matches.filter(m => m.tournament_id !== action.payload) };
    case 'CLEAR_ALL':
      return { ...initialState, loading: false, activeTournamentId: null };
    default:
      return state;
  }
}

// ─── Context Value Interface ──────────────────────────────────────────────────

export interface AppContextValue {
  state: ExtendedAppState;
  refreshData: () => Promise<void>;
  // Players
  addPlayer: (player: Omit<Player, 'id' | 'created_at'>) => Promise<Player | null>;
  updatePlayer: (player: Player) => Promise<boolean>;
  deletePlayer: (id: string) => Promise<boolean>;
  // Tournaments
  addTournament: (t: Omit<Tournament, 'id' | 'created_at'>, initialPlayerIds?: string[]) => Promise<Tournament | null>;
  updateTournament: (t: Tournament) => Promise<boolean>;
  deleteTournament: (id: string) => Promise<boolean>;
  setActiveTournament: (id: string | null) => void;
  // Tournament Players
  addTournamentPlayer: (tournamentId: string, playerId: string) => Promise<boolean>;
  addTournamentPlayers: (tournamentId: string, playerIds: string[]) => Promise<boolean>;
  removeTournamentPlayer: (tournamentId: string, playerId: string) => Promise<boolean>;
  // Matches
  addMatch: (m: Omit<Match, 'id' | 'created_at' | 'updated_at'>) => Promise<Match | null>;
  addMatches: (ms: (Omit<Match, 'id' | 'created_at' | 'updated_at'> | Match)[]) => Promise<boolean>;
  updateMatch: (m: Match) => Promise<boolean>;
  deleteMatch: (id: string) => Promise<boolean>;
  deleteTournamentMatches: (tournamentId: string) => Promise<boolean>;
  // Database Utilities
  clearAllData: () => Promise<boolean>;
  reseedData: () => Promise<boolean>;
  // Derived Helpers
  getActiveTournament: () => Tournament | undefined;
  getTournamentPlayers: (tournamentId: string) => Player[];
  getTournamentMatches: (tournamentId: string) => Match[];
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider Component ───────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { showToast } = useToast();
  const isFetchingRef = useRef(false);

  // Single function to fetch fresh data from Supabase
  const loadData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const { data, error } = await supabaseApi.fetchInitialData();
      if (error || !data) {
        const errorMsg = error ? error.message : 'Unknown database error occurred';
        dispatch({ type: 'LOAD_ERROR', payload: errorMsg });
        showToast(`Failed to load from database: ${errorMsg}`, 'error');
        return;
      }

      const savedActiveId = preferences.getActiveTournamentId();
      dispatch({
        type: 'LOAD_SUCCESS',
        payload: {
          players: data.players,
          tournaments: data.tournaments,
          tournamentPlayers: data.tournamentPlayers,
          matches: data.matches,
          activeTournamentId: savedActiveId,
        },
      });
    } catch (err: any) {
      console.error('Fatal load error:', err);
      dispatch({ type: 'LOAD_ERROR', payload: err.message || 'Network error connecting to database' });
      showToast('Network error connecting to database', 'error');
    } finally {
      isFetchingRef.current = false;
    }
  }, [showToast]);

  // Initial Load from Supabase
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Supabase Realtime Subscription: multi-device synchronization
  useEffect(() => {
    const channel = supabase
      .channel('shared-tournament-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => {
          supabaseApi.fetchInitialData().then(({ data }) => {
            if (data) {
              dispatch({
                type: 'LOAD_SUCCESS',
                payload: {
                  players: data.players,
                  tournaments: data.tournaments,
                  tournamentPlayers: data.tournamentPlayers,
                  matches: data.matches,
                  activeTournamentId: preferences.getActiveTournamentId(),
                },
              });
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournaments' },
        () => {
          supabaseApi.fetchInitialData().then(({ data }) => {
            if (data) {
              dispatch({
                type: 'LOAD_SUCCESS',
                payload: {
                  players: data.players,
                  tournaments: data.tournaments,
                  tournamentPlayers: data.tournamentPlayers,
                  matches: data.matches,
                  activeTournamentId: preferences.getActiveTournamentId(),
                },
              });
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tournament_players' },
        () => {
          supabaseApi.fetchInitialData().then(({ data }) => {
            if (data) {
              dispatch({
                type: 'LOAD_SUCCESS',
                payload: {
                  players: data.players,
                  tournaments: data.tournaments,
                  tournamentPlayers: data.tournamentPlayers,
                  matches: data.matches,
                  activeTournamentId: preferences.getActiveTournamentId(),
                },
              });
            }
          });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          supabaseApi.fetchInitialData().then(({ data }) => {
            if (data) {
              dispatch({
                type: 'LOAD_SUCCESS',
                payload: {
                  players: data.players,
                  tournaments: data.tournaments,
                  tournamentPlayers: data.tournamentPlayers,
                  matches: data.matches,
                  activeTournamentId: preferences.getActiveTournamentId(),
                },
              });
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ── Player Actions ─────────────────────────────────────────────────────────

  const addPlayer = useCallback(
    async (data: Omit<Player, 'id' | 'created_at'>): Promise<Player | null> => {
      const { data: created, error } = await supabaseApi.createPlayer(data);
      if (error || !created) {
        showToast(`Failed to add player: ${error?.message || 'Database error'}`, 'error');
        return null;
      }
      dispatch({ type: 'ADD_PLAYER', payload: created });
      return created;
    },
    [showToast]
  );

  const updatePlayer = useCallback(
    async (player: Player): Promise<boolean> => {
      const { data: updated, error } = await supabaseApi.updatePlayer(player);
      if (error || !updated) {
        showToast(`Failed to update player: ${error?.message || 'Database error'}`, 'error');
        return false;
      }
      dispatch({ type: 'UPDATE_PLAYER', payload: updated });
      return true;
    },
    [showToast]
  );

  const deletePlayer = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabaseApi.deletePlayer(id);
      if (error) {
        showToast(`Failed to delete player: ${error.message}`, 'error');
        return false;
      }
      dispatch({ type: 'DELETE_PLAYER', payload: id });
      return true;
    },
    [showToast]
  );

  // ── Tournament Actions ─────────────────────────────────────────────────────

  const addTournament = useCallback(
    async (
      data: Omit<Tournament, 'id' | 'created_at'>,
      initialPlayerIds?: string[]
    ): Promise<Tournament | null> => {
      const { data: result, error } = await supabaseApi.createTournament(data, initialPlayerIds);
      if (error || !result) {
        showToast(`Failed to create tournament: ${error?.message || 'Database error'}`, 'error');
        return null;
      }

      dispatch({ type: 'ADD_TOURNAMENT', payload: result.tournament });
      if (result.tournamentPlayers.length > 0) {
        dispatch({ type: 'ADD_TOURNAMENT_PLAYERS', payload: result.tournamentPlayers });
      }

      return result.tournament;
    },
    [showToast]
  );

  const updateTournament = useCallback(
    async (t: Tournament): Promise<boolean> => {
      const { data: updated, error } = await supabaseApi.updateTournament(t);
      if (error || !updated) {
        showToast(`Failed to update tournament: ${error?.message || 'Database error'}`, 'error');
        return false;
      }
      dispatch({ type: 'UPDATE_TOURNAMENT', payload: updated });
      return true;
    },
    [showToast]
  );

  const deleteTournament = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabaseApi.deleteTournament(id);
      if (error) {
        showToast(`Failed to delete tournament: ${error.message}`, 'error');
        return false;
      }
      dispatch({ type: 'DELETE_TOURNAMENT', payload: id });
      return true;
    },
    [showToast]
  );

  const setActiveTournament = useCallback((id: string | null) => {
    preferences.saveActiveTournamentId(id);
    dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: id });
  }, []);

  // ── Tournament Player Actions ──────────────────────────────────────────────

  const addTournamentPlayer = useCallback(
    async (tournamentId: string, playerId: string): Promise<boolean> => {
      const { data: created, error } = await supabaseApi.addTournamentPlayer(tournamentId, playerId);
      if (error || !created) {
        showToast(`Failed to add participant: ${error?.message || 'Database error'}`, 'error');
        return false;
      }
      dispatch({ type: 'ADD_TOURNAMENT_PLAYER', payload: created });
      return true;
    },
    [showToast]
  );

  const addTournamentPlayers = useCallback(
    async (tournamentId: string, playerIds: string[]): Promise<boolean> => {
      const { data: created, error } = await supabaseApi.addTournamentPlayers(tournamentId, playerIds);
      if (error || !created) {
        showToast(`Failed to add participants: ${error?.message || 'Database error'}`, 'error');
        return false;
      }
      dispatch({ type: 'ADD_TOURNAMENT_PLAYERS', payload: created });
      return true;
    },
    [showToast]
  );

  const removeTournamentPlayer = useCallback(
    async (tournamentId: string, playerId: string): Promise<boolean> => {
      const { error } = await supabaseApi.removeTournamentPlayer(tournamentId, playerId);
      if (error) {
        showToast(`Failed to remove participant: ${error.message}`, 'error');
        return false;
      }
      dispatch({ type: 'REMOVE_TOURNAMENT_PLAYER', payload: { tournament_id: tournamentId, player_id: playerId } });
      return true;
    },
    [showToast]
  );

  // ── Match Actions ──────────────────────────────────────────────────────────

  const addMatch = useCallback(
    async (data: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Promise<Match | null> => {
      const { data: created, error } = await supabaseApi.createMatch(data);
      if (error || !created) {
        showToast(`Failed to create match: ${error?.message || 'Database error'}`, 'error');
        return null;
      }
      dispatch({ type: 'ADD_MATCH', payload: created });
      return created;
    },
    [showToast]
  );

  const addMatches = useCallback(
    async (data: (Omit<Match, 'id' | 'created_at' | 'updated_at'> | Match)[]): Promise<boolean> => {
      const { data: created, error } = await supabaseApi.createMatches(data);
      if (error || !created) {
        showToast(`Failed to create fixtures: ${error?.message || 'Database error'}`, 'error');
        return false;
      }
      dispatch({ type: 'ADD_MATCHES', payload: created });
      return true;
    },
    [showToast]
  );

  const updateMatch = useCallback(
    async (m: Match): Promise<boolean> => {
      const { data: updated, error } = await supabaseApi.updateMatch(m);
      if (error || !updated) {
        showToast(`Failed to save match result: ${error?.message || 'Database error'}`, 'error');
        return false;
      }
      dispatch({ type: 'UPDATE_MATCH', payload: updated });
      return true;
    },
    [showToast]
  );

  const deleteMatch = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabaseApi.deleteMatch(id);
      if (error) {
        showToast(`Failed to delete match: ${error.message}`, 'error');
        return false;
      }
      dispatch({ type: 'DELETE_MATCH', payload: id });
      return true;
    },
    [showToast]
  );

  const deleteTournamentMatches = useCallback(
    async (tournamentId: string): Promise<boolean> => {
      const { error } = await supabaseApi.deleteTournamentMatches(tournamentId);
      if (error) {
        showToast(`Failed to clear tournament matches: ${error.message}`, 'error');
        return false;
      }
      dispatch({ type: 'DELETE_TOURNAMENT_MATCHES', payload: tournamentId });
      return true;
    },
    [showToast]
  );

  // ── Database Utilities ─────────────────────────────────────────────────────

  const clearAllData = useCallback(async (): Promise<boolean> => {
    const { error } = await supabaseApi.clearDatabase();
    if (error) {
      showToast(`Failed to wipe database: ${error.message}`, 'error');
      return false;
    }
    preferences.saveActiveTournamentId(null);
    dispatch({ type: 'CLEAR_ALL' });
    return true;
  }, [showToast]);

  const reseedData = useCallback(async (): Promise<boolean> => {
    const seed = buildSeedData();
    const { error } = await supabaseApi.reseedDatabase(seed);
    if (error) {
      showToast(`Failed to reseed database: ${error.message}`, 'error');
      return false;
    }
    preferences.saveActiveTournamentId(seed.tournaments[0]?.id || null);
    dispatch({
      type: 'LOAD_SUCCESS',
      payload: {
        players: seed.players,
        tournaments: seed.tournaments,
        tournamentPlayers: seed.tournamentPlayers,
        matches: seed.matches,
        activeTournamentId: seed.tournaments[0]?.id || null,
      },
    });
    return true;
  }, [showToast]);

  // ── Derived Helpers ────────────────────────────────────────────────────────

  const getActiveTournament = useCallback((): Tournament | undefined => {
    return state.tournaments.find(t => t.id === state.activeTournamentId);
  }, [state.tournaments, state.activeTournamentId]);

  const getTournamentPlayers = useCallback(
    (tournamentId: string): Player[] => {
      const ids = state.tournamentPlayers
        .filter(tp => tp.tournament_id === tournamentId)
        .map(tp => tp.player_id);
      return state.players.filter(p => ids.includes(p.id));
    },
    [state.players, state.tournamentPlayers]
  );

  const getTournamentMatches = useCallback(
    (tournamentId: string): Match[] => {
      return state.matches.filter(m => m.tournament_id === tournamentId);
    },
    [state.matches]
  );

  const value: AppContextValue = {
    state,
    refreshData: loadData,
    addPlayer,
    updatePlayer,
    deletePlayer,
    addTournament,
    updateTournament,
    deleteTournament,
    setActiveTournament,
    addTournamentPlayer,
    addTournamentPlayers,
    removeTournamentPlayer,
    addMatch,
    addMatches,
    updateMatch,
    deleteMatch,
    deleteTournamentMatches,
    clearAllData,
    reseedData,
    getActiveTournament,
    getTournamentPlayers,
    getTournamentMatches,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
