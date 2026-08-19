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

const FORMAT_LABELS: Record<string, string> = {
  league: 'League',
  round_robin: 'Round Robin',
  league_knockout: 'League + Knockout',
  knockout: 'Knockout',
  group_knockout: 'Groups + Knockout',
  groups: 'Group Stage',
};

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
      <div className="p-5 flex flex-col gap-3 flex-1">

        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <h3 className="font-display font-bold text-base text-text group-hover:text-accent transition-colors leading-tight line-clamp-2">
              {tournament.name}
            </h3>
          </div>
          {isActive && <Badge variant="active">Active</Badge>}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap">
          <span>{tournament.season}</span>
          <span className="opacity-40">•</span>
          <span>{FORMAT_LABELS[tournament.format] ?? tournament.format}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-xs text-text-muted pt-2 border-t border-border-light/50 mt-auto">
          <div className="flex items-center gap-1.5">
            <Users size={13} className="text-accent" />
            <span>{playerCount} Players</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gamepad2 size={13} className="text-accent" />
            <span>{matchCount} Matches</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border-light flex items-center justify-between bg-surface/50">
        <div className="flex items-center gap-1 text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform">
          <span>Manage</span>
          <ArrowRight size={12} />
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="btn btn-ghost p-1.5 text-text-muted hover:text-text"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="btn btn-ghost p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
