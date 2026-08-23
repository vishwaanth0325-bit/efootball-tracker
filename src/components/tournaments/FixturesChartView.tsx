import React, { useState, useMemo } from 'react';
import type { Match, Player, Tournament } from '../../lib/types';
import { ScoreEntry } from '../matches/ScoreEntry';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Trophy, Activity, Target, Flame, GitBranch, BarChart3 } from 'lucide-react';

interface FixturesChartViewProps {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
  onUpdateMatch: (match: Match) => void;
}

export const FixturesChartView: React.FC<FixturesChartViewProps> = ({
  tournament,
  players,
  matches,
  onUpdateMatch,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'bracket' | 'analytics'>(
    tournament.format === 'knockout' ? 'bracket' : 'analytics'
  );

  // Group matches by round for bracket / progression view
  const roundsMap = useMemo(() => {
    const map = new Map<string, Match[]>();
    matches.forEach(m => {
      const r = m.round || 'Round 1';
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    });
    return map;
  }, [matches]);

  const roundNames = Array.from(roundsMap.keys());

  // Statistics calculation for analytics chart
  const analyticsData = useMemo(() => {
    // 1. Team Goals For & Against
    const teamGoalsMap = new Map<string, { name: string; goalsFor: number; goalsAgainst: number; played: number }>();
    players.forEach(p => {
      teamGoalsMap.set(p.id, { name: p.name.substring(0, 10), goalsFor: 0, goalsAgainst: 0, played: 0 });
    });

    let totalGoals = 0;
    let completedCount = 0;
    let maxMatchGoals = 0;

    matches.forEach(m => {
      if (m.status === 'completed' && m.player1_score !== undefined && m.player2_score !== undefined) {
        completedCount++;
        const matchTotal = m.player1_score + m.player2_score;
        totalGoals += matchTotal;

        if (matchTotal > maxMatchGoals) {
          maxMatchGoals = matchTotal;
        }

        if (m.player1_id) {
          const p1Data = teamGoalsMap.get(m.player1_id);
          if (p1Data) {
            p1Data.goalsFor += m.player1_score;
            p1Data.goalsAgainst += m.player2_score;
            p1Data.played++;
          }
        }

        if (m.player2_id) {
          const p2Data = teamGoalsMap.get(m.player2_id);
          if (p2Data) {
            p2Data.goalsFor += m.player2_score;
            p2Data.goalsAgainst += m.player1_score;
            p2Data.played++;
          }
        }
      }
    });

    const teamGoalsChart = Array.from(teamGoalsMap.values())
      .filter(t => t.played > 0)
      .sort((a, b) => b.goalsFor - a.goalsFor);

    // 2. Goals per Round progression
    const roundProgressionChart = roundNames.map(rName => {
      const rMatches = roundsMap.get(rName) || [];
      let rGoals = 0;
      let rCompleted = 0;
      rMatches.forEach(m => {
        if (m.status === 'completed' && m.player1_score !== undefined && m.player2_score !== undefined) {
          rGoals += m.player1_score + m.player2_score;
          rCompleted++;
        }
      });
      return {
        round: rName.replace('Group ', 'G-').replace('Match ', 'M'),
        goals: rGoals,
        avgGoals: rCompleted > 0 ? Number((rGoals / rCompleted).toFixed(1)) : 0,
        matchesCount: rMatches.length,
      };
    });

    return {
      teamGoalsChart,
      roundProgressionChart,
      totalGoals,
      completedCount,
      avgGoalsPerMatch: completedCount > 0 ? (totalGoals / completedCount).toFixed(1) : '0.0',
      maxMatchGoals,
    };
  }, [players, matches, roundNames, roundsMap]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Controls & Metrics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-light pb-4">
        <div>
          <h3 className="font-display text-2xl font-bold text-text">Visual Fixtures & Graphs</h3>
          <p className="text-xs text-text-muted">Interactive bracket flow, performance charts, and goal statistics</p>
        </div>

        <div className="flex bg-surface rounded-xl p-1 border border-border-light">
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeChartTab === 'bracket'
                ? 'bg-accent text-bg shadow-md'
                : 'text-text-muted hover:text-text'
            }`}
            onClick={() => setActiveChartTab('bracket')}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Bracket / Flow View
          </button>
          <button
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeChartTab === 'analytics'
                ? 'bg-accent text-bg shadow-md'
                : 'text-text-muted hover:text-text'
            }`}
            onClick={() => setActiveChartTab('analytics')}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Analytics Charts
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3 border border-border-light">
          <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-text-muted">Total Goals</div>
            <div className="text-2xl font-display font-bold text-accent">{analyticsData.totalGoals}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 border border-border-light">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-text-muted">Goals / Match</div>
            <div className="text-2xl font-display font-bold text-blue-400">{analyticsData.avgGoalsPerMatch}</div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 border border-border-light">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-text-muted">Completed Matches</div>
            <div className="text-2xl font-display font-bold text-emerald-400">
              {analyticsData.completedCount} / {matches.length}
            </div>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3 border border-border-light">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Flame className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-text-muted">Max Match Score</div>
            <div className="text-2xl font-display font-bold text-purple-400">
              {analyticsData.maxMatchGoals > 0 ? `${analyticsData.maxMatchGoals} Goals` : '0'}
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: Bracket Flow View */}
      {activeChartTab === 'bracket' && (
        <div className="card p-6 border border-border-light bg-surface/60 overflow-x-auto space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-lg font-bold flex items-center gap-2 text-accent">
              <GitBranch className="w-5 h-5" />
              Tournament Progression Tree
            </h4>
            <span className="text-xs text-text-muted">Click any match node to record or update score</span>
          </div>

          {roundNames.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">No matches in schedule yet.</div>
          ) : (
            <div className="flex items-start gap-8 min-w-[700px] py-4">
              {roundNames.map((rName, rIdx) => {
                const rMatches = roundsMap.get(rName) || [];
                return (
                  <div key={rName} className="flex-1 space-y-4 min-w-[240px]">
                    {/* Round Header */}
                    <div className="p-2.5 rounded-xl bg-surface border border-border-light text-center font-display font-bold text-sm text-text flex items-center justify-between">
                      <span className="text-accent text-xs">#{rIdx + 1}</span>
                      <span className="truncate">{rName}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">
                        {rMatches.length}
                      </span>
                    </div>

                    {/* Round Match Nodes */}
                    <div className="space-y-4">
                      {rMatches.map(m => {
                        const p1 = players.find(p => p.id === m.player1_id);
                        const p2 = players.find(p => p.id === m.player2_id);
                        const isComplete = m.status === 'completed';
                        const p1Win = isComplete && (m.player1_score ?? 0) > (m.player2_score ?? 0);
                        const p2Win = isComplete && (m.player2_score ?? 0) > (m.player1_score ?? 0);

                        return (
                          <div
                            key={m.id}
                            onClick={() => setSelectedMatch(m)}
                            className="p-3 rounded-xl bg-surface border border-border-light hover:border-accent cursor-pointer transition-all hover:scale-[1.02] shadow-sm space-y-2 relative group"
                          >
                            {/* Player 1 */}
                            <div className={`flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg ${
                              p1Win ? 'bg-accent/15 text-accent font-bold' : 'text-text'
                            }`}>
                              <span className="truncate flex-1">{p1?.name || 'Player 1'}</span>
                              <span className="font-mono text-sm px-1.5 rounded bg-bg shrink-0">
                                {isComplete ? m.player1_score : '-'}
                              </span>
                            </div>

                            {/* Player 2 */}
                            <div className={`flex items-center justify-between text-xs font-semibold p-1.5 rounded-lg ${
                              p2Win ? 'bg-accent/15 text-accent font-bold' : 'text-text'
                            }`}>
                              <span className="truncate flex-1">{p2?.name || 'Player 2'}</span>
                              <span className="font-mono text-sm px-1.5 rounded bg-bg shrink-0">
                                {isComplete ? m.player2_score : '-'}
                              </span>
                            </div>

                            <div className="text-[10px] text-center text-text-muted group-hover:text-accent flex items-center justify-center gap-1 pt-1 border-t border-border-light/50">
                              <span>{isComplete ? 'Click to Edit Score' : 'Click to Enter Result'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: Analytics Charts */}
      {activeChartTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Goals Scored vs Conceded */}
          <div className="card p-6 border border-border-light space-y-4">
            <div>
              <h4 className="font-display text-lg font-bold text-text">Goals Scored vs Conceded</h4>
              <p className="text-xs text-text-muted">Offensive vs Defensive performance by participant</p>
            </div>

            {analyticsData.teamGoalsChart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-text-muted text-xs">
                No completed matches with scores yet.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.teamGoalsChart} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                    <XAxis dataKey="name" stroke="#8892b0" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                    <YAxis stroke="#8892b0" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#131722', borderColor: '#2a2e39', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Bar dataKey="goalsFor" name="Goals Scored" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="goalsAgainst" name="Goals Conceded" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Chart 2: Goals Trend Across Rounds */}
          <div className="card p-6 border border-border-light space-y-4">
            <div>
              <h4 className="font-display text-lg font-bold text-text">Scoring Trend Across Matchdays</h4>
              <p className="text-xs text-text-muted">Total and average goals scored per tournament round</p>
            </div>

            {analyticsData.roundProgressionChart.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-text-muted text-xs">
                No rounds available yet.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.roundProgressionChart} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="goalsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                    <XAxis dataKey="round" stroke="#8892b0" fontSize={11} />
                    <YAxis stroke="#8892b0" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#131722', borderColor: '#2a2e39', borderRadius: '8px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="goals" name="Total Goals" stroke="#3b82f6" fillOpacity={1} fill="url(#goalsGrad)" />
                    <Area type="monotone" dataKey="avgGoals" name="Avg Goals / Match" stroke="#f59e0b" fillOpacity={0.1} fill="#f59e0b" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score Entry Modal for Chart / Bracket nodes */}
      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={players.find(p => p.id === selectedMatch.player1_id)!}
          player2={players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={(p1s, p2s, _winnerId, _penP1, _penP2, p1Team, p2Team) => {
            onUpdateMatch({
              ...selectedMatch,
              status: 'completed',
              player1_score: p1s,
              player2_score: p2s,
              player1_team: p1Team,
              player2_team: p2Team,
              updated_at: new Date().toISOString(),
            });
            setSelectedMatch(null);
          }}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
};
