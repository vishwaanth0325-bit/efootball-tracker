import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Gamepad2, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { computeStandings } from '../lib/calculations';
import { advanceKnockoutWinner } from '../lib/tournamentEngine';
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
  const navigate = useNavigate();
  const { state, updateMatch, updateTournament, setActiveTournament, refreshData } = useApp();
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
        {state.loadError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <div className="font-semibold text-red-400 text-sm">Database connection issue</div>
                <div className="text-xs text-text-muted">{state.loadError}</div>
              </div>
            </div>
            <button className="btn btn-secondary text-xs" onClick={() => refreshData()}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
            </button>
          </div>
        )}

        <h1 className="font-display text-3xl">Dashboard</h1>
        <EmptyState
          icon={Trophy}
          title="No Active Tournament"
          description="Create a tournament and set it as active to see the dashboard."
          action={{ label: 'Go to Tournaments', onClick: () => navigate('/tournaments') }}
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

  const handleSaveScore = async (
    p1Score: number,
    p2Score: number,
    winnerId?: string,
    penaltyP1?: number,
    penaltyP2?: number
  ) => {
    if (!selectedMatch) return;
    const computedWinnerId =
      winnerId ||
      (p1Score > p2Score
        ? selectedMatch.player1_id
        : p2Score > p1Score
        ? selectedMatch.player2_id
        : undefined);

    const updatedMatch: Match = {
      ...selectedMatch,
      status: 'completed',
      player1_score: p1Score,
      player2_score: p2Score,
      winner_id: computedWinnerId,
      penalty_player1_score: penaltyP1,
      penalty_player2_score: penaltyP2,
      updated_at: new Date().toISOString(),
    };

    const success = await updateMatch(updatedMatch);
    if (success) {
      // Advance winner in bracket if this is a knockout match with a downstream slot
      if (computedWinnerId && selectedMatch.next_match_id) {
        const advanced = advanceKnockoutWinner(state.matches, selectedMatch.id, computedWinnerId);
        const downstream = advanced.find(m => m.id === selectedMatch.next_match_id);
        if (downstream) {
          await updateMatch(downstream);
        }
      }

      // Crown champion if this was the Final
      if (selectedMatch.round === 'Final' && computedWinnerId && activeTournament) {
        await updateTournament({
          ...activeTournament,
          status: 'completed',
          champion_id: computedWinnerId,
        });
      }

      showToast('Result saved!', 'success');
      setSelectedMatch(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {state.loadError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <div className="font-semibold text-red-400 text-sm">Database connection issue</div>
              <div className="text-xs text-text-muted">{state.loadError}</div>
            </div>
          </div>
          <button className="btn btn-secondary text-xs" onClick={() => refreshData()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
          </button>
        </div>
      )}

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
