import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../../lib/types';
import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '../ui/Badge';

interface PlayerCardProps {
  player: Player;
  onEdit: () => void;
  onDelete: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, onEdit, onDelete }) => {
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div 
      className="card card-hover p-5 cursor-pointer flex flex-col"
      onClick={() => navigate(`/players/${player.id}`)}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-bg font-display font-bold text-xl shrink-0">
            {getInitials(player.name)}
          </div>
          <div>
            <h3 className="font-bold text-text text-lg">{player.name}</h3>
            <p className="text-text-muted text-sm">@{player.efootball_username}</p>
          </div>
        </div>
        <Badge variant={player.status === 'active' ? 'active' : 'inactive'}>
          {player.status}
        </Badge>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded">
            {player.platform}
          </span>
          {player.team && (
            <span className="text-xs text-text-muted bg-surface px-2 py-1 rounded truncate max-w-[120px]">
              {player.team}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-light flex justify-end gap-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="btn btn-ghost p-2"
          title="Edit Player"
        >
          <Pencil size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn btn-ghost p-2 text-red-500 hover:text-red-400"
          title="Delete Player"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};
