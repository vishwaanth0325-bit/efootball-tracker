import React from 'react';
import type { Match, Player } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Trophy, Shield, User } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

interface RecentResultsProps {
  matches: Match[];
  players: Player[];
  limit?: number;
}

export const RecentResults: React.FC<RecentResultsProps> = ({ matches, players, limit }) => {
  const getPlayerById = (id?: string) => (id ? players.find(p => p.id === id) : undefined);

  const completedMatches = [...matches]
    .filter(m => m.status === 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const displayMatches = limit ? completedMatches.slice(0, limit) : completedMatches;

  if (displayMatches.length === 0) {
    return (
      <div className="card h-full min-h-[200px]">
        <EmptyState icon={Trophy} title="No recent results" description="No matches have been completed yet." />
      </div>
    );
  }

  return (
    <div className="card h-full">
      <div className="p-4 border-b border-border-light flex justify-between items-center">
        <h3 className="font-display font-semibold text-lg">Recent Results</h3>
      </div>
      <div className="flex flex-col">
        {displayMatches.map(match => {
          const p1 = getPlayerById(match.player1_id);
          const p2 = getPlayerById(match.player2_id);

          let p1Result: 'win' | 'loss' | 'draw' = 'draw';
          let p2Result: 'win' | 'loss' | 'draw' = 'draw';

          if ((match.player1_score ?? 0) > (match.player2_score ?? 0)) {
            p1Result = 'win';
            p2Result = 'loss';
          } else if ((match.player1_score ?? 0) < (match.player2_score ?? 0)) {
            p1Result = 'loss';
            p2Result = 'win';
          }

          return (
            <div key={match.id} className="p-4 border-b border-border-light last:border-0 hover:bg-surface-hover transition-colors">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-text-muted">
                  {new Date(match.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                {match.round && <span className="text-xs text-text-muted font-mono">{match.round}</span>}
              </div>

              <div className="flex items-center justify-between gap-3">
                {/* Team / Player 1 */}
                <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                  <div className="text-right min-w-0">
                    {/* HIGHLIGHTED TEAM NAME */}
                    <span className={`font-bold block truncate text-sm flex items-center justify-end gap-1 ${p1Result === 'win' ? 'text-text' : 'text-text-muted'}`}>
                      <Shield className="w-3 h-3 text-accent shrink-0" />
                      <span className="truncate">{p1?.team || p1?.name || match.player1_placeholder || 'Team 1'}</span>
                    </span>
                    {/* PLAYER NAME BELOW */}
                    {p1?.team && (
                      <span className="text-[10px] text-text-muted truncate flex items-center justify-end gap-0.5 mt-0.5">
                        <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                        <span>{p1.name}</span>
                      </span>
                    )}
                  </div>
                  <Badge variant={p1Result}>{p1Result === 'win' ? 'W' : p1Result === 'draw' ? 'D' : 'L'}</Badge>
                </div>

                {/* Score */}
                <div className="shrink-0 bg-surface px-3 py-1 rounded font-display font-bold text-lg tracking-wider border border-border-light font-mono">
                  {match.player1_score} - {match.player2_score}
                </div>

                {/* Team / Player 2 */}
                <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                  <Badge variant={p2Result}>{p2Result === 'win' ? 'W' : p2Result === 'draw' ? 'D' : 'L'}</Badge>
                  <div className="text-left min-w-0">
                    {/* HIGHLIGHTED TEAM NAME */}
                    <span className={`font-bold block truncate text-sm flex items-center justify-start gap-1 ${p2Result === 'win' ? 'text-text' : 'text-text-muted'}`}>
                      <Shield className="w-3 h-3 text-accent shrink-0" />
                      <span className="truncate">{p2?.team || p2?.name || match.player2_placeholder || 'Team 2'}</span>
                    </span>
                    {/* PLAYER NAME BELOW */}
                    {p2?.team && (
                      <span className="text-[10px] text-text-muted truncate flex items-center justify-start gap-0.5 mt-0.5">
                        <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                        <span>{p2.name}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
