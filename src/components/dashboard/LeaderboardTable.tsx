import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { StandingRow } from '../../lib/types';

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
            <th className="text-left">Player</th>
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
                <td className="font-medium text-text">{row.player.name}</td>
                <td className="text-center">{row.stats.played}</td>
                <td className="text-center">{row.stats.wins}</td>
                <td className="text-center">{row.stats.draws}</td>
                <td className="text-center hidden sm:table-cell">{row.stats.losses}</td>
                <td className="text-center hidden md:table-cell">{row.stats.goals_for}</td>
                <td className="text-center hidden md:table-cell">{row.stats.goals_against}</td>
                <td className="text-center font-medium">
                  {row.stats.goal_diff > 0 ? `+${row.stats.goal_diff}` : row.stats.goal_diff}
                </td>
                <td className="text-center font-bold text-accent">{row.stats.points}</td>
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
