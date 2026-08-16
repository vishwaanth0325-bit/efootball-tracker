import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Match } from '../lib/types';
import { MatchCard } from '../components/matches/MatchCard';
import { MatchForm } from '../components/matches/MatchForm';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Search, Trophy } from 'lucide-react';

const Matches: React.FC = () => {
  const { state, addMatch, updateMatch, deleteMatch } = useApp();
  const { showToast } = useToast();

  const [tournamentFilter, setTournamentFilter] = useState<string>(state.activeTournamentId || 'all');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMatches = useMemo(() => {
    return state.matches.filter(m => {
      const p1 = state.players.find(p => p.id === m.player1_id);
      const p2 = state.players.find(p => p.id === m.player2_id);

      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (p1?.name.toLowerCase().includes(searchLower)) ||
        (p2?.name.toLowerCase().includes(searchLower)) ||
        (m.round && m.round.toLowerCase().includes(searchLower));

      const matchesTournament = tournamentFilter === 'all' || m.tournament_id === tournamentFilter;

      return matchesSearch && matchesTournament;
    }).sort((a, b) => {
      if (a.status === 'upcoming' && b.status !== 'upcoming') return -1;
      if (a.status !== 'upcoming' && b.status === 'upcoming') return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [state.matches, state.players, search, tournamentFilter]);

  const stats = useMemo(() => {
    let completed = 0;
    let upcoming = 0;
    filteredMatches.forEach(m => {
      if (m.status === 'completed') completed++;
      else upcoming++;
    });
    return { total: filteredMatches.length, completed, upcoming };
  }, [filteredMatches]);

  const handleSaveMatch = async (data: Partial<Match>) => {
    setIsSubmitting(true);
    try {
      if (editingMatch) {
        const success = await updateMatch({ ...editingMatch, ...data } as Match);
        if (success) {
          showToast('Match updated', 'success');
          setShowForm(false);
          setEditingMatch(null);
        }
      } else {
        const created = await addMatch(data as any);
        if (created) {
          showToast('Match added', 'success');
          setShowForm(false);
          setEditingMatch(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveScore = async (
    p1Score: number,
    p2Score: number,
    winnerId?: string,
    penaltyP1?: number,
    penaltyP2?: number
  ) => {
    if (selectedMatch) {
      setIsSubmitting(true);
      try {
        const success = await updateMatch({
          ...selectedMatch,
          status: 'completed',
          player1_score: p1Score,
          player2_score: p2Score,
          winner_id: winnerId,
          penalty_player1_score: penaltyP1,
          penalty_player2_score: penaltyP2,
          updated_at: new Date().toISOString(),
        });
        if (success) {
          showToast('Score saved', 'success');
          setSelectedMatch(null);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteMatch = async () => {
    if (deletingId) {
      setIsSubmitting(true);
      try {
        const success = await deleteMatch(deletingId);
        if (success) {
          showToast('Match deleted', 'success');
          setDeletingId(null);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (state.loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-display text-3xl">All Matches</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={isSubmitting}>
          <Plus className="w-4 h-4 mr-2" />
          Add Match
        </button>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        <Select
          id="tournamentFilter"
          value={tournamentFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTournamentFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Tournaments' },
            ...state.tournaments.map(t => ({ value: t.id, label: t.name })),
          ]}
        />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            id="searchMatches"
            className="pl-9"
            placeholder="Search teams, players, or rounds..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6 text-xs text-text-muted">
        <span>Total: <strong className="text-text">{stats.total}</strong></span>
        <span>Completed: <strong className="text-emerald-400">{stats.completed}</strong></span>
        <span>Upcoming: <strong className="text-accent">{stats.upcoming}</strong></span>
      </div>

      {filteredMatches.length === 0 ? (
        <EmptyState title="No Matches Found" icon={Trophy} />
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
        onConfirm={handleDeleteMatch}
        title="Delete Match"
        message="Are you sure you want to delete this match?"
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Matches;
