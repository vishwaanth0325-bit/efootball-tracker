import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../../lib/types';
import { Pencil, Trash2, Shield } from 'lucide-react';

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
      className="card card-hover p-5 cursor-pointer flex flex-col justify-between"
      onClick={() => navigate(`/players/${player.id}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {player.profile_image ? (
            <img
              src={player.profile_image}
              alt={player.name}
              className="w-12 h-12 rounded-2xl object-cover border border-accent/40 shadow-sm shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-accent/15 border border-accent/40 flex items-center justify-center text-accent font-display font-bold text-xl shrink-0">
              {getInitials(player.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-text text-base truncate">{player.name}</h3>
            {player.team ? (
              <p className="text-text-muted text-xs flex items-center gap-1 truncate font-medium">
                <Shield className="w-3 h-3 text-accent shrink-0" />
                <span className="truncate">{player.team}</span>
              </p>
            ) : (
              <p className="text-text-muted text-xs">Player</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border-light flex justify-end gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="btn btn-ghost p-2 text-text-muted hover:text-text"
          title="Edit Player"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn btn-ghost p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10"
          title="Delete Player"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
