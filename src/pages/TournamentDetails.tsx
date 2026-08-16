import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { computeStandings } from '../lib/calculations';
import {
  computeAllGroupSummaries,
  checkAllGroupsComplete,
  generateAllGroupFixtures,
  buildDefaultGroupAssignments,
  generateKnockoutBracketMatches,
  advanceKnockoutWinner,
  computeTournamentProgress,
} from '../lib/tournamentEngine';
import { generateFixtures } from '../lib/fixtures';
import type { Match, TournamentFormat } from '../lib/types';
import { LeaderboardTable } from '../components/dashboard/LeaderboardTable';
import { UpcomingMatches } from '../components/dashboard/UpcomingMatches';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { MatchForm } from '../components/matches/MatchForm';
import { GroupTables } from '../components/tournaments/GroupTables';
import { KnockoutBracket } from '../components/tournaments/KnockoutBracket';
import { FixturesChartView } from '../components/tournaments/FixturesChartView';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import {
  ChevronLeft,
  Users,
  Trophy,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  BarChart3,
  List,
  GitBranch,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

type Tab = 'overview' | 'groups' | 'knockout' | 'players' | 'fixtures' | 'standings';

const TournamentDetails: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const {
    state,
    addTournamentPlayers,
    removeTournamentPlayer,
    addMatch,
    addMatches,
    updateMatch,
    deleteMatch,
    deleteTournamentMatches,
    updateTournament,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [fixturesViewMode, setFixturesViewMode] = useState<'list' | 'chart'>('list');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [selectedPlayerIdsToAdd, setSelectedPlayerIdsToAdd] = useState<string[]>([]);

  // Custom match form
  const [showCustomMatchModal, setShowCustomMatchModal] = useState(false);

  // Fixtures generation modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genFormat, setGenFormat] = useState<TournamentFormat>('group_knockout');
  const [numGroups, setNumGroups] = useState(8);

  const [showClearFixturesConfirm, setShowClearFixturesConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (state.loading) {
    return <LoadingSpinner fullPage />;
  }

  const tournament = state.tournaments.find(t => t.id === tournamentId);

  if (!tournament) {
    return <EmptyState title="Tournament Not Found" icon={Trophy} />;
  }

  const tournamentPlayers = state.tournamentPlayers
    .filter(tp => tp.tournament_id === tournament.id)
    .map(tp => state.players.find(p => p.id === tp.player_id)!)
    .filter(Boolean);

  const matches = state.matches.filter(m => m.tournament_id === tournament.id);
  const upcomingMatches = matches.filter(m => m.status === 'upcoming');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const groupMatches = matches.filter(m => m.stage === 'group' || (m.round && m.round.toLowerCase().startsWith('group')));
  const knockoutMatches = matches.filter(m => m.stage === 'knockout' || (m.round && !m.round.toLowerCase().startsWith('group')));

  const isGroupsOrWorldCup =
    tournament.format === 'group_knockout' ||
    tournament.format === 'groups' ||
    groupMatches.length > 0;

  // Compute live group summaries
  const groupSummaries = useMemo(() => {
    return computeAllGroupSummaries(
      tournament,
      tournamentPlayers,
      matches,
      tournament.group_config?.group_assignments ? { ...(tournament.group_config.group_assignments as any) } : undefined
    );
  }, [tournament, tournamentPlayers, matches]);

  const allGroupsComplete = useMemo(() => checkAllGroupsComplete(groupSummaries), [groupSummaries]);

  // Overall Tournament Progress
  const progress = useMemo(() => {
    return computeTournamentProgress(matches, tournamentPlayers);
  }, [matches, tournamentPlayers]);

  const standings = computeStandings(tournament.id, tournamentPlayers, matches, tournament);
  const availablePlayers = state.players.filter(
    p => !tournamentPlayers.find(tp => tp.id === p.id)
  );

  const handleOpenAddPlayerModal = () => {
    setSelectedPlayerIdsToAdd(availablePlayers.map(p => p.id));
    setShowAddPlayer(true);
  };

  const handleAddPlayersSubmit = async () => {
    if (selectedPlayerIdsToAdd.length > 0) {
      setIsProcessing(true);
      try {
        const success = await addTournamentPlayers(tournament.id, selectedPlayerIdsToAdd);
        if (success) {
          showToast(`Added ${selectedPlayerIdsToAdd.length} player(s) to tournament`, 'success');
          setSelectedPlayerIdsToAdd([]);
          setShowAddPlayer(false);
        }
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleOpenGenerateModal = () => {
    setGenFormat(tournament.format);
    setShowGenerateModal(true);
  };

  // Generate Initial Group Fixtures or League/Knockout
  const handleExecuteGenerateFixtures = async () => {
    const playerIds = tournamentPlayers.map(p => p.id);
    if (playerIds.length < 2) {
      showToast('Need at least 2 players to generate fixtures', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      if (genFormat === 'group_knockout' || genFormat === 'groups') {
        // Group Stage generator (World Cup style)
        const groupCount = Math.min(numGroups, Math.max(2, Math.floor(playerIds.length / 2)));
        const groupAssignments = buildDefaultGroupAssignments(playerIds, groupCount);
        const groupFixtures = generateAllGroupFixtures(tournament.id, groupAssignments);

        if (groupFixtures.length > 0) {
          const success = await addMatches(groupFixtures as any);
          if (success) {
            showToast(`Generated ${groupFixtures.length} group matches across ${groupCount} groups!`, 'success');
            setActiveTab('groups');
          }
        }
      } else {
        // Standard League or Knockout
        const newFixtures = generateFixtures(
          tournament.id,
          playerIds,
          false,
          matches,
          genFormat,
          numGroups
        );
        if (newFixtures.length > 0) {
          const success = await addMatches(newFixtures as any);
          if (success) {
            showToast(`Created ${newFixtures.length} matches!`, 'success');
          }
        }
      }
    } finally {
      setIsProcessing(false);
      setShowGenerateModal(false);
    }
  };

  // Generate World Cup Knockout Stage from Completed Groups
  const handleGenerateKnockoutStage = async () => {
    if (groupSummaries.length === 0) {
      showToast('No groups found to generate knockout bracket', 'error');
      return;
    }

    // Check if knockout matches already exist
    if (knockoutMatches.length > 0) {
      showToast('Knockout bracket is already generated!', 'info');
      setActiveTab('knockout');
      return;
    }

    setIsProcessing(true);
    try {
      const bracketMatches = generateKnockoutBracketMatches(tournament.id, groupSummaries);
      if (bracketMatches.length > 0) {
        const success = await addMatches(bracketMatches as any);
        if (success) {
          showToast(`🏆 World Cup Knockout bracket generated! (${bracketMatches.length} matches)`, 'success');
          setActiveTab('knockout');
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle saving knockout score with automated progression
  const handleSaveKnockoutScore = async (
    match: Match,
    p1s: number,
    p2s: number,
    winnerId?: string,
    penP1?: number,
    penP2?: number
  ) => {
    const updatedMatch: Match = {
      ...match,
      status: 'completed',
      player1_score: p1s,
      player2_score: p2s,
      winner_id: winnerId,
      penalty_player1_score: penP1,
      penalty_player2_score: penP2,
      updated_at: new Date().toISOString(),
    };

    const success = await updateMatch(updatedMatch);
    if (!success) return;

    // If there's a winner, advance them to the downstream next_match_id!
    if (winnerId && match.next_match_id) {
      const advancedMatches = advanceKnockoutWinner(matches, match.id, winnerId);
      const downstreamMatch = advancedMatches.find(m => m.id === match.next_match_id);
      if (downstreamMatch) {
        await updateMatch(downstreamMatch);
      }
    }

    // If this was the final, mark tournament champion!
    if (match.round === 'Final' && winnerId) {
      await updateTournament({
        ...tournament,
        status: 'completed',
        champion_id: winnerId,
      });
      showToast('🎉 Tournament Complete! Champion crowned!', 'success');
    } else {
      showToast('Score recorded & bracket updated!', 'success');
    }
  };

  const handleClearAllFixtures = async () => {
    setIsProcessing(true);
    try {
      const success = await deleteTournamentMatches(tournament.id);
      if (success) {
        showToast('All tournament fixtures cleared', 'success');
        setShowClearFixturesConfirm(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveCustomMatch = async (data: Partial<Match>) => {
    setIsProcessing(true);
    try {
      const created = await addMatch({
        ...data,
        tournament_id: tournament.id,
      } as any);
      if (created) {
        showToast('Match created successfully', 'success');
        setShowCustomMatchModal(false);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const tabs: { key: Tab; label: string; icon?: any }[] = [
    { key: 'overview', label: 'Overview' },
    ...(isGroupsOrWorldCup ? [{ key: 'groups' as Tab, label: `Groups (${groupSummaries.length})` }] : []),
    ...(knockoutMatches.length > 0 || isGroupsOrWorldCup ? [{ key: 'knockout' as Tab, label: 'Knockout Bracket' }] : []),
    { key: 'players', label: `Players (${tournamentPlayers.length})` },
    { key: 'fixtures', label: `Fixtures (${matches.length})` },
    { key: 'standings', label: 'Standings' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <Link to="/tournaments" className="inline-flex items-center text-accent hover:underline mb-2 text-sm">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tournaments
      </Link>

      {/* Tournament Main Card Header */}
      <div className="card p-6 bg-surface border border-border-light space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-text">{tournament.name}</h1>
              {progress.champion && (
                <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                  <Trophy className="w-3.5 h-3.5" /> Champion: {progress.champion.name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted mt-1.5">
              <span>Season {tournament.season}</span>
              <span>•</span>
              <Badge variant="default">{tournament.format.replace('_', ' ')}</Badge>
              {tournament.description && <span>• {tournament.description}</span>}
            </div>
          </div>

          <div className="flex gap-2">
            {tournamentPlayers.length >= 2 && matches.length === 0 && (
              <button
                className="btn btn-primary text-xs"
                onClick={handleOpenGenerateModal}
                disabled={isProcessing}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Generate Tournament Schedule
              </button>
            )}
          </div>
        </div>

        {/* World Cup Stage Progress Bars */}
        {matches.length > 0 && (
          <div className="pt-3 border-t border-border-light/60 space-y-2">
            <div className="flex justify-between items-center text-xs text-text-muted">
              <span className="font-semibold uppercase tracking-wider text-text">Tournament Progress</span>
              <span className="font-mono text-accent font-bold">{progress.overallProgress}% Complete</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
              {/* Group Stage */}
              <div className="p-2 rounded-lg bg-bg/50 border border-border-light space-y-1">
                <div className="flex justify-between text-text-muted">
                  <span>Groups</span>
                  <span className="font-mono">{progress.groupProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all duration-500" style={{ width: `${progress.groupProgress}%` }} />
                </div>
              </div>

              {/* Round of 16 */}
              <div className="p-2 rounded-lg bg-bg/50 border border-border-light space-y-1">
                <div className="flex justify-between text-text-muted">
                  <span>Round of 16</span>
                  <span className="font-mono">{progress.r16Progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress.r16Progress}%` }} />
                </div>
              </div>

              {/* Quarter-Final */}
              <div className="p-2 rounded-lg bg-bg/50 border border-border-light space-y-1">
                <div className="flex justify-between text-text-muted">
                  <span>Quarter-Finals</span>
                  <span className="font-mono">{progress.qfProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progress.qfProgress}%` }} />
                </div>
              </div>

              {/* Semi-Final */}
              <div className="p-2 rounded-lg bg-bg/50 border border-border-light space-y-1">
                <div className="flex justify-between text-text-muted">
                  <span>Semi-Finals</span>
                  <span className="font-mono">{progress.sfProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${progress.sfProgress}%` }} />
                </div>
              </div>

              {/* Final */}
              <div className="p-2 rounded-lg bg-bg/50 border border-border-light space-y-1 col-span-2 sm:col-span-1">
                <div className="flex justify-between text-text-muted">
                  <span>Final</span>
                  <span className="font-mono">{progress.finalProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${progress.finalProgress}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-border-light overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 font-medium capitalize rounded-t-lg whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-surface-hover text-text border-b-2 border-accent font-bold'
                : 'text-text-muted hover:text-text hover:bg-surface'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card text-center py-6">
              <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
              <div className="text-3xl font-bold">{tournamentPlayers.length}</div>
              <div className="text-text-muted text-sm">Participants</div>
            </div>
            <div className="card text-center py-6">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
              <div className="text-3xl font-bold">{completedMatches.length}</div>
              <div className="text-text-muted text-sm">Matches Played</div>
            </div>
            <div className="card text-center py-6">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-accent" />
              <div className="text-3xl font-bold">{upcomingMatches.length}</div>
              <div className="text-text-muted text-sm">Matches Remaining</div>
            </div>
          </div>

          {/* Group Stage to Knockout Transition Banner */}
          {isGroupsOrWorldCup && groupMatches.length > 0 && knockoutMatches.length === 0 && (
            <div
              className={`card p-6 border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                allGroupsComplete
                  ? 'bg-emerald-500/10 border-emerald-500/40'
                  : 'bg-surface border-border-light'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-lg text-text">
                    {allGroupsComplete ? '🎉 Group Stage Completed!' : 'Group Stage in Progress'}
                  </h4>
                  {allGroupsComplete && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-bg">
                      Ready for Knockout
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {allGroupsComplete
                    ? 'All group matches are finished. Qualifiers (A1, A2, B1, B2...) are confirmed. Click to generate the World Cup bracket!'
                    : 'Complete all group matches to determine the top 2 qualifiers from each group for the Round of 16 bracket.'}
                </p>
              </div>

              <button
                className={`btn text-xs sm:text-sm font-bold whitespace-nowrap ${
                  allGroupsComplete ? 'btn-primary bg-emerald-600 hover:bg-emerald-500' : 'btn-secondary'
                }`}
                onClick={handleGenerateKnockoutStage}
                disabled={isProcessing}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                {allGroupsComplete ? 'Generate Knockout Stage' : 'Generate Knockout (Manual Override)'}
              </button>
            </div>
          )}

          {/* Standings & Next Matches Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-xl">Top 5 Standings</h3>
                <button className="text-accent text-sm hover:underline" onClick={() => setActiveTab('standings')}>
                  View All
                </button>
              </div>
              {tournamentPlayers.length === 0 ? (
                <p className="text-sm text-text-muted py-6 text-center">No participants in tournament yet.</p>
              ) : (
                <LeaderboardTable rows={standings} limit={5} />
              )}
            </div>

            <div className="card p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-display text-xl">Next Fixtures</h3>
                <button className="text-accent text-sm hover:underline" onClick={() => setActiveTab('fixtures')}>
                  View All
                </button>
              </div>
              {upcomingMatches.length === 0 ? (
                <p className="text-sm text-text-muted py-6 text-center">No upcoming fixtures scheduled.</p>
              ) : (
                <UpcomingMatches matches={upcomingMatches} players={tournamentPlayers} limit={5} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Groups */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          {allGroupsComplete && knockoutMatches.length === 0 && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-emerald-400 text-sm">All Group Matches Completed!</span>
                <p className="text-xs text-text-muted">Top 2 teams from every group have officially qualified.</p>
              </div>
              <button
                className="btn btn-primary bg-emerald-600 hover:bg-emerald-500 text-xs"
                onClick={handleGenerateKnockoutStage}
                disabled={isProcessing}
              >
                <Sparkles className="w-4 h-4 mr-1" /> Generate Knockout Bracket
              </button>
            </div>
          )}

          <GroupTables
            tournament={tournament}
            tournamentPlayers={tournamentPlayers}
            matches={matches}
            onUpdateMatch={updateMatch}
          />
        </div>
      )}

      {/* TAB CONTENT: Knockout Bracket */}
      {activeTab === 'knockout' && (
        <div className="space-y-6">
          {knockoutMatches.length === 0 ? (
            <EmptyState
              title="Knockout Stage Not Generated Yet"
              description="Complete the group matches or generate the World Cup knockout bracket."
              icon={GitBranch}
              action={{ label: 'Generate Knockout Bracket', onClick: handleGenerateKnockoutStage }}
            />
          ) : (
            <KnockoutBracket
              players={tournamentPlayers}
              knockoutMatches={knockoutMatches}
              onSaveScore={handleSaveKnockoutScore}
            />
          )}
        </div>
      )}

      {/* TAB CONTENT: Players */}
      {activeTab === 'players' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display text-xl">Tournament Participants ({tournamentPlayers.length})</h3>
              <p className="text-xs text-text-muted">Players currently competing in this tournament</p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenAddPlayerModal} disabled={availablePlayers.length === 0 || isProcessing}>
              <Plus className="w-4 h-4 mr-2" /> Add Players
            </button>
          </div>

          {tournamentPlayers.length === 0 ? (
            <EmptyState
              title="No Players Added"
              description="Add players to start your tournament."
              icon={Users}
              action={availablePlayers.length > 0 ? { label: 'Add Players', onClick: handleOpenAddPlayerModal } : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tournamentPlayers.map(p => (
                <div key={p.id} className="card p-4 flex items-center justify-between border border-border-light hover:border-accent/40">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{p.name}</div>
                    {p.team && <div className="text-xs text-text-muted truncate">{p.team}</div>}
                  </div>
                  <button
                    className="btn btn-ghost text-red-500 p-1.5 hover:bg-red-500/10"
                    onClick={() => setPlayerToRemove(p.id)}
                    title="Remove Player"
                    disabled={isProcessing}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Fixtures */}
      {activeTab === 'fixtures' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-display text-xl">All Fixtures ({matches.length})</h3>
              <p className="text-xs text-text-muted">Overview of all group and knockout match fixtures</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-surface rounded-xl p-1 border border-border-light mr-2">
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    fixturesViewMode === 'list' ? 'bg-accent text-bg shadow-sm' : 'text-text-muted hover:text-text'
                  }`}
                  onClick={() => setFixturesViewMode('list')}
                >
                  <List className="w-3.5 h-3.5" /> List
                </button>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    fixturesViewMode === 'chart' ? 'bg-accent text-bg shadow-sm' : 'text-text-muted hover:text-text'
                  }`}
                  onClick={() => setFixturesViewMode('chart')}
                >
                  <BarChart3 className="w-3.5 h-3.5" /> Graph & Charts
                </button>
              </div>

              <button className="btn btn-secondary text-xs" onClick={() => setShowCustomMatchModal(true)} disabled={isProcessing}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Match
              </button>

              {matches.length > 0 && (
                <button className="btn btn-ghost text-red-500 text-xs" onClick={() => setShowClearFixturesConfirm(true)} disabled={isProcessing}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear All
                </button>
              )}
            </div>
          </div>

          {fixturesViewMode === 'chart' ? (
            <FixturesChartView
              tournament={tournament}
              players={tournamentPlayers}
              matches={matches}
              onUpdateMatch={updateMatch}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {matches.map(match => (
                <div key={match.id} className="card p-4 border border-border-light flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-center text-xs border-b border-border-light/40 pb-2">
                    <span className="font-bold text-accent">{match.round || match.match_code}</span>
                    <button onClick={() => setMatchToDelete(match.id)} className="text-red-500 hover:underline text-[11px]" disabled={isProcessing}>
                      Delete
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                    <span className="truncate flex-1 text-right">
                      {tournamentPlayers.find(p => p.id === match.player1_id)?.name || match.player1_placeholder || 'Player 1'}
                    </span>
                    <div className="px-2 py-1 rounded bg-bg font-mono font-bold text-xs shrink-0">
                      {match.status === 'completed' ? `${match.player1_score} - ${match.player2_score}` : 'vs'}
                    </div>
                    <span className="truncate flex-1 text-left">
                      {tournamentPlayers.find(p => p.id === match.player2_id)?.name || match.player2_placeholder || 'Player 2'}
                    </span>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-border-light/40">
                    <button
                      onClick={() => setSelectedMatch(match)}
                      className={`btn text-xs py-1 px-3 ${match.status === 'completed' ? 'btn-secondary' : 'btn-primary'}`}
                      disabled={isProcessing}
                    >
                      {match.status === 'completed' ? 'Edit Score' : 'Enter Score'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Standings */}
      {activeTab === 'standings' && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <LeaderboardTable rows={standings} />
          </div>
        </div>
      )}

      {/* Add Players Modal */}
      <Modal isOpen={showAddPlayer} onClose={() => setShowAddPlayer(false)} title="Add Players to Tournament">
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {availablePlayers.map(p => {
              const isChecked = selectedPlayerIdsToAdd.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPlayerIdsToAdd(prev =>
                      isChecked ? prev.filter(id => id !== p.id) : [...prev, p.id]
                    );
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-left text-sm transition-colors border ${
                    isChecked ? 'bg-accent/10 border-accent/50 text-text' : 'bg-surface border-border-light text-text-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isChecked ? <CheckSquare className="w-5 h-5 text-accent shrink-0" /> : <Square className="w-5 h-5 text-text-muted shrink-0" />}
                    <div>
                      <div className="font-semibold text-text">{p.name}</div>
                      {p.team && <div className="text-xs text-text-muted">{p.team}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
            <button className="btn btn-ghost" onClick={() => setShowAddPlayer(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddPlayersSubmit} disabled={selectedPlayerIdsToAdd.length === 0 || isProcessing}>
              Add {selectedPlayerIdsToAdd.length} Player(s)
            </button>
          </div>
        </div>
      </Modal>

      {/* Generate Schedule Modal */}
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate Tournament Schedule">
        <div className="space-y-4">
          <Select
            id="genFormatSelect"
            label="Tournament Structure"
            value={genFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenFormat(e.target.value as TournamentFormat)}
            options={[
              { value: 'group_knockout', label: 'World Cup (Group Stage → Knockout Stage)' },
              { value: 'groups', label: 'Group Stages Only' },
              { value: 'knockout', label: 'Knockout Bracket Only' },
              { value: 'league', label: 'League / Round Robin' },
            ]}
          />

          {(genFormat === 'group_knockout' || genFormat === 'groups') && (
            <div className="space-y-1">
              <label className="form-label text-sm">Number of Groups</label>
              <select className="form-input" value={numGroups} onChange={e => setNumGroups(Number(e.target.value))}>
                <option value={8}>8 Groups (Groups A–H • 4 players each • 32 players total)</option>
                <option value={4}>4 Groups (Groups A–D • 16 players total)</option>
                <option value={2}>2 Groups (Group A & Group B • 8 players total)</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
            <button className="btn btn-ghost" onClick={() => setShowGenerateModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleExecuteGenerateFixtures} disabled={isProcessing}>
              Generate Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* Score Entry Modal */}
      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={state.players.find(p => p.id === selectedMatch.player1_id)!}
          player2={state.players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={async (p1s, p2s, winnerId, penP1, penP2) => {
            if (selectedMatch.stage === 'knockout') {
              await handleSaveKnockoutScore(selectedMatch, p1s, p2s, winnerId, penP1, penP2);
            } else {
              const success = await updateMatch({
                ...selectedMatch,
                status: 'completed',
                player1_score: p1s,
                player2_score: p2s,
                winner_id: winnerId,
                penalty_player1_score: penP1,
                penalty_player2_score: penP2,
                updated_at: new Date().toISOString(),
              });
              if (success) {
                showToast('Score recorded!', 'success');
              }
            }
            setSelectedMatch(null);
          }}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Custom Match Modal */}
      {showCustomMatchModal && (
        <MatchForm
          tournamentId={tournament.id}
          players={tournamentPlayers}
          onSubmit={handleSaveCustomMatch}
          onClose={() => setShowCustomMatchModal(false)}
        />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={!!matchToDelete}
        onCancel={() => setMatchToDelete(null)}
        onConfirm={async () => {
          if (matchToDelete) {
            const success = await deleteMatch(matchToDelete);
            if (success) {
              showToast('Match deleted', 'success');
              setMatchToDelete(null);
            }
          }
        }}
        title="Delete Match"
        message="Are you sure you want to delete this match?"
        confirmLabel="Delete"
        danger={true}
      />

      <ConfirmDialog
        isOpen={showClearFixturesConfirm}
        onCancel={() => setShowClearFixturesConfirm(false)}
        onConfirm={handleClearAllFixtures}
        title="Clear All Matches"
        message="Are you sure you want to delete all matches in this tournament? This will reset all bracket and group fixtures."
        confirmLabel="Clear All"
        danger={true}
      />

      <ConfirmDialog
        isOpen={!!playerToRemove}
        onCancel={() => setPlayerToRemove(null)}
        onConfirm={async () => {
          if (playerToRemove) {
            const success = await removeTournamentPlayer(tournament.id, playerToRemove);
            if (success) {
              showToast('Player removed', 'success');
              setPlayerToRemove(null);
            }
          }
        }}
        title="Remove Player"
        message="Remove this player from the tournament?"
        confirmLabel="Remove"
        danger={true}
      />
    </div>
  );
};

export default TournamentDetails;
