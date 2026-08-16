import React, { useState } from 'react';
import { Trophy, Users, Gamepad2, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { computeStandings } from '../lib/calculations';
import type { Match } from '../lib/types';
import { StatsCard } from '../components/dashboard/StatsCard';
import { LeaderboardTable } from '../components/dashboard/LeaderboardTable';
import { UpcomingMatches } from '../components/dashboard/UpcomingMatches';
import { RecentResults } from '../components/dashboard/RecentResults';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { Badge } from '../components/ui/Badge';

const Dashboard: React.FC = () => {
  const { state, updateMatch, setActiveTournament } = useApp();
  const { showToast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  if (state.loading) {
    return <LoadingSpinner fullPage />;
  }

  const activeTournamentId = state.activeTournamentId;
  const activeTournament = state.tournaments.find(t => t.id === activeTournamentId);

  if (!activeTournament || !activeTournamentId) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <h1 className="font-display text-3xl">Dashboard</h1>
        <EmptyState
          icon={Trophy}
          title="No Active Tournament"
          description="Create a tournament and set it as active to see the dashboard."
          action={{ label: 'Go to Tournaments', onClick: () => window.location.href = '/tournaments' }}
        />
        {state.tournaments.length > 0 && (
          <div className="card p-4">
            <p className="text-muted text-sm mb-3">Select a tournament to activate:</p>
            <div className="flex flex-wrap gap-2">
              {state.tournaments.map(t => (
                <button
                  key={t.id}
                  className="btn btn-secondary"
                  onClick={() => setActiveTournament(t.id)}
                >
                  {t.name} — {t.season}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const tournamentPlayers = state.tournamentPlayers
    .filter(tp => tp.tournament_id === activeTournamentId)
    .map(tp => state.players.find(p => p.id === tp.player_id)!)
    .filter(Boolean);

   const activeMatches = state.matches.filter(m => m.tournament_id === activeTournamentId);
  const completedMatches = activeMatches.filter(m => m.status === 'completed');
  const upcomingMatches = activeMatches.filter(m => m.status === 'upcoming');

  const standings = computeStandings(activeTournamentId, tournamentPlayers, activeMatches, activeTournament);
  const totalMatches = activeMatches.length;
  const completionPct = totalMatches === 0 ? 0 : Math.round((completedMatches.length / totalMatches) * 100);

  const handleSaveScore = (p1Score: number, p2Score: number) => {
    if (!selectedMatch) return;
    updateMatch({
      ...selectedMatch,
      status: 'completed',
      player1_score: p1Score,
      player2_score: p2Score,
      updated_at: new Date().toISOString(),
    });
    showToast('Result saved!');
    setSelectedMatch(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl">{activeTournament.name}</h1>
            <Badge variant={activeTournament.status}>{activeTournament.status}</Badge>
          </div>
          <p className="text-muted mt-1">{activeTournament.season}</p>
        </div>

        {/* Quick result entry */}
        {upcomingMatches.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              className="form-input w-48 text-sm"
              style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}
              value=""
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const id = e.target.value;
                if (id) {
                  const m = upcomingMatches.find(x => x.id === id);
                  if (m) setSelectedMatch(m);
                  e.target.value = '';
                }
              }}
            >
              <option value="">Enter Result...</option>
              {upcomingMatches.slice(0, 20).map(m => {
                const p1 = state.players.find(p => p.id === m.player1_id);
                const p2 = state.players.find(p => p.id === m.player2_id);
                return (
                  <option key={m.id} value={m.id}>
                    {p1?.name} vs {p2?.name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="Players" value={tournamentPlayers.length} icon={Users} />
        <StatsCard label="Matches Played" value={completedMatches.length} icon={Gamepad2} color="green" />
        <StatsCard label="Remaining" value={upcomingMatches.length} icon={Clock} color="amber" />
        <StatsCard label="Completion" value={`${completionPct}%`} icon={Trophy} color="accent" />
      </div>

      {/* Leaderboard + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card p-0">
            <div className="p-4 border-b border-border-light">
              <h2 className="font-display text-xl">Standings</h2>
            </div>
            <LeaderboardTable rows={standings} />
          </div>
        </div>
        <div className="space-y-6">
          <UpcomingMatches matches={upcomingMatches} players={state.players} limit={5} />
          <RecentResults
            matches={[...completedMatches].sort((a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )}
            players={state.players}
            limit={5}
          />
        </div>
      </div>

      {/* Score Entry Modal */}
      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={state.players.find(p => p.id === selectedMatch.player1_id)!}
          player2={state.players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={handleSaveScore}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
