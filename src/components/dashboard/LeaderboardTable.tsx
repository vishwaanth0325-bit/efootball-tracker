import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { StandingRow } from '../../lib/types';
import { Shield, User } from 'lucide-react';

interface LeaderboardTableProps {
  rows: StandingRow[];
  limit?: number;
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ rows, limit }) => {
  const navigate = useNavigate();
  const displayRows = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th className="w-12 text-center">#</th>
            <th className="text-left">Team & Player</th>
            <th className="text-center w-12">P</th>
            <th className="text-center w-12">W</th>
            <th className="text-center w-12">D</th>
            <th className="text-center w-12 hidden sm:table-cell">L</th>
            <th className="text-center w-12 hidden md:table-cell">GF</th>
            <th className="text-center w-12 hidden md:table-cell">GA</th>
            <th className="text-center w-12">GD</th>
            <th className="text-center w-16">Pts</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, index) => {
            const rank = index + 1;
            let rankClass = '';
            if (rank === 1) rankClass = 'rank-1';
            else if (rank === 2) rankClass = 'rank-2';
            else if (rank === 3) rankClass = 'rank-3';

            return (
              <tr 
                key={row.player.id} 
                onClick={() => navigate(`/players/${row.player.id}`)}
                className="cursor-pointer hover:bg-surface-hover transition-colors"
              >
                <td className={`text-center font-bold ${rankClass}`}>{rank}</td>
                <td>
                  <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                    {row.player.profile_image ? (
                      <img
                        src={row.player.profile_image}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover border border-accent/30 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border-light flex items-center justify-center font-bold text-xs text-accent shrink-0">
                        {row.player.team ? row.player.team.slice(0, 1) : row.player.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="min-w-0">
                      {/* HIGHLIGHTED TEAM NAME ON TOP */}
                      <div className="font-bold text-sm text-text truncate flex items-center gap-1">
                        <Shield className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{row.player.team || row.player.name}</span>
                      </div>
                      {/* PLAYER NAME BELOW */}
                      {row.player.team && (
                        <div className="text-[11px] text-text-muted truncate flex items-center gap-0.5 mt-0.5">
                          <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                          <span>{row.player.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="text-center font-medium">{row.stats.played}</td>
                <td className="text-center text-emerald-400 font-semibold">{row.stats.wins}</td>
                <td className="text-center text-amber-400 font-medium">{row.stats.draws}</td>
                <td className="text-center hidden sm:table-cell text-red-400">{row.stats.losses}</td>
                <td className="text-center hidden md:table-cell">{row.stats.goals_for}</td>
                <td className="text-center hidden md:table-cell">{row.stats.goals_against}</td>
                <td className="text-center font-mono font-medium">
                  {row.stats.goal_diff > 0 ? `+${row.stats.goal_diff}` : row.stats.goal_diff}
                </td>
                <td className="text-center font-bold font-mono text-accent text-base">{row.stats.points}</td>
              </tr>
            );
          })}
          {displayRows.length === 0 && (
            <tr>
              <td colSpan={10} className="text-center p-8 text-text-muted">
                No standings data available.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
