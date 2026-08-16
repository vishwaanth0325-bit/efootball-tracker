import React from 'react';
import type { Tournament } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Pencil, Trash2, Calendar, Users, Gamepad2 } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  playerCount: number;
  matchCount: number;
  isActive: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive: () => void;
  onClick: () => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  playerCount,
  matchCount,
  isActive,
  onEdit,
  onDelete,
  onSetActive,
  onClick
}) => {
  const formatLabel = {
    league: 'League',
    round_robin: 'Round Robin',
    groups: 'Groups',
    knockout: 'Knockout',
    group_knockout: 'Group + Knockout'
  }[tournament.format] || tournament.format;

  return (
    <div className={`card card-hover flex flex-col ${isActive ? 'border-accent shadow-[0_0_15px_rgba(0,240,255,0.15)]' : ''}`}>
      <div className="p-5 cursor-pointer flex-1" onClick={onClick}>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-display font-bold text-xl text-text">{tournament.name}</h3>
            <span className="text-text-muted text-sm">{tournament.season}</span>
          </div>
          <Badge variant={tournament.status}>{tournament.status}</Badge>
        </div>

        <div className="flex gap-2 my-4">
          <span className="text-xs text-text-dim bg-surface px-2 py-1 rounded border border-border-light">
            {formatLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mt-4">
          <div className="flex items-center gap-2 text-text-muted">
            <Users size={16} />
            <span>{playerCount} Players</span>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Gamepad2 size={16} />
            <span>{matchCount} Matches</span>
          </div>
          {(tournament.start_date || tournament.end_date) && (
            <div className="flex items-center gap-2 text-text-muted col-span-2">
              <Calendar size={16} />
              <span>
                {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : 'TBD'} 
                {' - '}
                {tournament.end_date ? new Date(tournament.end_date).toLocaleDateString() : 'TBD'}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-border-light flex items-center justify-between bg-surface/50">
        <button 
          onClick={isActive ? undefined : onSetActive}
          className={`btn text-sm ${isActive ? 'bg-border text-text-muted cursor-default' : 'btn-secondary'}`}
          disabled={isActive}
        >
          {isActive ? 'Active' : 'Set Active'}
        </button>

        <div className="flex gap-2">
          <button onClick={onEdit} className="btn btn-ghost p-2" title="Edit Tournament">
            <Pencil size={18} />
          </button>
          <button onClick={onDelete} className="btn btn-ghost p-2 text-red-500 hover:text-red-400" title="Delete Tournament">
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
