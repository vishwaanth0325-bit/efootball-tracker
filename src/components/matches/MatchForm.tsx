import React, { useState } from 'react';
import type { Match, Player } from '../../lib/types';
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

export const MatchForm: React.FC<MatchFormProps> = ({
  tournamentId,
  players,
  existingMatch,
  onSubmit,
  onClose,
}) => {
  const [player1Id, setPlayer1Id] = useState(existingMatch?.player1_id || '');
  const [player2Id, setPlayer2Id] = useState(existingMatch?.player2_id || '');
  const [round, setRound] = useState(existingMatch?.round || '');

  const playerOptions = [
    { value: '', label: '-- Select Player / Team --' },
    ...players.map(p => ({ value: p.id, label: p.name + (p.team ? ` (${p.team})` : '') })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player1Id || !player2Id || player1Id === player2Id) return;

    onSubmit({
      tournament_id: tournamentId,
      player1_id: player1Id,
      player2_id: player2Id,
      round: round.trim() || undefined,
      status: existingMatch?.status || 'upcoming',
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={existingMatch ? 'Edit Match' : 'Add Match'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Select
          id="mPlayer1"
          label="Player / Team 1"
          value={player1Id}
          onChange={(e) => setPlayer1Id(e.target.value)}
          options={playerOptions}
          required
        />

        <Select
          id="mPlayer2"
          label="Player / Team 2"
          value={player2Id}
          onChange={(e) => setPlayer2Id(e.target.value)}
          options={playerOptions.filter(o => o.value !== player1Id || o.value === '')}
          required
        />

        <Input
          id="mRound"
          label="Stage / Round (Optional)"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          placeholder="e.g. Group A, Round of 16, Final"
        />

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border-light">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!player1Id || !player2Id || player1Id === player2Id}
          >
            {existingMatch ? 'Save Changes' : 'Create Match'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
