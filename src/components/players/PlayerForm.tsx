import React, { useState } from 'react';
import type { Player, Platform, PlayerStatus } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface PlayerFormProps {
  player?: Player;
  onSubmit: (data: Omit<Player, 'id' | 'created_at'>) => void;
  onClose: () => void;
}

export const PlayerForm: React.FC<PlayerFormProps> = ({ player, onSubmit, onClose }) => {
  const [name, setName] = useState(player?.name || '');
  const [username, setUsername] = useState(player?.efootball_username || '');
  const [platform, setPlatform] = useState<Platform>(player?.platform || 'Mobile');
  const [team, setTeam] = useState(player?.team || '');
  const [notes, setNotes] = useState(player?.notes || '');
  const [status, setStatus] = useState<PlayerStatus>(player?.status || 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) return;

    onSubmit({
      name: name.trim(),
      efootball_username: username.trim(),
      platform,
      team: team.trim() || undefined,
      notes: notes.trim() || undefined,
      status
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={player ? 'Edit Player' : 'Add Player'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input 
          id="playerName" 
          label="Full Name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          required 
          placeholder="e.g. John Doe" 
        />
        
        <Input 
          id="playerUsername" 
          label="eFootball Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          required 
          placeholder="e.g. john_doe_99" 
        />

        <div className="grid grid-cols-2 gap-4">
          <Select 
            id="playerPlatform" 
            label="Platform" 
            value={platform} 
            onChange={(e) => setPlatform(e.target.value as Platform)}
            options={[
              { value: 'Mobile', label: 'Mobile' },
              { value: 'PS5', label: 'PS5' },
              { value: 'PS4', label: 'PS4' },
              { value: 'Xbox', label: 'Xbox' },
              { value: 'PC', label: 'PC' }
            ]}
          />

          <Select 
            id="playerStatus" 
            label="Status" 
            value={status} 
            onChange={(e) => setStatus(e.target.value as PlayerStatus)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />
        </div>

        <Input 
          id="playerTeam" 
          label="Default Team (Optional)" 
          value={team} 
          onChange={(e) => setTeam(e.target.value)} 
          placeholder="e.g. Manchester United" 
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="playerNotes" className="form-label">Notes (Optional)</label>
          <textarea 
            id="playerNotes"
            className="form-input min-h-[80px] resize-y"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional details here..."
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || !username.trim()}>
            {player ? 'Save Changes' : 'Add Player'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
