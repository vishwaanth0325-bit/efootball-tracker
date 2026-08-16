import React, { useState } from 'react';
import type { Tournament, TournamentFormat, TournamentStatus, Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Users, CheckSquare, Square } from 'lucide-react';

interface TournamentFormProps {
  tournament?: Tournament;
  availablePlayers?: Player[];
  onSubmit: (
    data: Omit<Tournament, 'id' | 'created_at'>,
    selectedPlayerIds?: string[],
    autoGenerateFixtures?: boolean
  ) => void;
  onClose: () => void;
}

export const TournamentForm: React.FC<TournamentFormProps> = ({
  tournament,
  availablePlayers = [],
  onSubmit,
  onClose,
}) => {
  const [name, setName] = useState(tournament?.name || '');
  const [season, setSeason] = useState(tournament?.season || 'Season 1');
  const [description, setDescription] = useState(tournament?.description || '');
  const [format, setFormat] = useState<TournamentFormat>(tournament?.format || 'group_knockout');
  const status: TournamentStatus = tournament?.status || 'upcoming';
  const pointsWin = tournament?.points_win ?? 3;
  const pointsDraw = tournament?.points_draw ?? 1;
  const pointsLoss = tournament?.points_loss ?? 0;

  // Participant selection for new tournaments
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    availablePlayers.map(p => p.id)
  );
  const [autoGenerate, setAutoGenerate] = useState(true);

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedPlayerIds(availablePlayers.map(p => p.id));
  const deselectAll = () => setSelectedPlayerIds([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !season.trim()) return;

    onSubmit(
      {
        name: name.trim(),
        season: season.trim(),
        description: description.trim() || undefined,
        format,
        status,
        points_win: pointsWin,
        points_draw: pointsDraw,
        points_loss: pointsLoss,
      },
      !tournament ? selectedPlayerIds : undefined,
      !tournament ? autoGenerate : undefined
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={tournament ? 'Edit Tournament' : 'Create World Cup / Tournament'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="tName"
          label="Tournament Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. World Cup 2026, Champions League"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="tSeason"
            label="Season / Edition"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            required
            placeholder="e.g. Season 1"
          />

          <Select
            id="tFormat"
            label="Format Structure"
            value={format}
            onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            options={[
              { value: 'group_knockout', label: 'World Cup (Group Stage → Knockout Stage)' },
              { value: 'groups', label: 'Groups Only' },
              { value: 'knockout', label: 'Knockout Bracket' },
              { value: 'league', label: 'League / Round Robin' },
            ]}
          />
        </div>

        <Input
          id="tDescription"
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tournament rules, prize pool, or notes..."
        />

        {/* Participant Selection */}
        {!tournament && availablePlayers.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border-light">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-text flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                Select Participants ({selectedPlayerIds.length}/{availablePlayers.length})
              </span>
              <div className="flex gap-2 text-accent text-[11px]">
                <button type="button" onClick={selectAll} className="hover:underline">Select All</button>
                <span>•</span>
                <button type="button" onClick={deselectAll} className="hover:underline">Clear</button>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 border border-border-light rounded-xl p-2 bg-surface/50">
              {availablePlayers.map(player => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs text-left transition-colors ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/40 text-text font-medium'
                        : 'bg-surface hover:bg-surface-hover text-text-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-accent shrink-0" /> : <Square className="w-3.5 h-3.5 text-text-muted shrink-0" />}
                      <span className="truncate">{player.name}</span>
                    </div>
                    {player.team && <span className="text-[10px] text-text-muted shrink-0">{player.team}</span>}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 pt-2 text-xs text-text cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={e => setAutoGenerate(e.target.checked)}
                className="rounded border-border-light text-accent focus:ring-accent"
              />
              <span>Automatically generate group & match schedule immediately upon creation</span>
            </label>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-light">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || !season.trim()}>
            {tournament ? 'Save Changes' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
