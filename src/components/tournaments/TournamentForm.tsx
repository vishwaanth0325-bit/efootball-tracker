import React, { useState } from 'react';
import type { Tournament, TournamentFormat, TournamentStatus } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface TournamentFormProps {
  tournament?: Tournament;
  onSubmit: (data: Omit<Tournament, 'id' | 'created_at'>) => void;
  onClose: () => void;
}

export const TournamentForm: React.FC<TournamentFormProps> = ({ tournament, onSubmit, onClose }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !season.trim()) return;

    onSubmit({
      name: name.trim(),
      season: season.trim(),
      description: description.trim() || undefined,
      format,
      status,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      points_win: pointsWin,
      points_draw: pointsDraw,
      points_loss: pointsLoss
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={tournament ? 'Edit Tournament' : 'Create Tournament'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[80vh] overflow-y-auto px-1">
        <Input id="tName" label="Tournament Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input id="tSeason" label="Season/Edition" value={season} onChange={(e) => setSeason(e.target.value)} required />
        
        <div className="grid grid-cols-2 gap-4">
          <Select 
            id="tFormat" 
            label="Format" 
            value={format} 
            onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            options={[
              { value: 'league', label: 'League' },
              { value: 'round_robin', label: 'Round Robin' },
              { value: 'groups', label: 'Groups' },
              { value: 'knockout', label: 'Knockout' },
              { value: 'group_knockout', label: 'Group + Knockout' }
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
              { value: 'completed', label: 'Completed' }
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input id="tStartDate" type="date" label="Start Date (Optional)" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input id="tEndDate" type="date" label="End Date (Optional)" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

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
            className="form-input min-h-[80px] resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
