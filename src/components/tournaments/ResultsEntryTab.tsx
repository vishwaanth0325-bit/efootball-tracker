import React, { useState, useMemo } from 'react';
import type { Match, Player } from '../../lib/types';
import {
  CheckCircle2,
  Clock,
  Undo2,
  Save,
  Shield,
  Search,
  ChevronDown,
  ChevronUp,
  User,
} from 'lucide-react';

interface ResultsEntryTabProps {
  matches: Match[];
  players: Player[];
  isProcessing: boolean;
  onSaveResult: (
    match: Match,
    p1Score: number,
    p2Score: number,
    p1Team?: string,
    p2Team?: string
  ) => Promise<void>;
  onUndoResult: (match: Match) => Promise<void>;
}

/** Single inline result-entry card */
const ResultCard: React.FC<{
  match: Match;
  player1: Player | undefined;
  player2: Player | undefined;
  isProcessing: boolean;
  onSave: (p1Score: number, p2Score: number, p1Team: string, p2Team: string) => void;
  onUndo: () => void;
}> = ({ match, player1, player2, isProcessing, onSave, onUndo }) => {
  const isCompleted = match.status === 'completed';

  const [p1Score, setP1Score] = useState<number>(match.player1_score ?? 0);
  const [p2Score, setP2Score] = useState<number>(match.player2_score ?? 0);
  // Pre-fill from player.team profile, then from match record
  const [p1Team, setP1Team] = useState<string>(
    match.player1_team ?? player1?.team ?? ''
  );
  const [p2Team, setP2Team] = useState<string>(
    match.player2_team ?? player2?.team ?? ''
  );
  const [expanded, setExpanded] = useState(!isCompleted);

  const winnerTeam = isCompleted && match.winner_id
    ? match.winner_id === match.player1_id
      ? (player1?.team || player1?.name || 'Player 1')
      : (player2?.team || player2?.name || 'Player 2')
    : null;

  const winnerPlayer = isCompleted && match.winner_id
    ? match.winner_id === match.player1_id
      ? player1
      : player2
    : null;

  return (
    <div
      className={`card border transition-all duration-200 overflow-hidden ${
        isCompleted
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-border-light hover:border-accent/40'
      }`}
    >
      {/* Header row — click to expand/collapse */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 gap-3 text-left"
        onClick={() => setExpanded(prev => !prev)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isCompleted ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-accent shrink-0" />
          )}

          {/* Player 1 team name (primary) + player name (secondary) */}
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm text-text truncate flex items-center gap-1">
              <Shield className="w-3 h-3 text-accent shrink-0" />
              {player1?.team || player1?.name || match.player1_placeholder || 'TBD'}
            </div>
            {player1?.team && (
              <div className="text-[11px] text-text-muted truncate flex items-center gap-0.5 mt-0.5">
                <User className="w-2.5 h-2.5 shrink-0" />
                {player1.name}
              </div>
            )}
          </div>

          {/* Score bubble */}
          <div className={`shrink-0 px-3 py-1.5 rounded-lg font-mono font-bold text-sm border ${
            isCompleted ? 'bg-surface border-emerald-500/30 text-text' : 'bg-surface border-border-light text-text-muted'
          }`}>
            {isCompleted
              ? `${match.player1_score ?? 0} – ${match.player2_score ?? 0}`
              : 'vs'}
          </div>

          {/* Player 2 team name (primary) + player name (secondary) */}
          <div className="min-w-0 flex-1 text-right">
            <div className="font-bold text-sm text-text truncate flex items-center gap-1 justify-end">
              {player2?.team || player2?.name || match.player2_placeholder || 'TBD'}
              <Shield className="w-3 h-3 text-accent shrink-0" />
            </div>
            {player2?.team && (
              <div className="text-[11px] text-text-muted truncate flex items-center gap-0.5 justify-end mt-0.5">
                {player2.name}
                <User className="w-2.5 h-2.5 shrink-0" />
              </div>
            )}
          </div>
        </div>

        {/* Round tag + winner badge + expand icon */}
        <div className="shrink-0 flex items-center gap-2">
          {match.round && (
            <span className="hidden sm:inline px-2 py-0.5 rounded bg-surface border border-border-light text-[10px] text-text-muted font-medium">
              {match.round}
            </span>
          )}
          {winnerTeam && winnerPlayer && (
            <span className="hidden sm:inline px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              🏆 {winnerTeam}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>

      {/* Expanded entry form */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border-light/50 pt-4 space-y-4 animate-fadeIn">
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">

            {/* === Player 1 === */}
            <div className="space-y-2">
              {/* Player info header */}
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="font-bold text-sm text-text truncate">
                    {player1?.team || player1?.name || 'Player 1'}
                  </span>
                </div>
                {player1?.team && (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted">
                    <User className="w-2.5 h-2.5 shrink-0" />
                    {player1.name}
                  </div>
                )}
              </div>

              {/* Team used override */}
              <input
                type="text"
                placeholder={player1?.team ? `Default: ${player1.team}` : 'Team used in match'}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border-light text-xs focus:border-accent outline-none transition-colors placeholder:text-text-muted/50"
                value={p1Team}
                onChange={e => setP1Team(e.target.value)}
              />

              {/* Score input */}
              <div className="flex items-center gap-2">
                <button type="button"
                  className="w-9 h-9 rounded-lg bg-surface border border-border-light flex items-center justify-center text-text hover:bg-surface-hover transition-colors font-bold text-lg"
                  onClick={() => setP1Score(v => Math.max(0, v - 1))}
                >−</button>
                <input
                  type="number" min={0} max={20}
                  className="flex-1 h-14 text-center font-display font-bold text-4xl bg-surface border-2 border-border-light rounded-xl focus:border-accent outline-none text-text transition-colors"
                  value={p1Score}
                  onChange={e => setP1Score(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                />
                <button type="button"
                  className="w-9 h-9 rounded-lg bg-surface border border-border-light flex items-center justify-center text-text hover:bg-surface-hover transition-colors font-bold text-lg"
                  onClick={() => setP1Score(v => Math.min(20, v + 1))}
                >+</button>
              </div>
            </div>

            <div className="font-display font-bold text-xl text-text-muted opacity-40 pt-10">–</div>

            {/* === Player 2 === */}
            <div className="space-y-2">
              {/* Player info header */}
              <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="font-bold text-sm text-text truncate">
                    {player2?.team || player2?.name || 'Player 2'}
                  </span>
                  <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
                </div>
                {player2?.team && (
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] text-text-muted justify-end">
                    {player2.name}
                    <User className="w-2.5 h-2.5 shrink-0" />
                  </div>
                )}
              </div>

              {/* Team used override */}
              <input
                type="text"
                placeholder={player2?.team ? `Default: ${player2.team}` : 'Team used in match'}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border-light text-xs focus:border-accent outline-none transition-colors placeholder:text-text-muted/50"
                value={p2Team}
                onChange={e => setP2Team(e.target.value)}
              />

              {/* Score input */}
              <div className="flex items-center gap-2">
                <button type="button"
                  className="w-9 h-9 rounded-lg bg-surface border border-border-light flex items-center justify-center text-text hover:bg-surface-hover transition-colors font-bold text-lg"
                  onClick={() => setP2Score(v => Math.max(0, v - 1))}
                >−</button>
                <input
                  type="number" min={0} max={20}
                  className="flex-1 h-14 text-center font-display font-bold text-4xl bg-surface border-2 border-border-light rounded-xl focus:border-accent outline-none text-text transition-colors"
                  value={p2Score}
                  onChange={e => setP2Score(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
                />
                <button type="button"
                  className="w-9 h-9 rounded-lg bg-surface border border-border-light flex items-center justify-center text-text hover:bg-surface-hover transition-colors font-bold text-lg"
                  onClick={() => setP2Score(v => Math.min(20, v + 1))}
                >+</button>
              </div>
            </div>
          </div>

          {/* Winner preview */}
          {(p1Score !== p2Score) && (
            <div className="text-center text-xs text-text-muted">
              Winner:{' '}
              <span className="font-bold text-emerald-400">
                🏆 {p1Score > p2Score
                  ? (player1?.team || player1?.name || 'Player 1')
                  : (player2?.team || player2?.name || 'Player 2')}
              </span>
            </div>
          )}
          {p1Score === p2Score && (
            <div className="text-center text-xs text-text-muted">Draw</div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onSave(p1Score, p2Score, p1Team, p2Team)}
              disabled={isProcessing}
              className="btn btn-primary flex-1 py-2.5 text-sm font-bold"
            >
              <Save className="w-4 h-4 mr-1.5" />
              {isCompleted ? 'Update Result' : 'Save Result'}
            </button>

            {isCompleted && (
              <button
                type="button"
                onClick={onUndo}
                disabled={isProcessing}
                title="Undo — mark as unplayed"
                className="btn border border-red-500/40 text-red-400 hover:bg-red-500/10 py-2.5 px-4 text-sm font-semibold transition-colors"
              >
                <Undo2 className="w-4 h-4 mr-1.5" />
                Undo
              </button>
            )}
          </div>

          {isCompleted && (
            <p className="text-[11px] text-text-muted text-center">
              "Undo" resets this match to <strong>unplayed</strong> — removes the score and result entirely.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/** The full Results tab */
export const ResultsEntryTab: React.FC<ResultsEntryTabProps> = ({
  matches,
  players,
  isProcessing,
  onSaveResult,
  onUndoResult,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  const filteredMatches = useMemo(() => {
    return matches
      .filter(m => {
        if (filter === 'upcoming' && m.status !== 'upcoming') return false;
        if (filter === 'completed' && m.status !== 'completed') return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const p1 = players.find(p => p.id === m.player1_id);
          const p2 = players.find(p => p.id === m.player2_id);
          return (
            p1?.name?.toLowerCase().includes(q) ||
            p1?.team?.toLowerCase().includes(q) ||
            p2?.name?.toLowerCase().includes(q) ||
            p2?.team?.toLowerCase().includes(q) ||
            m.round?.toLowerCase().includes(q) ||
            m.group_name?.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
        if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
        return 0;
      });
  }, [matches, players, search, filter]);

  const upcoming = matches.filter(m => m.status === 'upcoming').length;
  const completed = matches.filter(m => m.status === 'completed').length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-text">Enter Results</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Enter scores using each player's team. Undo any result to mark it as unplayed.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-accent/15 text-accent font-bold border border-accent/30">
            {upcoming} Remaining
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
            {completed} Done
          </span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by player name, team, or round..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface border border-border-light text-sm focus:border-accent outline-none placeholder:text-text-muted/60"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-surface rounded-xl p-1 border border-border-light shrink-0">
          {(['all', 'upcoming', 'completed'] as const).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-accent text-bg shadow-sm' : 'text-text-muted hover:text-text'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Match cards */}
      {filteredMatches.length === 0 ? (
        <div className="card p-10 text-center text-text-muted text-sm">
          No matches found.
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMatches.map(match => (
            <ResultCard
              key={match.id}
              match={match}
              player1={players.find(p => p.id === match.player1_id)}
              player2={players.find(p => p.id === match.player2_id)}
              isProcessing={isProcessing}
              onSave={(p1Score, p2Score, p1Team, p2Team) =>
                onSaveResult(match, p1Score, p2Score, p1Team, p2Team)
              }
              onUndo={() => onUndoResult(match)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
