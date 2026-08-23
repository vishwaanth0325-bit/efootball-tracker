import React, { useState, useMemo } from 'react';
import type { Player, Match, Tournament } from '../../lib/types';
import { computeAllGroupSummaries, type GroupSummary } from '../../lib/tournamentEngine';
import { ScoreEntry } from '../matches/ScoreEntry';
import { MatchForm } from '../matches/MatchForm';
import { LeaderboardTable } from '../dashboard/LeaderboardTable';
import {
  Users,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Shield,
  Edit3,
  SlidersHorizontal,
  User,
} from 'lucide-react';

interface GroupTablesProps {
  tournament: Tournament;
  tournamentPlayers: Player[];
  matches: Match[];
  groupAssignments?: Record<string, string[]>;
  onUpdateMatch: (match: Match) => void;
  onReassignGroup?: (playerId: string, targetGroup: string) => void;
  onOpenGroupManager?: () => void;
}

export const GroupTables: React.FC<GroupTablesProps> = ({
  tournament,
  tournamentPlayers,
  matches,
  groupAssignments,
  onUpdateMatch,
  onReassignGroup,
  onOpenGroupManager,
}) => {
  const [selectedMatchForScore, setSelectedMatchForScore] = useState<Match | null>(null);
  const [selectedMatchForEdit, setSelectedMatchForEdit] = useState<Match | null>(null);
  const [activeGroupTab, setActiveGroupTab] = useState<string>('all');
  const [reassignPlayerId, setReassignPlayerId] = useState<string | null>(null);

  // Compute live group summaries dynamically from latest matches and players
  const groupSummaries: GroupSummary[] = useMemo(() => {
    return computeAllGroupSummaries(tournament, tournamentPlayers, matches, groupAssignments);
  }, [tournament, tournamentPlayers, matches, groupAssignments]);

  const displayedGroups = activeGroupTab === 'all'
    ? groupSummaries
    : groupSummaries.filter(g => g.groupName === activeGroupTab);

  const allGroupsComplete = groupSummaries.length > 0 && groupSummaries.every(g => g.isComplete);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Group Filter Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border-light pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-2xl font-bold text-text">Group Stages</h3>
            {allGroupsComplete && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Groups Complete
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Single round-robin group stage. Top teams from each group qualify for the Knockout Stage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenGroupManager && (
            <button
              onClick={onOpenGroupManager}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 border-accent/40 hover:border-accent"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent" />
              <span>Split / Manage Groups</span>
            </button>
          )}

          <div className="flex flex-wrap gap-1 bg-surface p-1 rounded-xl border border-border-light">
            <button
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeGroupTab === 'all'
                  ? 'bg-accent text-bg shadow-sm'
                  : 'text-text-muted hover:text-text'
              }`}
              onClick={() => setActiveGroupTab('all')}
            >
              All Groups ({groupSummaries.length})
            </button>
            {groupSummaries.map(g => (
              <button
                key={g.groupName}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                  activeGroupTab === g.groupName
                    ? 'bg-accent text-bg shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                onClick={() => setActiveGroupTab(g.groupName)}
              >
                <span>{g.groupName}</span>
                {g.isComplete && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {displayedGroups.map(group => (
          <div
            key={group.groupName}
            className="card p-5 space-y-6 border border-border-light bg-surface/80 relative overflow-hidden"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between border-b border-border-light pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/40 flex items-center justify-center font-display font-bold text-accent text-lg">
                  {group.groupName.replace('Group ', '')}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-display text-xl font-bold text-text">{group.groupName}</h4>
                    {group.isComplete ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Finished
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {group.completedMatches}/{group.totalMatches} Done
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    {group.players.length} Teams • {group.totalMatches} Fixtures
                  </span>
                </div>
              </div>
            </div>

            {/* Group Standings Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-accent">Standings Table</span>
                <span className="text-text-muted text-[11px]">Top 2 Advance</span>
              </div>

              <div className="rounded-xl border border-border-light overflow-hidden bg-bg/50">
                {group.players.length === 0 ? (
                  <p className="text-xs text-text-muted p-4 text-center">No teams assigned to this group yet.</p>
                ) : (
                  <LeaderboardTable rows={group.standings} />
                )}
              </div>
            </div>

            {/* Group Teams List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <span>Assigned Teams ({group.players.length})</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.players.map((player, idx) => {
                  const isTop2 = idx < 2 && group.standings.findIndex(s => s.player.id === player.id) < 2;
                  return (
                    <div
                      key={player.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                        isTop2 && group.isComplete
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-text'
                          : 'bg-surface border-border-light text-text'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {player.profile_image ? (
                          <img
                            src={player.profile_image}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-accent/40 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-surface-hover border border-border-light flex items-center justify-center font-bold text-xs text-accent shrink-0">
                            {idx + 1}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          {/* HIGHLIGHTED TEAM NAME ON TOP */}
                          <div className="font-bold text-xs text-text truncate flex items-center gap-1">
                            <Shield className="w-3 h-3 text-accent shrink-0" />
                            <span className="truncate">{player.team || player.name}</span>
                          </div>
                          {/* PLAYER NAME BELOW */}
                          {player.team && (
                            <div className="text-[10px] text-text-muted truncate flex items-center gap-0.5 mt-0.5">
                              <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                              <span className="truncate">{player.name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reassign Button if provided */}
                      {onReassignGroup && (
                        <button
                          onClick={() => setReassignPlayerId(player.id)}
                          className="btn btn-ghost p-1 text-text-muted hover:text-accent"
                          title="Move to another group"
                        >
                          <ArrowRightLeft size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Group Fixtures List */}
            {group.matches.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border-light">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Group Fixtures ({group.matches.length})</span>
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    {group.completedMatches} / {group.totalMatches} Completed
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {group.matches.map(m => {
                    const p1 = group.players.find(p => p.id === m.player1_id) || tournamentPlayers.find(p => p.id === m.player1_id);
                    const p2 = group.players.find(p => p.id === m.player2_id) || tournamentPlayers.find(p => p.id === m.player2_id);
                    const isComplete = m.status === 'completed';

                    return (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-surface border border-border-light flex items-center justify-between gap-2 text-xs hover:border-accent/40 transition-colors"
                      >
                        {/* Team 1 (Highlight Team on top, Player below) */}
                        <div className="flex-1 text-right min-w-0">
                          {/* HIGHLIGHTED TEAM NAME */}
                          <div className="font-bold text-xs text-text truncate flex items-center justify-end gap-1">
                            <Shield className="w-2.5 h-2.5 text-accent shrink-0" />
                            <span className="truncate">{p1?.team || p1?.name || 'Team 1'}</span>
                          </div>
                          {/* PLAYER NAME BELOW */}
                          {p1?.team && (
                            <div className="text-[10px] text-text-muted truncate flex items-center justify-end gap-0.5 mt-0.5">
                              <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                              <span className="truncate">{p1.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Score / VS */}
                        <div className="px-2.5 py-1 rounded-lg bg-bg font-mono font-bold shrink-0 border border-border-light/60">
                          {isComplete ? (
                            <span className="text-text font-bold">{m.player1_score} - {m.player2_score}</span>
                          ) : (
                            <span className="text-text-muted uppercase text-[10px]">VS</span>
                          )}
                        </div>

                        {/* Team 2 (Highlight Team on top, Player below) */}
                        <div className="flex-1 text-left min-w-0">
                          {/* HIGHLIGHTED TEAM NAME */}
                          <div className="font-bold text-xs text-text truncate flex items-center justify-start gap-1">
                            <Shield className="w-2.5 h-2.5 text-accent shrink-0" />
                            <span className="truncate">{p2?.team || p2?.name || 'Team 2'}</span>
                          </div>
                          {/* PLAYER NAME BELOW */}
                          {p2?.team && (
                            <div className="text-[10px] text-text-muted truncate flex items-center justify-start gap-0.5 mt-0.5">
                              <User className="w-2.5 h-2.5 text-text-muted shrink-0" />
                              <span className="truncate">{p2.name}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setSelectedMatchForEdit(m)}
                            className="btn btn-ghost p-1 text-text-muted hover:text-accent"
                            title="Edit Fixture"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => setSelectedMatchForScore(m)}
                            className={`btn text-[11px] py-1 px-2.5 shrink-0 ${isComplete ? 'btn-secondary' : 'btn-primary'}`}
                          >
                            {isComplete ? 'Edit Score' : 'Score'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Score Entry Modal for Group Matches */}
      {selectedMatchForScore && (
        <ScoreEntry
          match={selectedMatchForScore}
          player1={tournamentPlayers.find(p => p.id === selectedMatchForScore.player1_id)!}
          player2={tournamentPlayers.find(p => p.id === selectedMatchForScore.player2_id)!}
          onSave={(p1s, p2s, _winnerId, _penP1, _penP2, p1Team, p2Team) => {
            onUpdateMatch({
              ...selectedMatchForScore,
              status: 'completed',
              player1_score: p1s,
              player2_score: p2s,
              player1_team: p1Team,
              player2_team: p2Team,
              updated_at: new Date().toISOString(),
            });
            setSelectedMatchForScore(null);
          }}
          onClose={() => setSelectedMatchForScore(null)}
        />
      )}

      {/* Edit Match Fixture Modal */}
      {selectedMatchForEdit && (
        <MatchForm
          tournamentId={tournament.id}
          players={tournamentPlayers}
          existingMatch={selectedMatchForEdit}
          onSubmit={(updatedData) => {
            onUpdateMatch({
              ...selectedMatchForEdit,
              ...updatedData,
            } as Match);
            setSelectedMatchForEdit(null);
          }}
          onClose={() => setSelectedMatchForEdit(null)}
        />
      )}

      {/* Reassign Player Group Modal */}
      {reassignPlayerId && onReassignGroup && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="card max-w-sm w-full p-6 space-y-4 border border-border-light bg-surface animate-fadeIn">
            <h4 className="font-display font-bold text-lg text-text">Reassign Group</h4>
            <p className="text-xs text-text-muted">
              Select the new group for {tournamentPlayers.find(p => p.id === reassignPlayerId)?.name}:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {groupSummaries.map(g => (
                <button
                  key={g.groupName}
                  onClick={() => {
                    onReassignGroup(reassignPlayerId, g.groupName);
                    setReassignPlayerId(null);
                  }}
                  className="btn btn-secondary text-xs py-2"
                >
                  {g.groupName}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button className="btn btn-ghost text-xs" onClick={() => setReassignPlayerId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
