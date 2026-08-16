import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { generateFixtures, countExpectedMatches } from '../lib/fixtures';
import { computeStandings } from '../lib/calculations';
import type { Match } from '../lib/types';
import { LeaderboardTable } from '../components/dashboard/LeaderboardTable';
import { UpcomingMatches } from '../components/dashboard/UpcomingMatches';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { ChevronLeft, Users, Calendar, Trophy, Plus, X } from 'lucide-react';

type Tab = 'overview' | 'players' | 'fixtures' | 'standings';

const TournamentDetails: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const { state, addTournamentPlayer, removeTournamentPlayer, addMatches, updateMatch, deleteMatch } = useApp();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [playerToAdd, setPlayerToAdd] = useState('');
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(false);
  const [showGenerateFixtures, setShowGenerateFixtures] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);

  const tournament = state.tournaments.find(t => t.id === tournamentId);
  
  if (!tournament) {
    return <EmptyState title="Tournament Not Found" icon={Trophy} />;
  }

  const tournamentPlayers = state.tournamentPlayers
    .filter(tp => tp.tournament_id === tournament.id)
    .map(tp => state.players.find(p => p.id === tp.player_id)!)
    .filter(Boolean);

  const matches = state.matches.filter(m => m.tournament_id === tournament.id);
  const upcomingMatches = matches.filter(m => m.status === 'upcoming').sort((a,b) => new Date(a.scheduled_date||0).getTime() - new Date(b.scheduled_date||0).getTime());
  const completedMatches = matches.filter(m => m.status === 'completed');
  
  const standings = computeStandings(tournament.id, tournamentPlayers, matches, tournament);
  
  const availablePlayers = state.players.filter(p => !tournamentPlayers.find(tp => tp.id === p.id) && p.status === 'active');

  const handleAddPlayer = () => {
    if (playerToAdd) {
      addTournamentPlayer(tournament.id, playerToAdd);
      showToast('Player added to tournament', 'success');
      setPlayerToAdd('');
      setShowAddPlayer(false);
    }
  };

  const handleGenerateFixtures = () => {
    const newFixtures = generateFixtures(tournament.id, tournamentPlayers.map(p => p.id), doubleRoundRobin, matches);
    addMatches(newFixtures as any); // Type cast due to GeneratedFixture not having id/created_at
    showToast(`Generated ${newFixtures.length} fixtures`, 'success');
    setShowGenerateFixtures(false);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center py-6">
          <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{tournamentPlayers.length}</div>
          <div className="text-text-muted">Players</div>
        </div>
        <div className="card text-center py-6">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{completedMatches.length}</div>
          <div className="text-text-muted">Matches Played</div>
        </div>
        <div className="card text-center py-6">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{upcomingMatches.length}</div>
          <div className="text-text-muted">Matches Remaining</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-xl">Top 5 Standings</h3>
            <button className="text-accent text-sm hover:underline" onClick={() => setActiveTab('standings')}>View All</button>
          </div>
          <LeaderboardTable rows={standings} limit={5} />
        </div>
        <div className="card p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-xl">Next Matches</h3>
            <button className="text-accent text-sm hover:underline" onClick={() => setActiveTab('fixtures')}>View All</button>
          </div>
          <UpcomingMatches 
            matches={upcomingMatches} 
            players={tournamentPlayers}
            limit={5}
          />
        </div>
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-display text-xl">Tournament Participants</h3>
        <button className="btn btn-primary" onClick={() => setShowAddPlayer(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Player
        </button>
      </div>

      {tournamentPlayers.length === 0 ? (
        <EmptyState title="No Players" description="Add players to start this tournament." icon={Users} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournamentPlayers.map(p => (
            <div key={p.id} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-hover flex justify-center items-center font-display border border-accent">
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-text-muted">{p.team || 'No Team'}</div>
                </div>
              </div>
              <button 
                className="btn btn-ghost text-red-500 hover:bg-red-500/10 p-2"
                onClick={() => setPlayerToRemove(p.id)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card mt-8 p-6 bg-surface-hover border border-border-light">
        <h3 className="font-display text-lg mb-2">Generate Fixtures</h3>
        <p className="text-sm text-text-muted mb-4">
          Expected matches for {tournamentPlayers.length} players: {countExpectedMatches(tournamentPlayers.length, doubleRoundRobin)}
        </p>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded bg-surface border-border-light text-accent"
              checked={doubleRoundRobin}
              onChange={e => setDoubleRoundRobin(e.target.checked)}
            />
            Double Round Robin (Home & Away)
          </label>
        </div>
        <button 
          className="btn btn-secondary"
          onClick={() => setShowGenerateFixtures(true)}
          disabled={tournamentPlayers.length < 2}
        >
          Generate Schedule
        </button>
      </div>
    </div>
  );

  const renderFixtures = () => {
    const rounds = Array.from(new Set(matches.map(m => m.round || ''))).sort((a,b) => a.localeCompare(b));
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-xl">Fixtures</h3>
        </div>
        
        {rounds.length === 0 ? (
          <EmptyState title="No Fixtures" description="Generate fixtures in the Players tab." icon={Calendar} />
        ) : (
          <div className="space-y-8">
            {rounds.map(round => (
              <div key={round} className="space-y-3">
                <h4 className="font-display text-lg border-b border-border-light pb-1">{round || 'Unassigned Round'}</h4>
                <div className="grid gap-3">
                  {matches.filter(m => (m.round || '') === round).map(match => {
                    const p1 = tournamentPlayers.find(p => p.id === match.player1_id);
                    const p2 = tournamentPlayers.find(p => p.id === match.player2_id);
                    return (
                      <div key={match.id} className="card p-3 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center justify-between w-full sm:w-2/3">
                          <div className="w-2/5 text-right font-bold truncate">{p1?.name}</div>
                          <div className="w-1/5 text-center">
                            {match.status === 'completed' ? (
                              <span className="font-mono font-bold bg-surface px-3 py-1 rounded">
                                {match.player1_score} - {match.player2_score}
                              </span>
                            ) : (
                              <span className="text-text-muted text-sm">vs</span>
                            )}
                          </div>
                          <div className="w-2/5 text-left font-bold truncate">{p2?.name}</div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-ghost text-xs py-1 px-2"
                            onClick={() => setSelectedMatch(match)}
                          >
                            {match.status === 'completed' ? 'Edit' : 'Enter Score'}
                          </button>
                          <button 
                            className="btn btn-ghost text-red-500 text-xs py-1 px-2"
                            onClick={() => setMatchToDelete(match.id)}
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStandings = () => (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <LeaderboardTable rows={standings} />
      </div>
      <div className="text-sm text-text-muted">
        Points System: Win = {tournament.points_win}pts, 
        Draw = {tournament.points_draw}pts, 
        Loss = {tournament.points_loss}pts.
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <Link to="/tournaments" className="inline-flex items-center text-accent hover:underline mb-2">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tournaments
      </Link>
      
      <div className="card p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="font-display text-3xl mb-2">{tournament.name}</h1>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-text-muted">Season {tournament.season}</span>
              <Badge variant={tournament.status === 'ongoing' ? 'ongoing' : 'default'}>{tournament.status}</Badge>
              <Badge variant="default">{tournament.format}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border-light overflow-x-auto pb-2">
        {['overview', 'players', 'fixtures', 'standings'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium capitalize rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab 
                ? 'bg-surface-hover text-text border-b-2 border-accent' 
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
            onClick={() => setActiveTab(tab as Tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'players' && renderPlayers()}
        {activeTab === 'fixtures' && renderFixtures()}
        {activeTab === 'standings' && renderStandings()}
      </div>

      <Modal isOpen={showAddPlayer} onClose={() => setShowAddPlayer(false)} title="Add Player to Tournament">
        <div className="space-y-4">
          <Select 
            id="playerToAddSelect"
            value={playerToAdd} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlayerToAdd(e.target.value)}
            options={[
              { value: '', label: 'Select a player...' },
              ...availablePlayers.map(p => ({ value: p.id, label: `${p.name} (@${p.efootball_username})` }))
            ]}
          />
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setShowAddPlayer(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddPlayer} disabled={!playerToAdd}>Add</button>
          </div>
        </div>
      </Modal>

      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={state.players.find(p => p.id === selectedMatch.player1_id)!}
          player2={state.players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={(p1s, p2s) => {
            updateMatch({ ...selectedMatch, status: 'completed', player1_score: p1s, player2_score: p2s, updated_at: new Date().toISOString() });
            showToast('Score saved', 'success');
            setSelectedMatch(null);
          }}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <ConfirmDialog
        isOpen={showGenerateFixtures}
        onCancel={() => setShowGenerateFixtures(false)}
        onConfirm={handleGenerateFixtures}
        title="Generate Fixtures"
        message={matches.length > 0 ? "Warning: This tournament already has fixtures. Generating new ones might cause duplicates. Continue?" : `Generate ${countExpectedMatches(tournamentPlayers.length, doubleRoundRobin)} matches?`}
        confirmLabel="Generate"
      />

      <ConfirmDialog
        isOpen={!!matchToDelete}
        onCancel={() => setMatchToDelete(null)}
        onConfirm={() => {
          if (matchToDelete) {
            deleteMatch(matchToDelete);
            showToast('Match deleted', 'success');
            setMatchToDelete(null);
          }
        }}
        title="Delete Match"
        message="Are you sure you want to delete this match?"
        confirmLabel="Delete"
        danger={true}
      />

      <ConfirmDialog
        isOpen={!!playerToRemove}
        onCancel={() => setPlayerToRemove(null)}
        onConfirm={() => {
          if (playerToRemove) {
            removeTournamentPlayer(tournament.id, playerToRemove);
            showToast('Player removed', 'success');
            setPlayerToRemove(null);
          }
        }}
        title="Remove Player"
        message="Remove this player from the tournament? Their matches will remain but standings might be affected."
        confirmLabel="Remove"
        danger={true}
      />
    </div>
  );
};

export default TournamentDetails;
