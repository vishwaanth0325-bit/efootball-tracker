import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Player } from '../lib/types';
import { PlayerCard } from '../components/players/PlayerCard';
import { PlayerForm } from '../components/players/PlayerForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Input } from '../components/ui/Input';
import { Plus, Search, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const Players: React.FC = () => {
  const { state, addPlayer, updatePlayer, deletePlayer, refreshData } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPlayers = useMemo(() => {
    return state.players.filter(p => {
      const s = search.toLowerCase();
      return p.name.toLowerCase().includes(s) || (p.team && p.team.toLowerCase().includes(s));
    });
  }, [state.players, search]);

  const handleSavePlayer = async (playerData: Omit<Player, 'id' | 'created_at'>) => {
    setIsSubmitting(true);
    try {
      if (editingPlayer) {
        const success = await updatePlayer({ ...editingPlayer, ...playerData });
        if (success) {
          showToast('Player updated successfully', 'success');
          setEditingPlayer(null);
        }
      } else {
        const created = await addPlayer(playerData);
        if (created) {
          showToast('Player added successfully', 'success');
          setShowAddForm(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePlayer = async () => {
    if (deletingPlayerId) {
      setIsSubmitting(true);
      try {
        const success = await deletePlayer(deletingPlayerId);
        if (success) {
          showToast('Player deleted successfully', 'success');
          setDeletingPlayerId(null);
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (state.loading) {
    return <LoadingSpinner fullPage />;
  }

  const playerToDelete = state.players.find(p => p.id === deletingPlayerId);

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
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl">Players & Teams</h1>
          <Badge variant="active">{state.players.length}</Badge>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)} disabled={isSubmitting}>
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            id="searchPlayers"
            className="pl-9"
            placeholder="Search players or teams..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <EmptyState
          title="No Players Found"
          description="Add participants to get started with your tournament."
          icon={Users}
          action={{ label: 'Add Player', onClick: () => setShowAddForm(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              onEdit={() => setEditingPlayer(player)}
              onDelete={() => setDeletingPlayerId(player.id)}
            />
          ))}
        </div>
      )}

      {(showAddForm || !!editingPlayer) && (
        <PlayerForm
          player={editingPlayer || undefined}
          onSubmit={handleSavePlayer}
          onClose={() => {
            setShowAddForm(false);
            setEditingPlayer(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deletingPlayerId}
        onCancel={() => setDeletingPlayerId(null)}
        onConfirm={handleDeletePlayer}
        title="Delete Player"
        message={`Delete ${playerToDelete?.name}? This will remove them from all tournaments.`}
        confirmLabel="Delete"
        danger={true}
      />
    </div>
  );
};

export default Players;
