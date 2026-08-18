import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Tournament } from '../lib/types';
import { TournamentCard } from '../components/tournaments/TournamentCard';
import { TournamentForm } from '../components/tournaments/TournamentForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { generateFixtures } from '../lib/fixtures';
import { splitPlayersIntoGroupsBySize, generateAllGroupFixtures } from '../lib/tournamentEngine';
import { Plus, Trophy, AlertTriangle, RefreshCw } from 'lucide-react';

const Tournaments: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    addTournament,
    updateTournament,
    deleteTournament,
    setActiveTournament,
    addMatches,
    refreshData,
  } = useApp();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTournaments = useMemo(() => {
    if (statusFilter === 'all') return state.tournaments;
    return state.tournaments.filter(t => t.status === statusFilter);
  }, [state.tournaments, statusFilter]);

  const handleSaveTournament = async (
    data: Omit<Tournament, 'id' | 'created_at'>,
    selectedPlayerIds?: string[],
    autoGenerateFixtures?: boolean
  ) => {
    setIsSubmitting(true);
    try {
      if (editingTournament) {
        const success = await updateTournament({ ...editingTournament, ...data });
        if (success) {
          showToast('Tournament updated', 'success');
          setShowForm(false);
          setEditingTournament(null);
        }
      } else {
        const newTournament = await addTournament(data, selectedPlayerIds);
        if (newTournament) {
          if (!state.activeTournamentId) {
            setActiveTournament(newTournament.id);
          }

          if (autoGenerateFixtures && selectedPlayerIds && selectedPlayerIds.length >= 2) {
            if (newTournament.format === 'group_knockout' || newTournament.format === 'groups') {
              const groupAssignments = splitPlayersIntoGroupsBySize(selectedPlayerIds, 4);
              await updateTournament({
                ...newTournament,
                group_config: {
                  group_count: Object.keys(groupAssignments).length,
                  qualifiers_per_group: 2,
                  group_assignments: groupAssignments,
                },
              });
              const fixtures = generateAllGroupFixtures(newTournament.id, groupAssignments);
              if (fixtures.length > 0) {
                await addMatches(fixtures as any);
              }
            } else {
              const fixtures = generateFixtures(
                newTournament.id,
                selectedPlayerIds,
                false,
                [],
                newTournament.format
              );
              if (fixtures.length > 0) {
                await addMatches(fixtures as any);
              }
            }
          }

          showToast('Tournament created successfully', 'success');
          setShowForm(false);
          setEditingTournament(null);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deletingId) {
      setIsSubmitting(true);
      try {
        const success = await deleteTournament(deletingId);
        if (success) {
          showToast('Tournament deleted', 'success');
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

  const tToDelete = state.tournaments.find(t => t.id === deletingId);

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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-display text-3xl">Tournaments</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)} disabled={isSubmitting}>
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
