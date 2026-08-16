import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import type { Player, Tournament, TournamentPlayer, Match, AppState } from '../lib/types';
import { storage } from '../lib/storage';
import { buildSeedData } from '../lib/seedData';

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD'; payload: Omit<AppState, 'loading'> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ACTIVE_TOURNAMENT'; payload: string | null }
  | { type: 'ADD_PLAYER'; payload: Player }
  | { type: 'UPDATE_PLAYER'; payload: Player }
  | { type: 'DELETE_PLAYER'; payload: string }
  | { type: 'ADD_TOURNAMENT'; payload: Tournament }
  | { type: 'UPDATE_TOURNAMENT'; payload: Tournament }
  | { type: 'DELETE_TOURNAMENT'; payload: string }
  | { type: 'ADD_TOURNAMENT_PLAYER'; payload: TournamentPlayer }
  | { type: 'REMOVE_TOURNAMENT_PLAYER'; payload: { tournament_id: string; player_id: string } }
  | { type: 'ADD_MATCH'; payload: Match }
  | { type: 'ADD_MATCHES'; payload: Match[] }
  | { type: 'UPDATE_MATCH'; payload: Match }
  | { type: 'DELETE_MATCH'; payload: string }
  | { type: 'CLEAR_ALL' };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: AppState = {
  players: [],
  tournaments: [],
  tournamentPlayers: [],
  matches: [],
  activeTournamentId: null,
  loading: true,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD':
      return { ...state, ...action.payload, loading: false };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ACTIVE_TOURNAMENT':
      return { ...state, activeTournamentId: action.payload };
    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.payload] };
    case 'UPDATE_PLAYER':
      return { ...state, players: state.players.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PLAYER':
      return { ...state, players: state.players.filter(p => p.id !== action.payload) };
    case 'ADD_TOURNAMENT':
      return { ...state, tournaments: [...state.tournaments, action.payload] };
    case 'UPDATE_TOURNAMENT':
      return { ...state, tournaments: state.tournaments.map(t => t.id === action.payload.id ? action.payload : t) };
    case 'DELETE_TOURNAMENT':
      return {
        ...state,
        tournaments: state.tournaments.filter(t => t.id !== action.payload),
        tournamentPlayers: state.tournamentPlayers.filter(tp => tp.tournament_id !== action.payload),
        matches: state.matches.filter(m => m.tournament_id !== action.payload),
        activeTournamentId: state.activeTournamentId === action.payload ? null : state.activeTournamentId,
      };
    case 'ADD_TOURNAMENT_PLAYER':
      return { ...state, tournamentPlayers: [...state.tournamentPlayers, action.payload] };
    case 'REMOVE_TOURNAMENT_PLAYER':
      return {
        ...state,
        tournamentPlayers: state.tournamentPlayers.filter(
          tp => !(tp.tournament_id === action.payload.tournament_id && tp.player_id === action.payload.player_id)
        ),
      };
    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches, action.payload] };
    case 'ADD_MATCHES':
      return { ...state, matches: [...state.matches, ...action.payload] };
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.payload.id ? action.payload : m) };
    case 'DELETE_MATCH':
      return { ...state, matches: state.matches.filter(m => m.id !== action.payload) };
    case 'CLEAR_ALL':
      return { ...initialState, loading: false };
    default:
      return state;
  }
}

// ─── Context Value ────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  // Players
  addPlayer: (player: Omit<Player, 'id' | 'created_at'>) => Player;
  updatePlayer: (player: Player) => void;
  deletePlayer: (id: string) => void;
  // Tournaments
  addTournament: (t: Omit<Tournament, 'id' | 'created_at'>) => Tournament;
  updateTournament: (t: Tournament) => void;
  deleteTournament: (id: string) => void;
  setActiveTournament: (id: string | null) => void;
  // Tournament Players
  addTournamentPlayer: (tournamentId: string, playerId: string) => void;
  removeTournamentPlayer: (tournamentId: string, playerId: string) => void;
  // Matches
  addMatch: (m: Omit<Match, 'id' | 'created_at' | 'updated_at'>) => Match;
  addMatches: (ms: Omit<Match, 'id' | 'created_at' | 'updated_at'>[]) => void;
  updateMatch: (m: Match) => void;
  deleteMatch: (id: string) => void;
  // Utilities
  clearAllData: () => void;
  reseedData: () => void;
  // Derived helpers
  getActiveTournament: () => Tournament | undefined;
  getTournamentPlayers: (tournamentId: string) => Player[];
  getTournamentMatches: (tournamentId: string) => Match[];
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from storage on mount
  useEffect(() => {
    const saved = storage.loadAll();

    // Seed if no data exists
    if (!storage.isSeeded() || saved.players.length === 0) {
      const seed = buildSeedData();
      storage.savePlayers(seed.players);
      storage.saveTournaments(seed.tournaments);
      storage.saveTournamentPlayers(seed.tournamentPlayers);
      storage.saveMatches(seed.matches);
      storage.saveActiveTournamentId(seed.tournaments[0].id);
      storage.markSeeded();

      dispatch({
        type: 'LOAD',
        payload: {
          players: seed.players,
          tournaments: seed.tournaments,
          tournamentPlayers: seed.tournamentPlayers,
          matches: seed.matches,
          activeTournamentId: seed.tournaments[0].id,
        },
      });
    } else {
      dispatch({ type: 'LOAD', payload: saved });
    }
  }, []);

  // Persist to storage whenever state changes (after initial load)
  useEffect(() => {
    if (state.loading) return;
    storage.savePlayers(state.players);
    storage.saveTournaments(state.tournaments);
    storage.saveTournamentPlayers(state.tournamentPlayers);
    storage.saveMatches(state.matches);
    storage.saveActiveTournamentId(state.activeTournamentId);
  }, [state]);

  // ── Player Actions ───────────────────────────────────────────────────────
  const addPlayer = useCallback((data: Omit<Player, 'id' | 'created_at'>): Player => {
    const player: Player = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    dispatch({ type: 'ADD_PLAYER', payload: player });
    return player;
  }, []);

  const updatePlayer = useCallback((player: Player) => {
    dispatch({ type: 'UPDATE_PLAYER', payload: player });
  }, []);

  const deletePlayer = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PLAYER', payload: id });
  }, []);

  // ── Tournament Actions ───────────────────────────────────────────────────
  const addTournament = useCallback((data: Omit<Tournament, 'id' | 'created_at'>): Tournament => {
    const tournament: Tournament = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    dispatch({ type: 'ADD_TOURNAMENT', payload: tournament });
    return tournament;
  }, []);

  const updateTournament = useCallback((t: Tournament) => {
    dispatch({ type: 'UPDATE_TOURNAMENT', payload: t });
  }, []);

  const deleteTournament = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TOURNAMENT', payload: id });
  }, []);

  const setActiveTournament = useCallback((id: string | null) => {
    dispatch({ type: 'SET_ACTIVE_TOURNAMENT', payload: id });
  }, []);

  // ── Tournament Player Actions ────────────────────────────────────────────
  const addTournamentPlayer = useCallback((tournamentId: string, playerId: string) => {
    const tp: TournamentPlayer = {
      id: crypto.randomUUID(),
      tournament_id: tournamentId,
      player_id: playerId,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_TOURNAMENT_PLAYER', payload: tp });
  }, []);

  const removeTournamentPlayer = useCallback((tournament_id: string, player_id: string) => {
    dispatch({ type: 'REMOVE_TOURNAMENT_PLAYER', payload: { tournament_id, player_id } });
  }, []);

  // ── Match Actions ────────────────────────────────────────────────────────
  const addMatch = useCallback((data: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Match => {
    const now = new Date().toISOString();
    const match: Match = { ...data, id: crypto.randomUUID(), created_at: now, updated_at: now };
    dispatch({ type: 'ADD_MATCH', payload: match });
    return match;
  }, []);

  const addMatches = useCallback((data: Omit<Match, 'id' | 'created_at' | 'updated_at'>[]) => {
    const now = new Date().toISOString();
    const matches: Match[] = data.map(d => ({
      ...d,
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
    }));
    dispatch({ type: 'ADD_MATCHES', payload: matches });
  }, []);

  const updateMatch = useCallback((m: Match) => {
    dispatch({ type: 'UPDATE_MATCH', payload: { ...m, updated_at: new Date().toISOString() } });
  }, []);

  const deleteMatch = useCallback((id: string) => {
    dispatch({ type: 'DELETE_MATCH', payload: id });
  }, []);

  // ── Utilities ────────────────────────────────────────────────────────────
  const clearAllData = useCallback(() => {
    storage.clearAll();
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const reseedData = useCallback(() => {
    storage.clearAll();
    const seed = buildSeedData();
    storage.savePlayers(seed.players);
    storage.saveTournaments(seed.tournaments);
    storage.saveTournamentPlayers(seed.tournamentPlayers);
    storage.saveMatches(seed.matches);
    storage.saveActiveTournamentId(seed.tournaments[0].id);
    storage.markSeeded();
    dispatch({
      type: 'LOAD',
      payload: {
        players: seed.players,
        tournaments: seed.tournaments,
        tournamentPlayers: seed.tournamentPlayers,
        matches: seed.matches,
        activeTournamentId: seed.tournaments[0].id,
      },
    });
  }, []);

  // ── Derived Helpers ──────────────────────────────────────────────────────
  const getActiveTournament = useCallback((): Tournament | undefined => {
    return state.tournaments.find(t => t.id === state.activeTournamentId);
  }, [state.tournaments, state.activeTournamentId]);

  const getTournamentPlayers = useCallback((tournamentId: string): Player[] => {
    const ids = state.tournamentPlayers
      .filter(tp => tp.tournament_id === tournamentId)
      .map(tp => tp.player_id);
    return state.players.filter(p => ids.includes(p.id));
  }, [state.players, state.tournamentPlayers]);

  const getTournamentMatches = useCallback((tournamentId: string): Match[] => {
    return state.matches.filter(m => m.tournament_id === tournamentId);
  }, [state.matches]);

  const value: AppContextValue = {
    state,
    addPlayer, updatePlayer, deletePlayer,
    addTournament, updateTournament, deleteTournament, setActiveTournament,
    addTournamentPlayer, removeTournamentPlayer,
    addMatch, addMatches, updateMatch, deleteMatch,
    clearAllData, reseedData,
    getActiveTournament, getTournamentPlayers, getTournamentMatches,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
