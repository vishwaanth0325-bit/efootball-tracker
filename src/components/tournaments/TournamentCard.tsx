import React from 'react';
import type { Tournament } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Users, Gamepad2, Trophy, Pencil, Trash2, ArrowRight } from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  isActive?: boolean;
  playerCount: number;
  matchCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onSetActive?: () => void;
  onClick: () => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  isActive,
  playerCount,
  matchCount,
  onEdit,
  onDelete,
  onSetActive: _onSetActive,
  onClick,
}) => {
  return (
    <div
      className="card card-hover flex flex-col justify-between overflow-hidden border border-border-light cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent shrink-0" />
            <h3 className="font-display font-bold text-lg text-text group-hover:text-accent transition-colors truncate">
              {tournament.name}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {isActive && <Badge variant="active">Active</Badge>}
            <Badge variant={tournament.status === 'completed' ? 'active' : 'default'}>
              {tournament.status}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted mb-4">
          <span>Season {tournament.season}</span>
          <span>•</span>
          <span className="capitalize">{tournament.format.replace('_', ' ')}</span>
        </div>

        {tournament.description && (
          <p className="text-xs text-text-muted line-clamp-2 mb-4">
            {tournament.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border-light/50">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Users size={14} className="text-accent" />
            <span>{playerCount} Participants</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted">
            <Gamepad2 size={14} className="text-accent" />
            <span>{matchCount} Matches</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border-light flex items-center justify-between bg-surface/50">
        <div className="flex items-center gap-1 text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform">
          <span>Manage Tournament</span>
          <ArrowRight size={13} />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="btn btn-ghost p-1.5 text-text-muted hover:text-text"
            title="Edit Tournament"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="btn btn-ghost p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            title="Delete Tournament"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
