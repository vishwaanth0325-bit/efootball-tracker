import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computePlayerStats, getCompletedPlayerMatches, getMatchResult, formatGD } from '../lib/calculations';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const { state } = useApp();

  const player = state.players.find(p => p.id === playerId);

  const playerTournaments = useMemo(() => {
    if (!playerId) return [];
    return state.tournamentPlayers
      .filter(tp => tp.player_id === playerId)
      .map(tp => state.tournaments.find(t => t.id === tp.tournament_id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
  }, [playerId, state.tournamentPlayers, state.tournaments]);

  const [selectedTournamentId, setSelectedTournamentId] = useState<string | 'career'>(
    playerTournaments.length > 0 ? playerTournaments[0].id : 'career'
  );

  if (!player) {
    return (
      <div className="space-y-4">
        <Link to="/players" className="inline-flex items-center gap-1 text-accent hover:underline text-sm">
          <ChevronLeft size={16} /> Back to Players
        </Link>
        <EmptyState icon={Users} title="Player Not Found" description="The player you are looking for does not exist." />
      </div>
    );
  }

  const tournament = selectedTournamentId === 'career'
    ? undefined
    : state.tournaments.find(t => t.id === selectedTournamentId);

  const allCompletedMatches = getCompletedPlayerMatches(player.id, state.matches);

  const filteredMatches = selectedTournamentId === 'career'
    ? allCompletedMatches
    : allCompletedMatches.filter(m => m.tournament_id === selectedTournamentId);

  const stats = computePlayerStats(player.id, state.matches, selectedTournamentId === 'career' ? undefined : selectedTournamentId, tournament);

  // Clean sheets = matches where goals_against = 0
  const cleanSheets = filteredMatches.filter(m => {
    const isP1 = m.player1_id === player.id;
    const ga = isP1 ? (m.player2_score ?? 0) : (m.player1_score ?? 0);
    return ga === 0;
  }).length;

  const getOpponent = (match: typeof filteredMatches[0]) => {
    const oppId = match.player1_id === player.id ? match.player2_id : match.player1_id;
    return state.players.find(p => p.id === oppId);
  };

  const getScore = (match: typeof filteredMatches[0]) => {
    if (match.player1_id === player.id) {
      return `${match.player1_score ?? 0} – ${match.player2_score ?? 0}`;
    }
    return `${match.player2_score ?? 0} – ${match.player1_score ?? 0}`;
  };

  const recentMatches = [...filteredMatches].reverse().slice(0, 5);

  const initials = player.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const statItems = [
    { label: 'Played', value: stats.played },
    { label: 'Wins', value: stats.wins, color: 'text-green-400' },
    { label: 'Draws', value: stats.draws, color: 'text-amber-400' },
    { label: 'Losses', value: stats.losses, color: 'text-red-400' },
    { label: 'Win %', value: `${stats.win_rate.toFixed(1)}%` },
    { label: 'Points', value: stats.points, color: 'text-accent' },
    { label: 'GF', value: stats.goals_for },
    { label: 'GA', value: stats.goals_against },
    { label: 'GD', value: formatGD(stats.goal_diff), color: stats.goal_diff >= 0 ? 'text-green-400' : 'text-red-400' },
    { label: 'Goals/Game', value: stats.goals_per_match.toFixed(2) },
    { label: 'Conc./Game', value: stats.goals_conceded_per_match.toFixed(2) },
    { label: 'Clean Sheets', value: cleanSheets },
  ];

  const streakItems = [
    { label: 'Current Win Streak', value: stats.current_win_streak },
    { label: 'Longest Win Streak', value: stats.longest_win_streak },
    { label: 'Current Unbeaten', value: stats.current_unbeaten_streak },
    { label: 'Longest Unbeaten', value: stats.longest_unbeaten_streak },
    { label: 'Current Losing Streak', value: stats.current_losing_streak },
    { label: 'Longest Losing Streak', value: stats.longest_losing_streak },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <Link to="/players" className="inline-flex items-center gap-1 text-accent hover:underline text-sm">
        <ChevronLeft size={16} /> Back to Players
      </Link>

      {/* Player Header */}
      <div className="card p-6 flex items-center gap-6 flex-wrap">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-display text-2xl font-bold border-2 flex-shrink-0"
          style={{ background: 'var(--color-accent-glow)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
        >
          {initials}
        </div>
        <div>
          <h1 className="font-display text-3xl mb-1">{player.name}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-muted text-sm">@{player.efootball_username}</span>
            <Badge variant="default">{player.platform}</Badge>
            {player.team && <span className="text-muted text-sm">{player.team}</span>}
            <Badge variant={player.status}>{player.status}</Badge>
          </div>
          {player.notes && <p className="text-muted text-sm mt-2">{player.notes}</p>}
        </div>
      </div>

      {/* Tournament Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          className={`btn text-sm ${selectedTournamentId === 'career' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setSelectedTournamentId('career')}
        >
          Career
        </button>
        {playerTournaments.map(t => (
          <button
            key={t.id}
            className={`btn text-sm ${selectedTournamentId === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setSelectedTournamentId(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {statItems.map(item => (
          <div key={item.label} className="card p-3 text-center">
            <div className="text-xs text-muted mb-1 uppercase tracking-wide">{item.label}</div>
            <div className={`text-xl font-bold font-display ${item.color || 'text-text'}`}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {/* Form */}
          <div className="card p-4">
            <h2 className="font-display text-lg mb-3">Recent Form</h2>
            <div className="flex gap-2 flex-wrap">
              {stats.form.length === 0 ? (
                <span className="text-muted text-sm">No recent matches</span>
              ) : (
                stats.form.map((r, i) => (
                  <div key={i} className={`form-dot form-dot-${r}`}>{r}</div>
                ))
              )}
            </div>
          </div>

          {/* Streaks */}
          <div className="card p-4">
            <h2 className="font-display text-lg mb-3">Streaks</h2>
            <div className="space-y-2">
              {streakItems.map(s => (
                <div key={s.label} className="flex justify-between items-center text-sm">
                  <span className="text-muted">{s.label}</span>
                  <span className="font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-4 border-b border-border-light">
              <h2 className="font-display text-lg">Match History</h2>
            </div>
            {filteredMatches.length === 0 ? (
              <div className="p-8 text-center text-muted">No matches played yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Opponent</th>
                      <th>Score</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...filteredMatches].reverse().map(m => {
                      const opponent = getOpponent(m);
                      const result = getMatchResult(m, player.id);
                      return (
                        <tr key={m.id}>
                          <td className="text-muted text-sm">
                            {m.scheduled_date ? new Date(m.scheduled_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td>
                            {opponent ? (
                              <Link to={`/players/${opponent.id}`} className="hover:text-accent transition-colors">
                                {opponent.name}
                              </Link>
                            ) : '—'}
                          </td>
                          <td className="font-mono font-bold text-sm">{getScore(m)}</td>
                          <td>
                            {result && (
                              <span className={`px-2 py-0.5 text-xs font-bold rounded badge-${result.toLowerCase()}`}>
                                {result}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent form matches preview */}
      {recentMatches.length > 0 && (
        <div className="card p-4">
          <h2 className="font-display text-lg mb-3">Last 5 Matches</h2>
          <div className="space-y-2">
            {recentMatches.map(m => {
              const opponent = getOpponent(m);
              const result = getMatchResult(m, player.id);
              return (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    {result && <div className={`form-dot form-dot-${result}`}>{result}</div>}
                    <span className="text-muted">vs {opponent?.name || '—'}</span>
                  </div>
                  <span className="font-mono font-bold">{getScore(m)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerProfile;
