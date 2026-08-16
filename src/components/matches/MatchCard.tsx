import React from 'react';
import type { Match, Player } from '../../lib/types';
import { Trash2, CheckCircle2, Shield, User } from 'lucide-react';

interface MatchCardProps {
  match: Match;
  player1: Player;
  player2: Player;
  onEnterScore: () => void;
  onDelete: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  player1,
  player2,
  onEnterScore,
  onDelete,
}) => {
  const isCompleted = match.status === 'completed';

  return (
    <div className="card p-5 relative group flex flex-col justify-between border border-border-light hover:border-accent/40 transition-colors">
      <div className="flex justify-between items-center mb-4 border-b border-border-light/50 pb-2">
        <span className="text-xs text-accent font-bold uppercase tracking-wider">
          {match.round || match.match_code || 'Match'}
        </span>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
          <button
            onClick={onDelete}
            className="btn btn-ghost p-1 text-red-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete Match"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 my-3">
        {/* Team 1 (Highlight team on top, player name below) */}
        <div className="flex-1 text-right min-w-0">
          <div className="flex items-center justify-end gap-2">
            <div className="min-w-0">
              {/* HIGHLIGHTED TEAM NAME */}
              <div className={`font-display font-bold text-base truncate flex items-center justify-end gap-1 ${
                isCompleted && (match.player1_score ?? 0) > (match.player2_score ?? 0) ? 'text-accent' : 'text-text'
              }`}>
                <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{player1?.team || player1?.name || match.player1_placeholder || 'Team 1'}</span>
              </div>
              {/* PLAYER NAME BELOW */}
              {player1?.team && (
                <div className="text-[11px] text-text-muted truncate flex items-center justify-end gap-0.5 mt-0.5">
                  <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                  <span>{player1.name}</span>
                </div>
              )}
            </div>
            {player1?.profile_image && (
              <img
                src={player1.profile_image}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-accent/40 shrink-0"
              />
            )}
          </div>
        </div>

        {/* Score / VS Box */}
        <div className="shrink-0 flex flex-col items-center justify-center min-w-[70px]">
          {isCompleted ? (
            <div className="bg-surface px-3 py-1.5 rounded-lg font-mono font-bold text-xl tracking-wider border border-border-light shadow-inner">
              {match.player1_score} - {match.player2_score}
            </div>
          ) : (
            <span className="text-text-muted font-display font-bold text-sm uppercase tracking-wider px-2 py-1 rounded bg-surface border border-border-light">
              VS
            </span>
          )}
          {isCompleted && match.penalty_player1_score !== undefined && (
            <span className="text-[9px] text-amber-400 font-mono mt-1">
              PEN: {match.penalty_player1_score}-{match.penalty_player2_score}
            </span>
          )}
        </div>

        {/* Team 2 (Highlight team on top, player name below) */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center justify-start gap-2">
            {player2?.profile_image && (
              <img
                src={player2.profile_image}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-accent/40 shrink-0"
              />
            )}
            <div className="min-w-0">
              {/* HIGHLIGHTED TEAM NAME */}
              <div className={`font-display font-bold text-base truncate flex items-center justify-start gap-1 ${
                isCompleted && (match.player2_score ?? 0) > (match.player1_score ?? 0) ? 'text-accent' : 'text-text'
              }`}>
                <Shield className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{player2?.team || player2?.name || match.player2_placeholder || 'Team 2'}</span>
              </div>
              {/* PLAYER NAME BELOW */}
              {player2?.team && (
                <div className="text-[11px] text-text-muted truncate flex items-center justify-start gap-0.5 mt-0.5">
                  <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                  <span>{player2.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center pt-3 border-t border-border-light/50 mt-2">
        <button
          onClick={onEnterScore}
          className={`btn text-xs py-1.5 px-4 ${isCompleted ? 'btn-secondary' : 'btn-primary'}`}
        >
          {isCompleted ? 'Edit Score' : 'Enter Score'}
        </button>
      </div>
    </div>
  );
};
