import React, { useState } from 'react';
import type { Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

interface PlayerFormProps {
  player?: Player;
  onSubmit: (data: Omit<Player, 'id' | 'created_at'>) => void;
  onClose: () => void;
}

export const PlayerForm: React.FC<PlayerFormProps> = ({ player, onSubmit, onClose }) => {
  const [name, setName] = useState(player?.name || '');
  const [team, setTeam] = useState(player?.team || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      team: team.trim() || undefined,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={player ? 'Edit Player' : 'Add Player'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="playerName"
          label="Player / Team Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Brazil, Argentina, Alex Rivera"
        />

        <Input
          id="playerTeam"
          label="Club / Team Name (Optional)"
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          placeholder="e.g. Real Madrid, Arsenal, National Team"
        />

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            {player ? 'Save Changes' : 'Add Player'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
