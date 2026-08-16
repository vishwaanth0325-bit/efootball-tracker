import React, { useState } from 'react';
import type { Match, Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Minus, Plus } from 'lucide-react';

interface ScoreEntryProps {
  match: Match;
  player1: Player;
  player2: Player;
  onSave: (p1Score: number, p2Score: number) => void;
  onClose: () => void;
}

export const ScoreEntry: React.FC<ScoreEntryProps> = ({ match, player1, player2, onSave, onClose }) => {
  const [score1, setScore1] = useState(match.player1_score ?? 0);
  const [score2, setScore2] = useState(match.player2_score ?? 0);

  const handleSave = () => {
    onSave(score1, score2);
  };

  const updateScore = (playerNum: 1 | 2, delta: number) => {
    if (playerNum === 1) {
      setScore1(prev => Math.max(0, Math.min(20, prev + delta)));
    } else {
      setScore2(prev => Math.max(0, Math.min(20, prev + delta)));
    }
  };

  const handleManualInput = (playerNum: 1 | 2, val: string) => {
    const num = parseInt(val);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(20, num));
    if (playerNum === 1) setScore1(clamped);
    else setScore2(clamped);
  };

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth="max-w-2xl">
      <div className="flex flex-col items-center py-6">
        <h2 className="text-xl text-text-muted font-medium mb-8">Match Result</h2>
        
        <div className="flex items-center justify-center w-full gap-8 mb-10">
          <div className="flex-1 flex flex-col items-center gap-4">
            <span className="font-display font-bold text-2xl text-center text-text truncate w-full px-4">
              {player1?.name || 'Unknown'}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => updateScore(1, -1)} className="score-btn w-12 h-12 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text transition-colors">
                <Minus size={24} />
              </button>
              <input 
                type="number" 
                className="score-display w-24 h-24 text-center font-display font-bold text-5xl bg-surface border-2 border-border-light rounded-xl focus:border-accent focus:outline-none text-text"
                value={score1}
                onChange={(e) => handleManualInput(1, e.target.value)}
                min="0" max="20"
              />
              <button onClick={() => updateScore(1, 1)} className="score-btn w-12 h-12 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text transition-colors">
                <Plus size={24} />
              </button>
            </div>
          </div>
          
          <div className="font-display font-bold text-3xl text-text-muted opacity-50 shrink-0">VS</div>
          
          <div className="flex-1 flex flex-col items-center gap-4">
            <span className="font-display font-bold text-2xl text-center text-text truncate w-full px-4">
              {player2?.name || 'Unknown'}
            </span>
            <div className="flex items-center gap-3">
              <button onClick={() => updateScore(2, -1)} className="score-btn w-12 h-12 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text transition-colors">
                <Minus size={24} />
              </button>
              <input 
                type="number" 
                className="score-display w-24 h-24 text-center font-display font-bold text-5xl bg-surface border-2 border-border-light rounded-xl focus:border-accent focus:outline-none text-text"
                value={score2}
                onChange={(e) => handleManualInput(2, e.target.value)}
                min="0" max="20"
              />
              <button onClick={() => updateScore(2, 1)} className="score-btn w-12 h-12 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text transition-colors">
                <Plus size={24} />
              </button>
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="btn btn-primary w-full max-w-md py-4 text-lg font-bold tracking-wide">
          SAVE RESULT
        </button>
        <button onClick={onClose} className="mt-4 text-text-muted hover:text-text transition-colors text-sm underline-offset-4 hover:underline">
          Cancel
        </button>
      </div>
    </Modal>
  );
};
