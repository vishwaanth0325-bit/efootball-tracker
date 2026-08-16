import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Tournament } from '../lib/types';
import { TournamentCard } from '../components/tournaments/TournamentCard';
import { TournamentForm } from '../components/tournaments/TournamentForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { generateFixtures } from '../lib/fixtures';
import { Plus, Trophy } from 'lucide-react';

const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    addTournament,
    updateTournament,
    deleteTournament,
    setActiveTournament,
    addMatches,
  } = useApp();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredTournaments = useMemo(() => {
    if (statusFilter === 'all') return state.tournaments;
    return state.tournaments.filter(t => t.status === statusFilter);
  }, [state.tournaments, statusFilter]);

  const handleSaveTournament = (
    data: Omit<Tournament, 'id' | 'created_at'>,
    selectedPlayerIds?: string[],
    autoGenerateFixtures?: boolean
  ) => {
    if (editingTournament) {
      updateTournament({ ...editingTournament, ...data });
      showToast('Tournament updated', 'success');
    } else {
      const newTournament = addTournament(data, selectedPlayerIds);
      if (!state.activeTournamentId) {
        setActiveTournament(newTournament.id);
      }

      if (autoGenerateFixtures && selectedPlayerIds && selectedPlayerIds.length >= 2) {
        const fixtures = generateFixtures(
          newTournament.id,
          selectedPlayerIds,
          false,
          [],
          newTournament.format
        );
        if (fixtures.length > 0) {
          addMatches(fixtures as any);
        }
      }

      showToast('Tournament created successfully', 'success');
    }
    setShowForm(false);
    setEditingTournament(null);
  };

  const handleDelete = () => {
    if (deletingId) {
      deleteTournament(deletingId);
      showToast('Tournament deleted', 'success');
      setDeletingId(null);
    }
  };

  const tToDelete = state.tournaments.find(t => t.id === deletingId);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-display text-3xl">Tournaments</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Tournament
        </button>
      </div>

      <div className="flex gap-2 border-b border-surface pb-2">
        {['all', 'upcoming', 'ongoing', 'completed'].map(status => (
          <button
            key={status}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${
              statusFilter === status
                ? 'bg-surface-light text-text border-b-2 border-accent'
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </button>
        ))}
      </div>

      {filteredTournaments.length === 0 ? (
        <EmptyState
          title="No Tournaments Found"
          description="Create a new tournament to get started."
          icon={Trophy}
          action={{ label: 'Create Tournament', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTournaments.map(tournament => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              isActive={state.activeTournamentId === tournament.id}
              playerCount={state.tournamentPlayers.filter(tp => tp.tournament_id === tournament.id).length}
              matchCount={state.matches.filter(m => m.tournament_id === tournament.id).length}
              onEdit={() => setEditingTournament(tournament)}
              onDelete={() => setDeletingId(tournament.id)}
              onSetActive={() => {
                setActiveTournament(tournament.id);
                showToast(`${tournament.name} set as active`, 'success');
              }}
              onClick={() => navigate(`/tournaments/${tournament.id}`)}
            />
          ))}
        </div>
      )}

      {(showForm || !!editingTournament) && (
        <TournamentForm
          tournament={editingTournament || undefined}
          availablePlayers={state.players}
          onSubmit={handleSaveTournament}
          onClose={() => {
            setShowForm(false);
            setEditingTournament(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingId}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Tournament"
        message={`Are you sure you want to delete ${tToDelete?.name}? This will remove all associated matches and standings.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Tournaments;
