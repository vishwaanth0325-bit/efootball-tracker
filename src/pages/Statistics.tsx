import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { computePlayerStats, getHeadToHead } from '../lib/calculations';
import { HeadToHead } from '../components/statistics/HeadToHead';
import { Select } from '../components/ui/Select';
import { Goal, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const Statistics: React.FC = () => {
  const { state } = useApp();
  const [tournamentFilter, setTournamentFilter] = useState<string>(state.activeTournamentId || 'all');
  const [h2hPlayer1, setH2hPlayer1] = useState('');
  const [h2hPlayer2, setH2hPlayer2] = useState('');

  const statsData = useMemo(() => {
    const tournament = tournamentFilter === 'all' ? undefined : state.tournaments.find(t => t.id === tournamentFilter);
    const matches = tournamentFilter === 'all' 
      ? state.matches.filter(m => m.status === 'completed')
      : state.matches.filter(m => m.status === 'completed' && m.tournament_id === tournamentFilter);

    const playersToConsider = tournamentFilter === 'all'
      ? state.players
      : state.tournamentPlayers
          .filter(tp => tp.tournament_id === tournamentFilter)
          .map(tp => state.players.find(p => p.id === tp.player_id)!)
          .filter(Boolean);

    const playerStats = playersToConsider.map(p => ({
      player: p,
      stats: computePlayerStats(p.id, matches, tournamentFilter === 'all' ? undefined : tournamentFilter, tournament)
    }));

    return { matches, playerStats };
  }, [state, tournamentFilter]);

  const { playerStats } = statsData;

  const topScorer = [...playerStats].sort((a, b) => b.stats.goals_for - a.stats.goals_for)[0];
  const mostWins = [...playerStats].sort((a, b) => b.stats.wins - a.stats.wins)[0];
  const mostPoints = [...playerStats].sort((a, b) => b.stats.points - a.stats.points)[0];
  const bestWinRate = [...playerStats].filter(p => p.stats.played > 0).sort((a, b) => b.stats.win_rate - a.stats.win_rate)[0];
  const bestGD = [...playerStats].sort((a, b) => b.stats.goal_diff - a.stats.goal_diff)[0];

  const chartData = playerStats
    .sort((a, b) => b.stats.points - a.stats.points)
    .slice(0, 8)
    .map(p => ({
      name: p.player.name.substring(0, 10),
      goals: p.stats.goals_for,
      winRate: p.stats.win_rate,
      points: p.stats.points
    }));

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-display text-3xl">Statistics</h1>
        <Select 
          id="statsTournamentFilter"
          value={tournamentFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTournamentFilter(e.target.value)} 
          className="w-full sm:w-64"
          options={[
            { value: 'all', label: 'All-Time Career' },
            ...state.tournaments.map(t => ({ value: t.id, label: t.name }))
          ]}
        />
      </div>

      {playerStats.length === 0 ? (
        <div className="card p-12 text-center text-text-muted">No data available for the selected filters.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="card text-center p-4">
              <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">Most Points</div>
              <div className="font-bold truncate">{mostPoints?.player.name || '-'}</div>
              <div className="text-2xl font-display text-accent">{mostPoints?.stats.points || 0}</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">Most Wins</div>
              <div className="font-bold truncate">{mostWins?.player.name || '-'}</div>
              <div className="text-2xl font-display text-green-400">{mostWins?.stats.wins || 0}</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">Highest Win %</div>
              <div className="font-bold truncate">{bestWinRate?.player.name || '-'}</div>
              <div className="text-2xl font-display text-blue-400">{bestWinRate?.stats.win_rate.toFixed(1) || 0}%</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">Top Scorer</div>
              <div className="font-bold truncate">{topScorer?.player.name || '-'}</div>
              <div className="text-2xl font-display text-yellow-400">{topScorer?.stats.goals_for || 0}</div>
            </div>
            <div className="card text-center p-4">
              <div className="text-xs text-text-muted mb-2 uppercase tracking-wider">Best GD</div>
              <div className="font-bold truncate">{bestGD?.player.name || '-'}</div>
              <div className="text-2xl font-display text-purple-400">{(bestGD?.stats.goal_diff || 0) > 0 ? '+' : ''}{bestGD?.stats.goal_diff || 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4">
              <h3 className="font-display text-lg mb-4 flex items-center gap-2"><Goal className="w-5 h-5 text-accent"/> Goals Scored (Top 8)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{fontSize: 12}} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px'}} />
                    <Bar dataKey="goals" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="card p-4">
              <h3 className="font-display text-lg mb-4 flex items-center gap-2"><Activity className="w-5 h-5 text-accent"/> Win Rate % (Top 8)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                    <XAxis dataKey="name" stroke="#888" tick={{fontSize: 12}} />
                    <YAxis stroke="#888" />
                    <Tooltip contentStyle={{backgroundColor: '#1a1a1a', border: 'none', borderRadius: '8px'}} />
                    <Bar dataKey="winRate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display text-2xl mb-6 border-b border-border-light pb-4">Head-to-Head Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Select 
                id="h2hPlayer1"
                value={h2hPlayer1} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setH2hPlayer1(e.target.value)}
                options={[
                  { value: '', label: 'Select Player 1' },
                  ...state.players.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
              <Select 
                id="h2hPlayer2"
                value={h2hPlayer2} 
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setH2hPlayer2(e.target.value)}
                options={[
                  { value: '', label: 'Select Player 2' },
                  ...state.players.map(p => ({ value: p.id, label: p.name }))
                ]}
              />
            </div>

            {h2hPlayer1 && h2hPlayer2 && h2hPlayer1 !== h2hPlayer2 ? (
              <HeadToHead 
                player1={state.players.find(p => p.id === h2hPlayer1)!} 
                player2={state.players.find(p => p.id === h2hPlayer2)!} 
                record={getHeadToHead(h2hPlayer1, h2hPlayer2, state.matches, tournamentFilter === 'all' ? undefined : tournamentFilter)}
              />
            ) : (
              <div className="text-center text-text-muted py-8 bg-surface-hover rounded-lg border border-border-light">
                Select two different players to view their head-to-head record.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Statistics;
