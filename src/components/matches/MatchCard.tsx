import React from 'react';
import type { Match, Player } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Trash2 } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  player1: Player;
  player2: Player;
  onEnterScore: () => void;
  onDelete: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, player1, player2, onEnterScore, onDelete }) => {
  const isCompleted = match.status === 'completed';
  const showEnterScore = match.status === 'upcoming' || match.status === 'postponed';

  return (
    <div className="card p-5 relative group">
      <div className="flex justify-between items-start mb-4">
        {match.round ? (
          <span className="text-xs text-text-muted font-medium bg-surface px-2 py-1 rounded">{match.round}</span>
        ) : <div />}
        <div className="flex items-center gap-2">
          <Badge variant={match.status}>{match.status}</Badge>
          <button 
            onClick={onDelete}
            className="btn btn-ghost p-1.5 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Match"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex-1 text-right">
          <span className={`font-display font-semibold text-lg ${isCompleted && (match.player1_score ?? 0) > (match.player2_score ?? 0) ? 'text-accent' : 'text-text'}`}>
            {player1?.name || 'Unknown'}
          </span>
        </div>
        
        <div className="shrink-0 flex flex-col items-center justify-center min-w-[80px]">
          {isCompleted ? (
            <div className="bg-surface px-4 py-2 rounded-lg font-display font-bold text-2xl tracking-widest border border-border-light shadow-inner">
              {match.player1_score} - {match.player2_score}
            </div>
          ) : (
            <span className="text-text-muted font-display font-bold text-xl italic opacity-50">VS</span>
          )}
        </div>
        
        <div className="flex-1 text-left">
          <span className={`font-display font-semibold text-lg ${isCompleted && (match.player2_score ?? 0) > (match.player1_score ?? 0) ? 'text-accent' : 'text-text'}`}>
            {player2?.name || 'Unknown'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border-light">
        <div className="text-xs text-text-muted flex flex-col">
          {match.scheduled_date ? (
            <>
              <span>{new Date(match.scheduled_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              {match.scheduled_time && <span>{match.scheduled_time}</span>}
            </>
          ) : (
            <span>Unscheduled</span>
          )}
        </div>
        
        {showEnterScore && (
          <button onClick={onEnterScore} className="btn btn-primary text-sm py-1.5 px-4">
            Enter Score
          </button>
        )}
        {isCompleted && (
          <button onClick={onEnterScore} className="btn btn-secondary text-xs py-1 px-3 opacity-0 group-hover:opacity-100 transition-opacity">
            Edit Score
          </button>
        )}
      </div>
    </div>
  );
};
