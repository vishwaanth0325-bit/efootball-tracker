import React, { useState } from 'react';
import type { Match, MatchStatus, Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface MatchFormProps {
  tournamentId: string;
  players: Player[];
  existingMatch?: Match;
  onSubmit: (data: Partial<Match>) => void;
  onClose: () => void;
}

export const MatchForm: React.FC<MatchFormProps> = ({ tournamentId, players, existingMatch, onSubmit, onClose }) => {
  const [player1Id, setPlayer1Id] = useState(existingMatch?.player1_id || '');
  const [player2Id, setPlayer2Id] = useState(existingMatch?.player2_id || '');
  const [round, setRound] = useState(existingMatch?.round || '');
  const [date, setDate] = useState(existingMatch?.scheduled_date || '');
  const [time, setTime] = useState(existingMatch?.scheduled_time || '');
  const [status, setStatus] = useState<MatchStatus>(existingMatch?.status || 'upcoming');

  const playerOptions = [{ value: '', label: '-- Select Player --' }, ...players.map(p => ({ value: p.id, label: p.name }))];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player1Id || !player2Id || player1Id === player2Id) return;

    onSubmit({
      tournament_id: tournamentId,
      player1_id: player1Id,
      player2_id: player2Id,
      round: round.trim() || undefined,
      scheduled_date: date || undefined,
      scheduled_time: time || undefined,
      status
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={existingMatch ? 'Edit Match' : 'Schedule Match'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select 
          id="mPlayer1" 
          label="Player 1" 
          value={player1Id} 
          onChange={(e) => setPlayer1Id(e.target.value)} 
          options={playerOptions}
          required
        />
        
        <Select 
          id="mPlayer2" 
          label="Player 2" 
          value={player2Id} 
          onChange={(e) => setPlayer2Id(e.target.value)} 
          options={playerOptions.filter(o => o.value !== player1Id || o.value === '')}
          required
        />

        <Input id="mRound" label="Round / Matchday (Optional)" value={round} onChange={(e) => setRound(e.target.value)} placeholder="e.g. Matchday 1, Semi-Final" />

        <div className="grid grid-cols-2 gap-4">
          <Input id="mDate" type="date" label="Date (Optional)" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input id="mTime" type="time" label="Time (Optional)" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <Select 
          id="mStatus" 
          label="Status" 
          value={status} 
          onChange={(e) => setStatus(e.target.value as MatchStatus)}
          options={[
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'postponed', label: 'Postponed' },
            { value: 'cancelled', label: 'Cancelled' }
          ]}
        />

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-light">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!player1Id || !player2Id || player1Id === player2Id}>
            {existingMatch ? 'Save Changes' : 'Schedule Match'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
