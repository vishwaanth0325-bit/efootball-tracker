import React from 'react';
import type { Player, HeadToHeadRecord } from '../../lib/types';

interface HeadToHeadProps {
  player1: Player;
  player2: Player;
  record: HeadToHeadRecord;
}

export const HeadToHead: React.FC<HeadToHeadProps> = ({ player1, player2, record }) => {
  const totalMatches = record.player1_wins + record.player2_wins + record.draws;
  
  if (totalMatches === 0) {
    return (
      <div className="card p-8 text-center text-text-muted">
        <p>No matches have been played between these two players yet.</p>
      </div>
    );
  }

  const p1WinPct = Math.round((record.player1_wins / totalMatches) * 100) || 0;
  const drawPct = Math.round((record.draws / totalMatches) * 100) || 0;
  const p2WinPct = Math.round((record.player2_wins / totalMatches) * 100) || 0;

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1 text-center">
          <h3 className="font-display font-bold text-xl text-text">{player1.name}</h3>
        </div>
        <div className="px-4 font-bold text-text-muted">VS</div>
        <div className="flex-1 text-center">
          <h3 className="font-display font-bold text-xl text-text">{player2.name}</h3>
        </div>
      </div>

      <div className="flex gap-4 justify-center mb-8">
        <div className="flex-1 flex flex-col items-center p-4 bg-surface rounded-xl border-t-4 border-green-500">
          <span className="text-3xl font-display font-bold text-text">{record.player1_wins}</span>
          <span className="text-sm text-text-muted mt-1">Wins</span>
          <span className="text-xs text-text-dim mt-2">{p1WinPct}%</span>
        </div>
        <div className="flex-1 flex flex-col items-center p-4 bg-surface rounded-xl border-t-4 border-amber-500">
          <span className="text-3xl font-display font-bold text-text">{record.draws}</span>
          <span className="text-sm text-text-muted mt-1">Draws</span>
          <span className="text-xs text-text-dim mt-2">{drawPct}%</span>
        </div>
        <div className="flex-1 flex flex-col items-center p-4 bg-surface rounded-xl border-t-4 border-red-500">
          <span className="text-3xl font-display font-bold text-text">{record.player2_wins}</span>
          <span className="text-sm text-text-muted mt-1">Wins</span>
          <span className="text-xs text-text-dim mt-2">{p2WinPct}%</span>
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-center text-sm font-medium text-text-muted mb-4 uppercase tracking-wider">Goals Scored</h4>
        <div className="flex items-center gap-4">
          <div className="flex-1 text-right text-xl font-bold">{record.player1_goals}</div>
          <div className="w-1/2 h-2 bg-surface rounded-full overflow-hidden flex">
            <div 
              className="bg-accent h-full transition-all" 
              style={{ width: `${(record.player1_goals / (record.player1_goals + record.player2_goals || 1)) * 100}%` }} 
            />
          </div>
          <div className="flex-1 text-left text-xl font-bold">{record.player2_goals}</div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-text-muted mb-3 uppercase tracking-wider">Recent Meetings</h4>
        <div className="flex flex-col gap-2">
          {record.matches.slice(0, 5).map(match => {
            const isP1First = match.player1_id === player1.id;
            const score1 = isP1First ? match.player1_score : match.player2_score;
            const score2 = isP1First ? match.player2_score : match.player1_score;
            
            let winnerId = null;
            if (score1 !== undefined && score2 !== undefined) {
              if (score1 > score2) winnerId = player1.id;
              else if (score2 > score1) winnerId = player2.id;
            }

            return (
              <div key={match.id} className="flex items-center justify-between p-3 bg-surface rounded hover:bg-surface-hover transition-colors">
                <span className="text-xs text-text-muted w-24">
                  {new Date(match.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <div className="flex-1 flex items-center justify-center gap-4">
                  <span className={`text-sm ${winnerId === player1.id ? 'font-bold text-text' : 'text-text-muted'}`}>{player1.name}</span>
                  <span className="font-bold font-display px-3 py-1 bg-bg rounded tracking-widest">{score1} - {score2}</span>
                  <span className={`text-sm ${winnerId === player2.id ? 'font-bold text-text' : 'text-text-muted'}`}>{player2.name}</span>
                </div>
                <span className="text-xs text-text-dim w-24 text-right truncate">
                  {match.round || 'League'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
