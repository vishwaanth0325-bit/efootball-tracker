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
  const [format, setFormat] = useState<TournamentFormat>(tournament?.format || 'league');
  const [status, setStatus] = useState<TournamentStatus>(tournament?.status || 'upcoming');
  const [startDate, setStartDate] = useState(tournament?.start_date || '');
  const [endDate, setEndDate] = useState(tournament?.end_date || '');

  const [pointsWin, setPointsWin] = useState(tournament?.points_win ?? 3);
  const [pointsDraw, setPointsDraw] = useState(tournament?.points_draw ?? 1);
  const [pointsLoss, setPointsLoss] = useState(tournament?.points_loss ?? 0);

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
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        points_win: pointsWin,
        points_draw: pointsDraw,
        points_loss: pointsLoss,
      },
      !tournament ? selectedPlayerIds : undefined,
      !tournament ? autoGenerate : undefined
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={tournament ? 'Edit Tournament' : 'Create Tournament'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto px-1">
        <Input id="tName" label="Tournament Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Champions League 2026" required />
        <Input id="tSeason" label="Season / Edition" value={season} onChange={(e) => setSeason(e.target.value)} required />

        <div className="grid grid-cols-2 gap-4">
          <Select
            id="tFormat"
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            options={[
              { value: 'league', label: 'League (Round Robin)' },
              { value: 'knockout', label: 'Knockout (Bracket / Cup)' },
              { value: 'groups', label: 'Groups (Group Stages)' },
              { value: 'group_knockout', label: 'Groups + Knockout' },
            ]}
          />
          <Select
            id="tStatus"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TournamentStatus)}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'ongoing', label: 'Ongoing' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="tStartDate" type="date" label="Start Date (Optional)" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input id="tEndDate" type="date" label="End Date (Optional)" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {/* Participant Selection for New Tournaments */}
        {!tournament && availablePlayers.length > 0 && (
          <div className="p-4 bg-surface-hover border border-border-light rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="font-semibold text-sm">Select Participants ({selectedPlayerIds.length} of {availablePlayers.length})</span>
              </div>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={selectAll} className="text-accent hover:underline">Select All</button>
                <span className="text-text-muted">•</span>
                <button type="button" onClick={deselectAll} className="text-text-muted hover:underline">Clear</button>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
              {availablePlayers.map(p => {
                const isSelected = selectedPlayerIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors border ${
                      isSelected
                        ? 'bg-accent/10 border-accent/40 text-text'
                        : 'bg-surface border-border-light text-text-muted hover:border-text-muted'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-accent shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <span className="truncate font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>

            {selectedPlayerIds.length >= 2 && (
              <label className="flex items-center gap-2 text-xs text-text cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={e => setAutoGenerate(e.target.checked)}
                  className="rounded border-border-light text-accent focus:ring-accent"
                />
                Auto-generate initial match fixtures immediately
              </label>
            )}
          </div>
        )}

        <div className="p-3 bg-surface border border-border-light rounded-lg">
          <h4 className="text-sm font-medium mb-3 text-text-muted">Points System</h4>
          <div className="grid grid-cols-3 gap-3">
            <Input id="pWin" type="number" label="Win" value={pointsWin} onChange={(e) => setPointsWin(Number(e.target.value))} required />
            <Input id="pDraw" type="number" label="Draw" value={pointsDraw} onChange={(e) => setPointsDraw(Number(e.target.value))} required />
            <Input id="pLoss" type="number" label="Loss" value={pointsLoss} onChange={(e) => setPointsLoss(Number(e.target.value))} required />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="tDesc" className="form-label">Description (Optional)</label>
          <textarea
            id="tDesc"
            className="form-input min-h-[70px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes, rules, or prizes..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-light sticky bottom-0 bg-surface">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || !season.trim()}>
            {tournament ? 'Save Changes' : 'Create Tournament'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
