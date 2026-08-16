import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Match } from '../lib/types';
import { MatchCard } from '../components/matches/MatchCard';
import { MatchForm } from '../components/matches/MatchForm';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Search, Calendar as CalendarIcon } from 'lucide-react';

const Matches: React.FC = () => {
  const { state, addMatch, updateMatch, deleteMatch } = useApp();
  const { showToast } = useToast();

  const [tournamentFilter, setTournamentFilter] = useState<string>(state.activeTournamentId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      const p1 = state.players.find(p => p.id === m.player1_id);
      const p2 = state.players.find(p => p.id === m.player2_id);
      
      const searchLower = search.toLowerCase();
      const matchesSearch = !search || 
        (p1?.name.toLowerCase().includes(searchLower)) || 
        (p2?.name.toLowerCase().includes(searchLower));
        
      const matchesTournament = tournamentFilter === 'all' || m.tournament_id === tournamentFilter;
      const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
      
      return matchesSearch && matchesTournament && matchesStatus;
    }).sort((a, b) => {
      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
      if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
      
      if (a.status === 'upcoming') {
        return new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime();
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [state.matches, state.players, search, tournamentFilter, statusFilter]);

  const stats = useMemo(() => {
    let t = 0, c = 0, u = 0, p = 0;
    filteredMatches.forEach(m => {
      t++;
      if (m.status === 'completed') c++;
      else if (m.status === 'upcoming') u++;
      else if (m.status === 'postponed') p++;
    });
    return { total: t, completed: c, upcoming: u, postponed: p };
  }, [filteredMatches]);

  const handleSaveMatch = (data: Partial<Match>) => {
    if (editingMatch) {
      updateMatch({ ...editingMatch, ...data } as Match);
      showToast('Match updated', 'success');
    } else {
      addMatch(data as any);
      showToast('Match added', 'success');
    }
    setShowForm(false);
    setEditingMatch(null);
  };

  const handleSaveScore = (p1Score: number, p2Score: number) => {
    if (selectedMatch) {
      updateMatch({
        ...selectedMatch,
        status: 'completed',
        player1_score: p1Score,
        player2_score: p2Score,
        updated_at: new Date().toISOString()
      });
      showToast('Score saved', 'success');
      setSelectedMatch(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-display text-3xl">Matches</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Match
        </button>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <Select 
          id="tournamentFilter"
          value={tournamentFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTournamentFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Tournaments' },
            ...state.tournaments.map(t => ({ value: t.id, label: t.name }))
          ]}
        />
        <Select 
          id="statusFilter"
          value={statusFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Completed' },
            { value: 'postponed', label: 'Postponed' }
          ]}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input 
            id="searchMatches"
            className="pl-9" 
            placeholder="Search players..." 
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 mb-4 text-sm">
        <span className="text-text-muted">Total: <strong className="text-text">{stats.total}</strong></span>
        <span className="text-text-muted">Completed: <strong className="text-text">{stats.completed}</strong></span>
        <span className="text-text-muted">Upcoming: <strong className="text-text">{stats.upcoming}</strong></span>
      </div>

      {filteredMatches.length === 0 ? (
        <EmptyState title="No Matches Found" icon={CalendarIcon} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMatches.map(match => (
            <MatchCard
              key={match.id}
              match={match}
              player1={state.players.find(p => p.id === match.player1_id)!}
              player2={state.players.find(p => p.id === match.player2_id)!}
              onEnterScore={() => setSelectedMatch(match)}
              onDelete={() => setDeletingId(match.id)}
            />
          ))}
        </div>
      )}

      {(showForm || !!editingMatch) && (
        <MatchForm 
          existingMatch={editingMatch || undefined}
          tournamentId={editingMatch ? editingMatch.tournament_id : state.activeTournamentId || ''}
          players={state.players}
          onSubmit={handleSaveMatch}
          onClose={() => { setShowForm(false); setEditingMatch(null); }}
        />
      )}

      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={state.players.find(p => p.id === selectedMatch.player1_id)!}
          player2={state.players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={handleSaveScore}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) {
            deleteMatch(deletingId);
            showToast('Match deleted', 'success');
            setDeletingId(null);
          }
        }}
        title="Delete Match"
        message="Are you sure you want to delete this match?"
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Matches;
