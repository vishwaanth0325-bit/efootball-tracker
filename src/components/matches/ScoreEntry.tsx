import React, { useState } from 'react';
import type { Match, Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { Minus, Plus, Trophy, Award, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';

interface ScoreEntryProps {
  match: Match;
  player1: Player;
  player2: Player;
  onSave: (
    p1Score: number,
    p2Score: number,
    winnerId?: string,
    penaltyP1?: number,
    penaltyP2?: number,
    p1Team?: string,
    p2Team?: string
  ) => void;
  onClose: () => void;
}

export const ScoreEntry: React.FC<ScoreEntryProps> = ({
  match,
  player1,
  player2,
  onSave,
  onClose,
}) => {
  const { state, updateMatch, updateTournament } = useApp();
  const { showToast } = useToast();

  const isKnockout = match.stage === 'knockout' || !match.group_name && match.round && !match.round.startsWith('Group') && (match.round.includes('Final') || match.round.includes('Round of'));

  const [score1, setScore1] = useState(match.player1_score ?? 0);
  const [score2, setScore2] = useState(match.player2_score ?? 0);
  const [team1, setTeam1] = useState(match.player1_team || '');
  const [team2, setTeam2] = useState(match.player2_team || '');
  const [isUndoing, setIsUndoing] = useState(false);

  // Penalty / Winner override if tie in knockout
  const [penaltyP1, setPenaltyP1] = useState<number>(match.penalty_player1_score ?? 0);
  const [penaltyP2, setPenaltyP2] = useState<number>(match.penalty_player2_score ?? 0);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>(
    match.winner_id || (score1 > score2 ? player1?.id : score2 > score1 ? player2?.id : '')
  );

  const isTie = score1 === score2;
  const requiresWinner = isKnockout && isTie;

  const handleSave = () => {
    let winnerId: string | undefined = undefined;
    if (score1 > score2) winnerId = player1?.id;
    else if (score2 > score1) winnerId = player2?.id;
    else if (requiresWinner) {
      if (penaltyP1 > penaltyP2) winnerId = player1?.id;
      else if (penaltyP2 > penaltyP1) winnerId = player2?.id;
      else winnerId = selectedWinnerId || undefined;
    }

    onSave(
      score1,
      score2,
      winnerId,
      requiresWinner ? penaltyP1 : undefined,
      requiresWinner ? penaltyP2 : undefined,
      team1,
      team2
    );
  };

  const handleUndo = async () => {
    setIsUndoing(true);
    try {
      const success = await updateMatch({
        ...match,
        status: 'upcoming',
        player1_score: undefined,
        player2_score: undefined,
        player1_team: undefined,
        player2_team: undefined,
        penalty_player1_score: undefined,
        penalty_player2_score: undefined,
        winner_id: undefined,
        updated_at: new Date().toISOString(),
      } as any);

      if (!success) return;

      if (match.winner_id && match.next_match_id) {
        const downstream = state.matches.find(m => m.id === match.next_match_id);
        if (downstream) {
          const slot = match.next_match_slot === 'player1' ? 'player1_id' : 'player2_id';
          await updateMatch({
            ...downstream,
            [slot]: undefined,
          } as any);
        }
      }

      if (match.round === 'Final' && match.winner_id) {
        const t = state.tournaments.find(tour => tour.id === match.tournament_id);
        if (t && t.champion_id === match.winner_id) {
          await updateTournament({
            ...t,
            status: 'ongoing',
            champion_id: undefined,
          });
        }
      }

      showToast('Match result undone successfully', 'success');
      onClose();
    } finally {
      setIsUndoing(false);
    }
  };

  const updateScore = (playerNum: 1 | 2, delta: number) => {
    if (playerNum === 1) {
      const next = Math.max(0, Math.min(20, score1 + delta));
      setScore1(next);
      if (!requiresWinner) {
        if (next > score2) setSelectedWinnerId(player1?.id || '');
        else if (score2 > next) setSelectedWinnerId(player2?.id || '');
      }
    } else {
      const next = Math.max(0, Math.min(20, score2 + delta));
      setScore2(next);
      if (!requiresWinner) {
        if (score1 > next) setSelectedWinnerId(player1?.id || '');
        else if (next > score1) setSelectedWinnerId(player2?.id || '');
      }
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
      <div className="flex flex-col items-center py-6 px-2">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-display font-bold text-text">Record Match Result</h2>
          {match.round && <p className="text-xs text-accent font-medium mt-1">{match.round}</p>}
        </div>

        {/* Regular Time Score Input */}
        <div className="flex items-center justify-center w-full gap-4 sm:gap-8 mb-6">
          {/* Player 1 */}
          <div className="flex-1 flex flex-col items-center gap-3">
            <span className="font-display font-bold text-lg text-center text-text truncate w-full px-2">
              {player1?.name || 'Player 1'}
            </span>
            <input 
              type="text" 
              placeholder="Team Used (Optional)" 
              className="text-center bg-surface border border-border-light rounded-lg px-2 py-1 text-xs w-full max-w-[140px] focus:border-accent outline-none"
              value={team1}
              onChange={(e) => setTeam1(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateScore(1, -1)}
                className="w-10 h-10 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text"
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                className="w-20 h-20 text-center font-display font-bold text-4xl bg-surface border-2 border-border-light rounded-xl focus:border-accent text-text"
                value={score1}
                onChange={(e) => handleManualInput(1, e.target.value)}
                min="0"
                max="20"
              />
              <button
                onClick={() => updateScore(1, 1)}
                className="w-10 h-10 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="font-display font-bold text-2xl text-text-muted opacity-40 shrink-0">VS</div>

          {/* Player 2 */}
          <div className="flex-1 flex flex-col items-center gap-3">
            <span className="font-display font-bold text-lg text-center text-text truncate w-full px-2">
              {player2?.name || 'Player 2'}
            </span>
            <input 
              type="text" 
              placeholder="Team Used (Optional)" 
              className="text-center bg-surface border border-border-light rounded-lg px-2 py-1 text-xs w-full max-w-[140px] focus:border-accent outline-none"
              value={team2}
              onChange={(e) => setTeam2(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateScore(2, -1)}
                className="w-10 h-10 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text"
              >
                <Minus size={20} />
              </button>
              <input
                type="number"
                className="w-20 h-20 text-center font-display font-bold text-4xl bg-surface border-2 border-border-light rounded-xl focus:border-accent text-text"
                value={score2}
                onChange={(e) => handleManualInput(2, e.target.value)}
                min="0"
                max="20"
              />
              <button
                onClick={() => updateScore(2, 1)}
                className="w-10 h-10 rounded-full bg-surface hover:bg-surface-hover border border-border-light flex items-center justify-center text-text"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Knockout Tiebreaker Section */}
        {requiresWinner && (
          <div className="w-full max-w-lg p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
              <Award className="w-4 h-4" />
              Knockout Tiebreaker (Winner Required)
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSelectedWinnerId(player1.id)}
                className={`p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                  selectedWinnerId === player1.id
                    ? 'bg-accent/20 border-accent text-accent font-bold shadow-sm'
                    : 'bg-surface border-border-light text-text-muted hover:text-text'
                }`}
              >
                <span className="truncate">{player1.name}</span>
                {selectedWinnerId === player1.id && <Trophy className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setSelectedWinnerId(player2.id)}
                className={`p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                  selectedWinnerId === player2.id
                    ? 'bg-accent/20 border-accent text-accent font-bold shadow-sm'
                    : 'bg-surface border-border-light text-text-muted hover:text-text'
                }`}
              >
                <span className="truncate">{player2.name}</span>
                {selectedWinnerId === player2.id && <Trophy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Penalty Shootout Scores */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-amber-500/20 text-xs">
              <span className="text-text-muted">Penalty Shootout Score:</span>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="number"
                  value={penaltyP1}
                  onChange={(e) => setPenaltyP1(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 text-center p-1 rounded bg-surface border border-border-light"
                  min="0"
                />
                <span>-</span>
                <input
                  type="number"
                  value={penaltyP2}
                  onChange={(e) => setPenaltyP2(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-12 text-center p-1 rounded bg-surface border border-border-light"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={Boolean(requiresWinner && !selectedWinnerId) || isUndoing}
          className="btn btn-primary w-full max-w-md py-3.5 text-base font-bold tracking-wide disabled:opacity-50"
        >
          {requiresWinner && !selectedWinnerId ? 'Select Match Winner to Save' : 'SAVE RESULT'}
        </button>

        {match.status === 'completed' && (
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="btn btn-outline border-red-500/50 text-red-500 hover:bg-red-500/10 w-full max-w-md py-2.5 mt-3 text-sm font-semibold disabled:opacity-50"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Undo Match Result
          </button>
        )}

        <button onClick={onClose} className="mt-4 text-text-muted hover:text-text text-xs underline">
          Cancel
        </button>
      </div>
    </Modal>
  );
};
