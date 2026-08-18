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
  const [groupName, setGroupName] = useState(existingMatch?.group_name || '');
  const [stage, setStage] = useState<'league' | 'group' | 'knockout'>(
    existingMatch?.stage || (existingMatch?.round?.startsWith('Group') ? 'group' : 'league')
  );
  const [status, setStatus] = useState<'upcoming' | 'completed'>(existingMatch?.status || 'upcoming');
  const [player1Score, setPlayer1Score] = useState(existingMatch?.player1_score !== undefined && existingMatch?.player1_score !== null ? String(existingMatch.player1_score) : '');
  const [player2Score, setPlayer2Score] = useState(existingMatch?.player2_score !== undefined && existingMatch?.player2_score !== null ? String(existingMatch.player2_score) : '');

  const playerOptions = [
    { value: '', label: '-- Select Player / Team --' },
    ...players.map(p => ({ value: p.id, label: p.name + (p.team ? ` (${p.team})` : '') })),
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!player1Id || !player2Id || player1Id === player2Id) return;

    const p1s = player1Score !== '' ? parseInt(player1Score, 10) : undefined;
    const p2s = player2Score !== '' ? parseInt(player2Score, 10) : undefined;
    const finalStatus = (p1s !== undefined && p2s !== undefined) ? 'completed' : status;

    onSubmit({
      ...(existingMatch || {}),
      tournament_id: tournamentId,
      player1_id: player1Id,
      player2_id: player2Id,
      stage,
      group_name: groupName.trim() || undefined,
      round: round.trim() || undefined,
      status: finalStatus,
      player1_score: p1s,
      player2_score: p2s,
      winner_id: p1s !== undefined && p2s !== undefined ? (p1s > p2s ? player1Id : p2s > p1s ? player2Id : existingMatch?.winner_id) : undefined,
      updated_at: new Date().toISOString(),
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={existingMatch ? 'Edit Match Fixture' : 'Add Match'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="mRound"
            label="Stage / Round Label"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            placeholder="e.g. Group A - Match 1, Final"
          />

          <Input
            id="mGroupName"
            label="Group Name (Optional)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Group A, Group B"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            id="mStage"
            label="Tournament Stage"
            value={stage}
            onChange={(e) => setStage(e.target.value as 'group' | 'knockout')}
            options={[
              { value: 'group', label: 'Group Stage' },
              { value: 'knockout', label: 'Knockout Stage' },
            ]}
          />

          <Select
            id="mStatus"
            label="Match Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'upcoming' | 'completed')}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'completed', label: 'Completed' },
            ]}
          />
        </div>

        {/* Optional Score Fields for quick score editing */}
        <div className="p-3 bg-surface-hover/50 rounded-xl border border-border-light space-y-2">
          <label className="text-xs font-semibold text-text uppercase tracking-wider">Scores (Optional)</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-text-muted">Player 1 Score</label>
              <input
                type="number"
                min="0"
                max="30"
                value={player1Score}
                onChange={(e) => setPlayer1Score(e.target.value)}
                placeholder="-"
                className="form-input text-center font-bold"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted">Player 2 Score</label>
              <input
                type="number"
                min="0"
                max="30"
                value={player2Score}
                onChange={(e) => setPlayer2Score(e.target.value)}
                placeholder="-"
                className="form-input text-center font-bold"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-border-light">
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
