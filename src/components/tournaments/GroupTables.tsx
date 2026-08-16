import React, { useState } from 'react';
import type { Player, Match, Tournament } from '../../lib/types';
import { computeStandings } from '../../lib/calculations';
import { LeaderboardTable } from '../dashboard/LeaderboardTable';
import { ScoreEntry } from '../matches/ScoreEntry';
import { Users, Calendar } from 'lucide-react';

interface GroupTablesProps {
  tournament: Tournament;
  tournamentPlayers: Player[];
  matches: Match[];
  onUpdateMatch: (match: Match) => void;
}

export interface GroupData {
  groupName: string;
  players: Player[];
  matches: Match[];
}

export const GroupTables: React.FC<GroupTablesProps> = ({
  tournament,
  tournamentPlayers,
  matches,
  onUpdateMatch,
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeGroupTab, setActiveGroupTab] = useState<string>('all');

  // Detect group names from match rounds (e.g. "Group A - Round 1")
  const detectedGroups = new Set<string>();
  matches.forEach(m => {
    if (m.round && m.round.toLowerCase().startsWith('group')) {
      const gName = m.round.split(' - ')[0].trim();
      if (gName) detectedGroups.add(gName);
    }
  });

  const groupNames = Array.from(detectedGroups).sort();

  // If no group matches generated yet, split players evenly into Group A and Group B
  let groups: GroupData[] = [];

  if (groupNames.length > 0) {
    groups = groupNames.map(gName => {
      const groupMatches = matches.filter(m => m.round && m.round.startsWith(gName));
      const playerIdsInGroup = new Set<string>();
      groupMatches.forEach(m => {
        playerIdsInGroup.add(m.player1_id);
        playerIdsInGroup.add(m.player2_id);
      });
      const groupPlayers = tournamentPlayers.filter(p => playerIdsInGroup.has(p.id));
      return {
        groupName: gName,
        players: groupPlayers,
        matches: groupMatches,
      };
    });
  } else {
    // Fallback: Partition players 50/50 into Group A and Group B
    const half = Math.ceil(tournamentPlayers.length / 2);
    const groupAPlayers = tournamentPlayers.slice(0, half);
    const groupBPlayers = tournamentPlayers.slice(half);

    groups = [
      { groupName: 'Group A', players: groupAPlayers, matches: [] },
      { groupName: 'Group B', players: groupBPlayers, matches: [] },
    ];
  }

  const displayedGroups = activeGroupTab === 'all'
    ? groups
    : groups.filter(g => g.groupName === activeGroupTab);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Group Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-light pb-3">
        <div>
          <h3 className="font-display text-2xl font-bold text-text">Group Stages</h3>
          <p className="text-xs text-text-muted">Standings, participants, and intra-group fixtures per group</p>
        </div>

        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeGroupTab === 'all'
                ? 'bg-accent text-bg shadow-sm'
                : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text'
            }`}
            onClick={() => setActiveGroupTab('all')}
          >
            All Groups ({groups.length})
          </button>
          {groups.map(g => (
            <button
              key={g.groupName}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                activeGroupTab === g.groupName
                  ? 'bg-accent text-bg shadow-sm'
                  : 'bg-surface hover:bg-surface-hover text-text-muted hover:text-text'
              }`}
              onClick={() => setActiveGroupTab(g.groupName)}
            >
              {g.groupName}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Groups */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {displayedGroups.map(group => {
          const groupStandings = computeStandings(
            tournament.id,
            group.players,
            group.matches,
            tournament
          );

          return (
            <div
              key={group.groupName}
              className="card p-5 space-y-6 border border-border-light bg-surface/80 relative overflow-hidden"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between border-b border-border-light pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center font-display font-bold text-accent text-lg">
                    {group.groupName.replace('Group ', '')}
                  </div>
                  <div>
                    <h4 className="font-display text-xl font-bold text-text">{group.groupName}</h4>
                    <span className="text-xs text-text-muted">
                      {group.players.length} Teams • {group.matches.length} Fixtures
                    </span>
                  </div>
                </div>
              </div>

              {/* Group Standings Table */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                  <span>Standings Table</span>
                </h5>
                <div className="rounded-xl border border-border-light overflow-hidden bg-bg/50">
                  {group.players.length === 0 ? (
                    <p className="text-xs text-text-muted p-4 text-center">No teams in this group yet.</p>
                  ) : (
                    <LeaderboardTable rows={groupStandings} />
                  )}
                </div>
              </div>

              {/* Group Teams List */}
              <div className="space-y-2">
                <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <span>Assigned Teams ({group.players.length})</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.players.map((player, idx) => (
                    <div
                      key={player.id}
                      className="p-2.5 rounded-lg bg-surface border border-border-light flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center font-bold text-xs text-accent shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-text truncate">{player.name}</div>
                        <div className="text-[10px] text-text-muted truncate">
                          @{player.efootball_username} {player.team ? `• ${player.team}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover font-mono text-text-muted">
                        {player.platform}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group Recent & Upcoming Matches */}
              {group.matches.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border-light">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-accent" />
                    <span>Group Fixtures ({group.matches.length})</span>
                  </h5>
                  <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                    {group.matches.map(m => {
                      const p1 = group.players.find(p => p.id === m.player1_id) || tournamentPlayers.find(p => p.id === m.player1_id);
                      const p2 = group.players.find(p => p.id === m.player2_id) || tournamentPlayers.find(p => p.id === m.player2_id);
                      const isComplete = m.status === 'completed';

                      return (
                        <div
                          key={m.id}
                          className="p-2.5 rounded-lg bg-surface border border-border-light flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex-1 text-right font-medium truncate">{p1?.name || 'Player 1'}</div>
                          <div className="px-2 py-0.5 rounded bg-bg font-mono font-bold shrink-0">
                            {isComplete ? `${m.player1_score} - ${m.player2_score}` : 'vs'}
                          </div>
                          <div className="flex-1 text-left font-medium truncate">{p2?.name || 'Player 2'}</div>
                          <button
                            onClick={() => setSelectedMatch(m)}
                            className="btn btn-ghost text-[11px] py-1 px-2 text-accent hover:underline shrink-0"
                          >
                            {isComplete ? 'Edit' : 'Score'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Score Entry Modal for Group Matches */}
      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={tournamentPlayers.find(p => p.id === selectedMatch.player1_id)!}
          player2={tournamentPlayers.find(p => p.id === selectedMatch.player2_id)!}
          onSave={(p1s, p2s) => {
            onUpdateMatch({
              ...selectedMatch,
              status: 'completed',
              player1_score: p1s,
              player2_score: p2s,
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
