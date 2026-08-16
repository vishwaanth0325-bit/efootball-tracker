import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Match, Player } from '../../lib/types';
import { Calendar } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

interface UpcomingMatchesProps {
  matches: Match[];
  players: Player[];
  limit?: number;
}

export const UpcomingMatches: React.FC<UpcomingMatchesProps> = ({ matches, players, limit }) => {
  const navigate = useNavigate();

  const getPlayerById = (id?: string) => (id ? players.find(p => p.id === id) : undefined);

  const upcomingMatches = [...matches].filter(m => m.status === 'upcoming');
  const displayMatches = limit ? upcomingMatches.slice(0, limit) : upcomingMatches;

  if (displayMatches.length === 0) {
    return (
      <div className="card h-full min-h-[200px]">
        <EmptyState icon={Calendar} title="No upcoming matches" description="All scheduled matches have been completed." />
      </div>
    );
  }

  return (
    <div className="card h-full">
      <div className="p-4 border-b border-border-light flex justify-between items-center">
        <h3 className="font-display font-semibold text-lg">Upcoming Matches</h3>
      </div>
      <div className="flex flex-col">
        {displayMatches.map(match => {
          const p1 = getPlayerById(match.player1_id);
          const p2 = getPlayerById(match.player2_id);

          return (
            <div
              key={match.id}
              onClick={() => navigate('/matches')}
              className="flex items-center justify-between p-4 border-b border-border-light last:border-0 hover:bg-surface-hover cursor-pointer transition-colors"
            >
              <div className="flex items-center flex-1 gap-2 min-w-0">
                <span className="font-medium text-text text-right flex-1 truncate">{p1?.name || match.player1_placeholder || 'Player 1'}</span>
                <span className="text-text-muted text-xs mx-2 shrink-0">vs</span>
                <span className="font-medium text-text flex-1 truncate">{p2?.name || match.player2_placeholder || 'Player 2'}</span>
              </div>

              {match.round && (
                <div className="ml-4 flex flex-col items-end shrink-0">
                  <span className="text-xs text-text-muted bg-surface px-2.5 py-1 rounded-full border border-border-light">
                    {match.round}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
