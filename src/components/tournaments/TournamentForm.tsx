import React, { useState } from 'react';
import type { Tournament, TournamentFormat, TournamentStatus, Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Users, CheckSquare, Square, Zap } from 'lucide-react';

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
  const [format, setFormat] = useState<TournamentFormat>(tournament?.format || 'league_knockout');
  const [knockoutQualifiers, setKnockoutQualifiers] = useState<number>(
    tournament?.knockout_qualifiers || 4
  );
  const status: TournamentStatus = tournament?.status || 'upcoming';
  const pointsWin = tournament?.points_win ?? 3;
  const pointsDraw = tournament?.points_draw ?? 1;
  const pointsLoss = tournament?.points_loss ?? 0;

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
        format,
        status,
        points_win: pointsWin,
        points_draw: pointsDraw,
        points_loss: pointsLoss,
        knockout_qualifiers:
          format === 'league_knockout' || format === 'knockout' ? knockoutQualifiers : undefined,
      },
      !tournament ? selectedPlayerIds : undefined,
      !tournament ? autoGenerate : undefined
    );
  };

  const isEditing = !!tournament;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Edit Tournament' : 'New Tournament'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Name + Season row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="tName"
            label="Tournament Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. World Cup 2026"
          />
          <Input
            id="tSeason"
            label="Season / Edition"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            required
            placeholder="e.g. Season 1"
          />
        </div>

        {/* Format */}
        <Select
          id="tFormat"
          label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value as TournamentFormat)}
          options={[
            { value: 'league_knockout', label: 'League Stage → Knockout Playoffs' },
            { value: 'league', label: 'League / Round Robin' },
            { value: 'knockout', label: 'Knockout Bracket Only' },
            { value: 'group_knockout', label: 'Groups + Knockout (World Cup)' },
          ]}
        />

        {/* Knockout qualifier count — only for relevant formats */}
        {(format === 'league_knockout' || format === 'knockout') && (
          <div className="rounded-xl border border-border-light bg-surface p-4 space-y-2">
            <p className="text-xs font-semibold text-text uppercase tracking-wider">
              Knockout Stage Qualification
            </p>
            <select
              className="form-input text-sm w-full"
              value={knockoutQualifiers}
              onChange={(e) => setKnockoutQualifiers(Number(e.target.value))}
            >
              <option value={2}>Top 2 — Final</option>
              <option value={4}>Top 4 — Semi-Finals → Final</option>
              <option value={8}>Top 8 — Quarter-Finals → SF → Final</option>
              <option value={16}>Top 16 — Round of 16 → QF → SF → Final</option>
            </select>
            <p className="text-[11px] text-text-muted">
              Top teams from the league standings advance to the knockout playoffs.
            </p>
          </div>
        )}

        {/* Participant selection — new tournament only */}
        {!isEditing && availablePlayers.length > 0 && (
          <div className="rounded-xl border border-border-light bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                Participants
                <span className="text-text-muted font-normal normal-case">
                  ({selectedPlayerIds.length}/{availablePlayers.length})
                </span>
              </span>
              <div className="flex gap-3 text-[11px] text-accent">
                <button type="button" onClick={selectAll} className="hover:underline">All</button>
                <button type="button" onClick={deselectAll} className="hover:underline text-text-muted">Clear</button>
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
              {availablePlayers.map(player => {
                const isSelected = selectedPlayerIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => togglePlayer(player.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-all ${
                      isSelected
                        ? 'bg-accent/15 border border-accent/40 text-text font-medium'
                        : 'bg-surface-hover/40 hover:bg-surface-hover text-text-muted border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected
                        ? <CheckSquare className="w-3.5 h-3.5 text-accent shrink-0" />
                        : <Square className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      }
                      <span className="truncate">{player.name}</span>
                    </div>
                    {player.team && (
                      <span className="text-[10px] text-text-muted shrink-0 ml-2">{player.team}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 pt-1 text-xs text-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={e => setAutoGenerate(e.target.checked)}
                className="rounded border-border-light text-accent focus:ring-accent"
              />
              <Zap className="w-3 h-3 text-accent" />
              <span>Auto-generate fixtures on creation</span>
            </label>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border-light">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim() || !season.trim()}
          >
            {isEditing ? 'Save Changes' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
