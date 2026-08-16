import React, { useState } from 'react';
import type { Match, Player } from '../../lib/types';
import { ScoreEntry } from '../matches/ScoreEntry';
import { Trophy, Award, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';

interface KnockoutBracketProps {
  players: Player[];
  knockoutMatches: Match[];
  onSaveScore: (
    match: Match,
    p1Score: number,
    p2Score: number,
    winnerId?: string,
    penaltyP1?: number,
    penaltyP2?: number
  ) => void;
}

export const KnockoutBracket: React.FC<KnockoutBracketProps> = ({
  players,
  knockoutMatches,
  onSaveScore,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [warningMatch, setWarningMatch] = useState<{ match: Match; p1: number; p2: number; winnerId?: string; penP1?: number; penP2?: number } | null>(null);

  // Group knockout matches into rounds in chronological order
  const roundsOrder = ['Round of 16', 'Quarter-Final', 'Semi-Final', 'Final'];
  const groupedRounds = roundsOrder
    .map(rName => ({
      roundName: rName,
      matches: knockoutMatches.filter(m => m.round === rName),
    }))
    .filter(gr => gr.matches.length > 0);

  const finalMatch = knockoutMatches.find(m => m.round === 'Final');
  const isFinalComplete = finalMatch && finalMatch.status === 'completed' && finalMatch.winner_id;
  const champion = isFinalComplete ? players.find(p => p.id === finalMatch.winner_id) : undefined;
  const runnerUpId = isFinalComplete ? (finalMatch.player1_id === finalMatch.winner_id ? finalMatch.player2_id : finalMatch.player1_id) : undefined;
  const runnerUp = isFinalComplete ? players.find(p => p.id === runnerUpId) : undefined;

  const handleScoreSaveAttempt = (
    p1s: number,
    p2s: number,
    winnerId?: string,
    penP1?: number,
    penP2?: number
  ) => {
    if (!selectedMatch) return;

    // Check if downstream match is already completed and winner is changing
    const nextMatch = knockoutMatches.find(m => m.id === selectedMatch.next_match_id);
    const prevWinner = selectedMatch.winner_id;
    const isWinnerChanging = prevWinner && prevWinner !== winnerId;

    if (nextMatch && nextMatch.status === 'completed' && isWinnerChanging) {
      setWarningMatch({ match: selectedMatch, p1: p1s, p2: p2s, winnerId, penP1, penP2 });
      return;
    }

    onSaveScore(selectedMatch, p1s, p2s, winnerId, penP1, penP2);
    setSelectedMatch(null);
  };

  const confirmCascadingEdit = () => {
    if (warningMatch) {
      onSaveScore(
        warningMatch.match,
        warningMatch.p1,
        warningMatch.p2,
        warningMatch.winnerId,
        warningMatch.penP1,
        warningMatch.penP2
      );
      setWarningMatch(null);
      setSelectedMatch(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Champion Banner */}
      {champion && (
        <div className="card p-6 bg-gradient-to-r from-amber-500/20 via-accent/20 to-amber-500/20 border-2 border-amber-400 text-center space-y-3 shadow-xl">
          <div className="inline-flex p-3 rounded-full bg-amber-400 text-bg shadow-lg">
            <Trophy className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest font-bold text-amber-400">Tournament Champion</span>
            <div className="flex items-center justify-center gap-3 mt-1">
              {champion.profile_image && (
                <img
                  src={champion.profile_image}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 shadow"
                />
              )}
              <h2 className="text-3xl sm:text-4xl font-display font-bold text-text">{champion.name}</h2>
            </div>
            {champion.team && (
              <p className="text-sm text-text-muted mt-1 flex items-center justify-center gap-1.5 font-semibold">
                <Shield className="w-4 h-4 text-accent" />
                <span>{champion.team}</span>
              </p>
            )}
          </div>
          {runnerUp && (
            <div className="text-xs text-text-muted pt-2 border-t border-amber-400/20 flex items-center justify-center gap-2">
              <Award className="w-4 h-4 text-slate-400" />
              <span>Runner-up: <strong>{runnerUp.name}</strong> {runnerUp.team ? `(${runnerUp.team})` : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Bracket Tree */}
      <div className="card p-6 border border-border-light bg-surface/70 overflow-x-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-display text-xl font-bold text-text">World Cup Knockout Stage</h3>
          </div>
          <span className="text-xs text-text-muted">Click any matchup card to enter or update results</span>
        </div>

        <div className="flex items-stretch gap-8 min-w-[850px] py-4">
          {groupedRounds.map((gr, rIdx) => (
            <div key={gr.roundName} className="flex-1 flex flex-col justify-around min-w-[260px] space-y-4">
              {/* Round Header */}
              <div className="p-2.5 rounded-xl bg-surface border border-border-light text-center font-display font-bold text-sm text-accent flex items-center justify-between shadow-sm">
                <span className="text-xs text-text-muted">Round {rIdx + 1}</span>
                <span>{gr.roundName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">
                  {gr.matches.length}
                </span>
              </div>

              {/* Round Match Nodes */}
              <div className="space-y-6 my-auto">
                {gr.matches.map(match => {
                  const p1 = players.find(p => p.id === match.player1_id);
                  const p2 = players.find(p => p.id === match.player2_id);
                  const isComplete = match.status === 'completed';
                  const isLocked = !p1 || !p2;

                  const p1Won = isComplete && match.winner_id === p1?.id;
                  const p2Won = isComplete && match.winner_id === p2?.id;

                  return (
                    <div
                      key={match.id}
                      onClick={() => !isLocked && setSelectedMatch(match)}
                      className={`p-3.5 rounded-2xl border transition-all shadow-sm space-y-2 relative group ${
                        isLocked
                          ? 'bg-surface/40 border-border-light/40 opacity-70 cursor-not-allowed'
                          : 'bg-surface border-border-light hover:border-accent hover:scale-[1.02] cursor-pointer'
                      }`}
                    >
                      {/* Match Code / Tag */}
                      <div className="flex items-center justify-between text-[11px] text-text-muted border-b border-border-light/40 pb-1.5">
                        <span className="font-mono font-bold text-accent">{match.match_code || gr.roundName}</span>
                        {isComplete ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </span>
                        ) : isLocked ? (
                          <span className="text-text-muted italic">Waiting for qualifier</span>
                        ) : (
                          <span className="text-accent font-medium">Ready</span>
                        )}
                      </div>

                      {/* Participant 1 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors ${
                          p1Won
                            ? 'bg-accent/20 border border-accent/40 text-accent font-bold'
                            : 'bg-bg/40 text-text'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {p1?.profile_image ? (
                            <img
                              src={p1.profile_image}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover border border-accent/40 shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-hover border border-border-light flex items-center justify-center text-[10px] text-text-muted shrink-0">
                              {p1 ? p1.name.slice(0, 1) : '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 truncate">
                            <span className="truncate block font-semibold">
                              {p1 ? p1.name : match.player1_placeholder || 'Waiting for Qualifier'}
                            </span>
                            {p1?.team && (
                              <span className="text-[10px] text-text-muted font-normal block truncate flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5 text-accent shrink-0" />
                                <span>{p1.team}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="font-mono font-bold text-sm px-2 rounded bg-surface shrink-0 ml-2">
                          {isComplete ? match.player1_score : '-'}
                        </span>
                      </div>

                      {/* Participant 2 */}
                      <div
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors ${
                          p2Won
                            ? 'bg-accent/20 border border-accent/40 text-accent font-bold'
                            : 'bg-bg/40 text-text'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {p2?.profile_image ? (
                            <img
                              src={p2.profile_image}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover border border-accent/40 shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-surface-hover border border-border-light flex items-center justify-center text-[10px] text-text-muted shrink-0">
                              {p2 ? p2.name.slice(0, 1) : '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1 truncate">
                            <span className="truncate block font-semibold">
                              {p2 ? p2.name : match.player2_placeholder || 'Waiting for Qualifier'}
                            </span>
                            {p2?.team && (
                              <span className="text-[10px] text-text-muted font-normal block truncate flex items-center gap-1">
                                <Shield className="w-2.5 h-2.5 text-accent shrink-0" />
                                <span>{p2.team}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="font-mono font-bold text-sm px-2 rounded bg-surface shrink-0 ml-2">
                          {isComplete ? match.player2_score : '-'}
                        </span>
                      </div>

                      {/* Penalty / Details note */}
                      {isComplete && match.penalty_player1_score !== undefined && (
                        <div className="text-[10px] text-center text-amber-400 font-mono">
                          Penalties: {match.penalty_player1_score} - {match.penalty_player2_score}
                        </div>
                      )}

                      {!isLocked && (
                        <div className="text-[10px] text-center text-text-muted group-hover:text-accent pt-1">
                          {isComplete ? 'Click to Edit Result' : 'Click to Record Score'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score Entry Modal for Knockout matches */}
      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={players.find(p => p.id === selectedMatch.player1_id)!}
          player2={players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={handleScoreSaveAttempt}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Cascading Warning Modal */}
      {warningMatch && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 space-y-4 border-2 border-amber-500 bg-surface animate-fadeIn">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h4 className="font-display font-bold text-lg text-text">Cascading Bracket Warning</h4>
            </div>

            <p className="text-sm text-text-muted">
              Changing this result changes the advancing winner into downstream knockout matches that have already been played.
            </p>
            <p className="text-xs text-amber-400/90 font-medium bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
              Continuing will update the participant in the next round. Do you wish to continue?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button className="btn btn-secondary" onClick={() => setWarningMatch(null)}>
                Cancel
              </button>
              <button className="btn btn-primary bg-amber-600 hover:bg-amber-500" onClick={confirmCascadingEdit}>
                Confirm & Update Bracket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
