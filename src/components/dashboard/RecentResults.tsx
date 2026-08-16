import React from 'react';
import type { Match, Player } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Trophy } from 'lucide-react';
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
                {match.round && <span className="text-xs text-text-muted">{match.round}</span>}
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className={`font-medium truncate ${p1Result === 'win' ? 'text-text' : 'text-text-muted'}`}>
                    {p1?.name || match.player1_placeholder || 'Player 1'}
                  </span>
                  <Badge variant={p1Result}>{p1Result === 'win' ? 'W' : p1Result === 'draw' ? 'D' : 'L'}</Badge>
                </div>

                <div className="shrink-0 bg-surface px-3 py-1 rounded font-display font-bold text-lg tracking-wider border border-border-light">
                  {match.player1_score} - {match.player2_score}
                </div>

                <div className="flex items-center gap-2 flex-1 justify-start">
                  <Badge variant={p2Result}>{p2Result === 'win' ? 'W' : p2Result === 'draw' ? 'D' : 'L'}</Badge>
                  <span className={`font-medium truncate ${p2Result === 'win' ? 'text-text' : 'text-text-muted'}`}>
                    {p2?.name || match.player2_placeholder || 'Player 2'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
