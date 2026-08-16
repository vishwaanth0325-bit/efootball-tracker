import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { Player } from '../lib/types';
import { PlayerCard } from '../components/players/PlayerCard';
import { PlayerForm } from '../components/players/PlayerForm';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Search, Users } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

const Players: React.FC = () => {
  const { state, addPlayer, updatePlayer, deletePlayer } = useApp();
  const { showToast } = useToast();
  
  const [search, setSearch] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  const filteredPlayers = useMemo(() => {
    return state.players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.efootball_username.toLowerCase().includes(search.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || p.platform === platformFilter;
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [state.players, search, platformFilter, statusFilter]);

  const handleSavePlayer = (playerData: Omit<Player, 'id' | 'created_at'>) => {
    if (editingPlayer) {
      updatePlayer({ ...editingPlayer, ...playerData });
      showToast('Player updated successfully', 'success');
      setEditingPlayer(null);
    } else {
      addPlayer(playerData);
      showToast('Player added successfully', 'success');
      setShowAddForm(false);
    }
  };

  const handleDeletePlayer = () => {
    if (deletingPlayerId) {
      deletePlayer(deletingPlayerId);
      showToast('Player deleted successfully', 'success');
      setDeletingPlayerId(null);
    }
  };

  const playerToDelete = state.players.find(p => p.id === deletingPlayerId);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl">Players</h1>
          <Badge variant="active">{state.players.length}</Badge>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Player
        </button>
      </div>

      <div className="card grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input 
            id="searchPlayers"
            className="pl-9" 
            placeholder="Search players..." 
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <Select 
          id="platformFilter"
          value={platformFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPlatformFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Platforms' },
            { value: 'Mobile', label: 'Mobile' },
            { value: 'PC', label: 'PC' },
            { value: 'PS4', label: 'PS4' },
            { value: 'PS5', label: 'PS5' },
            { value: 'Xbox', label: 'Xbox' }
          ]}
        />
        <Select 
          id="statusFilter"
          value={statusFilter} 
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]}
        />
      </div>

      {filteredPlayers.length === 0 ? (
        <EmptyState
          title="No Players Found"
          description="Try adjusting your filters or add a new player."
          icon={Users}
          action={{ label: "Add Player", onClick: () => setShowAddForm(true) }}
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
