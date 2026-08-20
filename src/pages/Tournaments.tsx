import React, { useState } from 'react';
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
import {
  buildGroupAssignments,
  computeHybridConfig,
  generateAllGroupFixtures,
  generateKnockoutBracketFromStandings,
} from '../lib/tournamentEngine';
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

  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            if (newTournament.format === 'group_knockout') {
              const { G, q } = computeHybridConfig(selectedPlayerIds.length);
              const groupAssignments = buildGroupAssignments(selectedPlayerIds, G);
              await updateTournament({
                ...newTournament,
                group_config: {
                  group_count: G,
                  qualifiers_per_group: Math.ceil(q),
                  group_assignments: groupAssignments,
                },
              });
              const fixtures = generateAllGroupFixtures(newTournament.id, groupAssignments);
              if (fixtures.length > 0) {
                await addMatches(fixtures as any);
              }
            } else if (newTournament.format === 'knockout') {
              const players = selectedPlayerIds.map(id => state.players.find(p => p.id === id)!).filter(Boolean);
              const bracketMatches = generateKnockoutBracketFromStandings(newTournament.id, players);
              if (bracketMatches.length > 0) {
                await addMatches(bracketMatches as any);
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

      {/* Error banner */}
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
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold">Tournaments</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {state.tournaments.length} tournament{state.tournaments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn btn-primary shrink-0"
          onClick={() => setShowForm(true)}
          disabled={isSubmitting}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">New Tournament</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Tournament grid */}
      {state.tournaments.length === 0 ? (
        <EmptyState
          title="No Tournaments Yet"
          description="Create your first tournament to get started."
          icon={Trophy}
          action={{ label: 'Create Tournament', onClick: () => setShowForm(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {state.tournaments.map(tournament => (
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

      {/* Form modal */}
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

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Tournament"
        message={`Delete "${tToDelete?.name}"? This will remove all associated matches and standings.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Tournaments;
