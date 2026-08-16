import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { generateFixtures, countExpectedMatches } from '../lib/fixtures';
import { computeStandings } from '../lib/calculations';
import type { Match, TournamentFormat } from '../lib/types';
import { LeaderboardTable } from '../components/dashboard/LeaderboardTable';
import { UpcomingMatches } from '../components/dashboard/UpcomingMatches';
import { ScoreEntry } from '../components/matches/ScoreEntry';
import { MatchForm } from '../components/matches/MatchForm';
import { GroupTables } from '../components/tournaments/GroupTables';
import { FixturesChartView } from '../components/tournaments/FixturesChartView';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import {
  ChevronLeft,
  Users,
  Calendar,
  Trophy,
  Plus,
  Trash2,
  X,
  Play,
  CheckSquare,
  Square,
  BarChart3,
  List,
  Layers,
} from 'lucide-react';

type Tab = 'overview' | 'groups' | 'players' | 'fixtures' | 'standings';

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
  const [genFormat, setGenFormat] = useState<TournamentFormat>('league');
  const [doubleRoundRobin, setDoubleRoundRobin] = useState(false);
  const [numGroups, setNumGroups] = useState(2);

  const [showClearFixturesConfirm, setShowClearFixturesConfirm] = useState(false);
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null);
  const [playerToRemove, setPlayerToRemove] = useState<string | null>(null);

  const tournament = state.tournaments.find(t => t.id === tournamentId);

  if (!tournament) {
    return <EmptyState title="Tournament Not Found" icon={Trophy} />;
  }

  const tournamentPlayers = state.tournamentPlayers
    .filter(tp => tp.tournament_id === tournament.id)
    .map(tp => state.players.find(p => p.id === tp.player_id)!)
    .filter(Boolean);

  const matches = state.matches.filter(m => m.tournament_id === tournament.id);
  const upcomingMatches = matches
    .filter(m => m.status === 'upcoming')
    .sort((a, b) => new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime());
  const completedMatches = matches.filter(m => m.status === 'completed');

  const isGroupsTournament =
    tournament.format === 'groups' ||
    tournament.format === 'group_knockout' ||
    matches.some(m => m.round && m.round.toLowerCase().startsWith('group'));

  const standings = computeStandings(tournament.id, tournamentPlayers, matches, tournament);
  const availablePlayers = state.players.filter(
    p => !tournamentPlayers.find(tp => tp.id === p.id) && p.status === 'active'
  );

  const handleOpenAddPlayerModal = () => {
    setSelectedPlayerIdsToAdd(availablePlayers.map(p => p.id));
    setShowAddPlayer(true);
  };

  const handleAddPlayersSubmit = () => {
    if (selectedPlayerIdsToAdd.length > 0) {
      addTournamentPlayers(tournament.id, selectedPlayerIdsToAdd);
      showToast(`Added ${selectedPlayerIdsToAdd.length} player(s) to tournament`, 'success');
      setSelectedPlayerIdsToAdd([]);
      setShowAddPlayer(false);
    }
  };

  const handleOpenGenerateModal = () => {
    setGenFormat(tournament.format);
    setShowGenerateModal(true);
  };

  const handleExecuteGenerateFixtures = () => {
    const playerIds = tournamentPlayers.map(p => p.id);
    if (playerIds.length < 2) {
      showToast('Need at least 2 players to generate fixtures', 'error');
      return;
    }

    const newFixtures = generateFixtures(
      tournament.id,
      playerIds,
      doubleRoundRobin,
      matches,
      genFormat,
      numGroups
    );

    if (newFixtures.length === 0) {
      showToast('All possible fixtures already exist or insufficient players', 'info');
    } else {
      addMatches(newFixtures as any);
      showToast(`Successfully created ${newFixtures.length} matches!`, 'success');
    }
    setShowGenerateModal(false);
  };

  const handleClearAllFixtures = () => {
    deleteTournamentMatches(tournament.id);
    showToast('All tournament fixtures cleared', 'success');
    setShowClearFixturesConfirm(false);
  };

  const handleSaveCustomMatch = (data: Partial<Match>) => {
    addMatch({
      ...data,
      tournament_id: tournament.id,
    } as any);
    showToast('Match created successfully', 'success');
    setShowCustomMatchModal(false);
  };

  const tabs: { key: Tab; label: string; icon?: any }[] = [
    { key: 'overview', label: 'Overview' },
    ...(isGroupsTournament ? [{ key: 'groups' as Tab, label: 'Groups (A & B)' }] : []),
    { key: 'players', label: `Players (${tournamentPlayers.length})` },
    { key: 'fixtures', label: `Fixtures (${matches.length})` },
    { key: 'standings', label: 'Standings' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center py-6">
          <Users className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{tournamentPlayers.length}</div>
          <div className="text-text-muted text-sm">Registered Players</div>
        </div>
        <div className="card text-center py-6">
          <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{completedMatches.length}</div>
          <div className="text-text-muted text-sm">Matches Played</div>
        </div>
        <div className="card text-center py-6">
          <Calendar className="w-8 h-8 mx-auto mb-2 text-accent" />
          <div className="text-3xl font-bold">{upcomingMatches.length}</div>
          <div className="text-text-muted text-sm">Upcoming Matches</div>
        </div>
      </div>

      {isGroupsTournament && (
        <div className="card p-5 bg-surface border border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-accent">Group Stage Active</h4>
              <p className="text-xs text-text-muted">Teams are partitioned into Group A and Group B for group stages.</p>
            </div>
          </div>
          <button className="btn btn-secondary text-xs whitespace-nowrap" onClick={() => setActiveTab('groups')}>
            View Group A & B Standings →
          </button>
        </div>
      )}

      {tournamentPlayers.length < 2 && (
        <div className="card p-5 bg-surface border border-accent/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-semibold text-accent mb-1">Get Started with this Tournament</h4>
            <p className="text-sm text-text-muted">
              Add at least 2 players to generate round robin, knockout, or group fixtures.
            </p>
          </div>
          <button className="btn btn-primary whitespace-nowrap" onClick={handleOpenAddPlayerModal}>
            <Plus className="w-4 h-4 mr-1" /> Add Participants
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-xl">Standings Preview</h3>
            <button className="text-accent text-sm hover:underline" onClick={() => setActiveTab('standings')}>
              View All
            </button>
          </div>
          {tournamentPlayers.length === 0 ? (
            <p className="text-sm text-text-muted py-6 text-center">No players in tournament yet.</p>
          ) : (
            <LeaderboardTable rows={standings} limit={5} />
          )}
        </div>

        <div className="card p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-xl">Next Matches</h3>
            <button className="text-accent text-sm hover:underline" onClick={() => setActiveTab('fixtures')}>
              View All
            </button>
          </div>
          {upcomingMatches.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-sm text-text-muted">No scheduled matches yet.</p>
              {tournamentPlayers.length >= 2 && (
                <button className="btn btn-secondary text-xs" onClick={handleOpenGenerateModal}>
                  <Play className="w-3 h-3 mr-1" /> Generate Matches
                </button>
              )}
            </div>
          ) : (
            <UpcomingMatches matches={upcomingMatches} players={tournamentPlayers} limit={5} />
          )}
        </div>
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-display text-xl">Tournament Participants ({tournamentPlayers.length})</h3>
          <p className="text-xs text-text-muted">Players currently competing in this tournament</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={handleOpenAddPlayerModal} disabled={availablePlayers.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Add Players
          </button>
          {tournamentPlayers.length >= 2 && (
            <button className="btn btn-secondary" onClick={handleOpenGenerateModal}>
              <Play className="w-4 h-4 mr-1 text-accent" /> Generate Fixtures
            </button>
          )}
        </div>
      </div>

      {tournamentPlayers.length === 0 ? (
        <EmptyState
          title="No Players in Tournament"
          description="Add participants from your player roster to begin generating match fixtures."
          icon={Users}
          action={
            availablePlayers.length > 0
              ? { label: 'Add Players', onClick: handleOpenAddPlayerModal }
              : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournamentPlayers.map(p => (
            <div key={p.id} className="card flex items-center justify-between p-4 hover:border-accent/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-surface-hover flex justify-center items-center font-display font-bold border border-accent/40 shrink-0">
                  {p.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{p.name}</div>
                  <div className="text-xs text-text-muted truncate">@{p.efootball_username} {p.team ? `• ${p.team}` : ''}</div>
                </div>
              </div>
              <button
                className="btn btn-ghost text-red-500 hover:bg-red-500/10 p-2 shrink-0"
                onClick={() => setPlayerToRemove(p.id)}
                title="Remove player"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFixtures = () => {
    // Unique rounds preserved in natural order
    const roundList: string[] = [];
    matches.forEach(m => {
      const r = m.round || 'Unassigned';
      if (!roundList.includes(r)) roundList.push(r);
    });

    return (
      <div className="space-y-6">
        {/* Header with View Mode Switcher */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-display text-xl">Match Fixtures ({matches.length})</h3>
            <p className="text-xs text-text-muted">Manage scheduled matches, brackets, and enter game scores</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher: List vs Graph/Chart */}
            <div className="flex bg-surface rounded-xl p-1 border border-border-light mr-2">
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  fixturesViewMode === 'list'
                    ? 'bg-accent text-bg shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                onClick={() => setFixturesViewMode('list')}
              >
                <List className="w-3.5 h-3.5" />
                List
              </button>
              <button
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  fixturesViewMode === 'chart'
                    ? 'bg-accent text-bg shadow-sm'
                    : 'text-text-muted hover:text-text'
                }`}
                onClick={() => setFixturesViewMode('chart')}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Graph & Charts
              </button>
            </div>

            <button className="btn btn-secondary text-xs" onClick={() => setShowCustomMatchModal(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Match
            </button>
            <button
              className="btn btn-primary text-xs"
              onClick={handleOpenGenerateModal}
              disabled={tournamentPlayers.length < 2}
            >
              <Play className="w-3.5 h-3.5 mr-1" /> Generate
            </button>
            {matches.length > 0 && (
              <button
                className="btn btn-ghost text-red-500 hover:bg-red-500/10 text-xs"
                onClick={() => setShowClearFixturesConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* View Mode 1: Graph / Chart View */}
        {fixturesViewMode === 'chart' && (
          <FixturesChartView
            tournament={tournament}
            players={tournamentPlayers}
            matches={matches}
            onUpdateMatch={updateMatch}
          />
        )}

        {/* View Mode 2: Standard List View */}
        {fixturesViewMode === 'list' && (
          <>
            {matches.length === 0 ? (
              <EmptyState
                title="No Fixtures Generated"
                description="Generate a match schedule for your participants or add matches manually."
                icon={Calendar}
                action={
                  tournamentPlayers.length >= 2
                    ? { label: 'Generate Schedule', onClick: handleOpenGenerateModal }
                    : { label: 'Add Players First', onClick: handleOpenAddPlayerModal }
                }
              />
            ) : (
              <div className="space-y-8">
                {roundList.map(round => {
                  const roundMatches = matches.filter(m => (m.round || 'Unassigned') === round);
                  return (
                    <div key={round} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-border-light pb-2">
                        <h4 className="font-display text-lg font-bold text-accent">{round}</h4>
                        <span className="text-xs text-text-muted">{roundMatches.length} match(es)</span>
                      </div>
                      <div className="grid gap-3">
                        {roundMatches.map(match => {
                          const p1 = state.players.find(p => p.id === match.player1_id);
                          const p2 = state.players.find(p => p.id === match.player2_id);
                          const isComplete = match.status === 'completed';

                          return (
                            <div
                              key={match.id}
                              className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:border-accent/40 transition-colors"
                            >
                              <div className="flex items-center justify-between w-full sm:w-2/3">
                                <div className={`w-2/5 text-right font-bold truncate ${isComplete && (match.player1_score ?? 0) > (match.player2_score ?? 0) ? 'text-accent' : ''}`}>
                                  {p1?.name || 'Unknown Player'}
                                </div>

                                <div className="w-1/5 text-center px-2">
                                  {isComplete ? (
                                    <span className="font-mono font-bold text-base bg-surface px-3 py-1 rounded border border-border-light">
                                      {match.player1_score} - {match.player2_score}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold uppercase tracking-wider text-text-muted bg-surface px-2 py-1 rounded">
                                      VS
                                    </span>
                                  )}
                                </div>

                                <div className={`w-2/5 text-left font-bold truncate ${isComplete && (match.player2_score ?? 0) > (match.player1_score ?? 0) ? 'text-accent' : ''}`}>
                                  {p2?.name || 'Unknown Player'}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                  className={`btn text-xs py-1.5 px-3 ${isComplete ? 'btn-secondary' : 'btn-primary'}`}
                                  onClick={() => setSelectedMatch(match)}
                                >
                                  {isComplete ? 'Edit Score' : 'Enter Score'}
                                </button>
                                <button
                                  className="btn btn-ghost text-red-500 hover:bg-red-500/10 text-xs py-1.5 px-2"
                                  onClick={() => setMatchToDelete(match.id)}
                                  title="Delete match"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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
          </>
        )}
      </div>
    );
  };

  const renderStandings = () => (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <LeaderboardTable rows={standings} />
      </div>
      <div className="text-sm text-text-muted">
        Points System: Win = {tournament.points_win}pts, Draw = {tournament.points_draw}pts, Loss = {tournament.points_loss}pts.
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      <Link to="/tournaments" className="inline-flex items-center text-accent hover:underline mb-2">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Tournaments
      </Link>

      <div className="card p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">{tournament.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-text-muted">Season {tournament.season}</span>
              <Badge variant={tournament.status === 'ongoing' ? 'ongoing' : 'default'}>{tournament.status}</Badge>
              <Badge variant="default">{tournament.format.replace('_', ' ')}</Badge>
              {tournament.description && (
                <span className="text-xs text-text-muted italic border-l border-border-light pl-3">
                  {tournament.description}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

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

      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'groups' && (
          <GroupTables
            tournament={tournament}
            tournamentPlayers={tournamentPlayers}
            matches={matches}
            onUpdateMatch={updateMatch}
          />
        )}
        {activeTab === 'players' && renderPlayers()}
        {activeTab === 'fixtures' && renderFixtures()}
        {activeTab === 'standings' && renderStandings()}
      </div>

      {/* Add Players Modal */}
      <Modal isOpen={showAddPlayer} onClose={() => setShowAddPlayer(false)} title="Add Participants to Tournament">
        <div className="space-y-4">
          {availablePlayers.length === 0 ? (
            <p className="text-sm text-text-muted">All active players are already added to this tournament.</p>
          ) : (
            <>
              <div className="flex justify-between items-center text-xs">
                <span className="text-text-muted font-medium">Select players to participate ({selectedPlayerIdsToAdd.length} selected):</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerIdsToAdd(availablePlayers.map(p => p.id))}
                    className="text-accent hover:underline"
                  >
                    Select All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayerIdsToAdd([])}
                    className="text-text-muted hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

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
                        isChecked
                          ? 'bg-accent/10 border-accent/50 text-text'
                          : 'bg-surface border-border-light text-text-muted hover:border-text-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5 text-accent shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-text-muted shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-text">{p.name}</div>
                          <div className="text-xs text-text-muted">@{p.efootball_username} {p.team ? `(${p.team})` : ''}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
            <button className="btn btn-ghost" onClick={() => setShowAddPlayer(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleAddPlayersSubmit}
              disabled={selectedPlayerIdsToAdd.length === 0}
            >
              Add {selectedPlayerIdsToAdd.length} Player(s)
            </button>
          </div>
        </div>
      </Modal>

      {/* Generate Fixtures Modal */}
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate Match Schedule">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Automatically generate matchups for <strong>{tournamentPlayers.length} participants</strong>.
          </p>

          <Select
            id="genFormatSelect"
            label="Schedule Format"
            value={genFormat}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGenFormat(e.target.value as TournamentFormat)}
            options={[
              { value: 'league', label: 'League / Round Robin (All vs All)' },
              { value: 'knockout', label: 'Knockout (Bracket / Elimination)' },
              { value: 'groups', label: 'Groups (Group Stages)' },
              { value: 'group_knockout', label: 'Group Stages + Knockout' },
            ]}
          />

          {(genFormat === 'league' || genFormat === 'round_robin' || genFormat === 'groups' || genFormat === 'group_knockout') && (
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input
                type="checkbox"
                checked={doubleRoundRobin}
                onChange={e => setDoubleRoundRobin(e.target.checked)}
                className="rounded border-border-light text-accent focus:ring-accent"
              />
              Double Round Robin (Home & Away Return Matches)
            </label>
          )}

          {(genFormat === 'groups' || genFormat === 'group_knockout') && (
            <div className="space-y-1">
              <label className="form-label text-sm">Number of Groups</label>
              <select
                className="form-input"
                value={numGroups}
                onChange={e => setNumGroups(Number(e.target.value))}
              >
                <option value={2}>2 Groups (Group A & Group B)</option>
                <option value={4}>4 Groups (Group A, B, C, D)</option>
              </select>
            </div>
          )}

          <div className="p-3 bg-surface border border-border-light rounded-lg text-xs space-y-1">
            <div className="font-semibold text-text">Schedule Preview:</div>
            <div className="text-text-muted">
              Total matches to generate: <strong className="text-accent font-bold">{countExpectedMatches(tournamentPlayers.length, doubleRoundRobin, genFormat, numGroups)}</strong>
            </div>
            {matches.length > 0 && (
              <div className="text-amber-400">
                Notice: Existing matches will be preserved and duplicate pairs will be skipped.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border-light">
            <button className="btn btn-ghost" onClick={() => setShowGenerateModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleExecuteGenerateFixtures}>
              Generate Schedule
            </button>
          </div>
        </div>
      </Modal>

      {/* Custom Match Form Modal */}
      {showCustomMatchModal && (
        <MatchForm
          tournamentId={tournament.id}
          players={tournamentPlayers}
          onSubmit={handleSaveCustomMatch}
          onClose={() => setShowCustomMatchModal(false)}
        />
      )}

      {/* Score Entry Modal */}
      {selectedMatch && (
        <ScoreEntry
          match={selectedMatch}
          player1={state.players.find(p => p.id === selectedMatch.player1_id)!}
          player2={state.players.find(p => p.id === selectedMatch.player2_id)!}
          onSave={(p1s, p2s) => {
            updateMatch({
              ...selectedMatch,
              status: 'completed',
              player1_score: p1s,
              player2_score: p2s,
              updated_at: new Date().toISOString(),
            });
            showToast('Score recorded successfully', 'success');
            setSelectedMatch(null);
          }}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {/* Confirm Delete Single Match */}
      <ConfirmDialog
        isOpen={!!matchToDelete}
        onCancel={() => setMatchToDelete(null)}
        onConfirm={() => {
          if (matchToDelete) {
            deleteMatch(matchToDelete);
            showToast('Match removed', 'success');
            setMatchToDelete(null);
          }
        }}
        title="Delete Match"
        message="Are you sure you want to delete this match?"
        confirmLabel="Delete"
        danger={true}
      />

      {/* Confirm Clear All Tournament Matches */}
      <ConfirmDialog
        isOpen={showClearFixturesConfirm}
        onCancel={() => setShowClearFixturesConfirm(false)}
        onConfirm={handleClearAllFixtures}
        title="Clear All Matches"
        message="Are you sure you want to delete all matches and fixtures in this tournament? This cannot be undone."
        confirmLabel="Clear All"
        danger={true}
      />

      {/* Confirm Remove Player */}
      <ConfirmDialog
        isOpen={!!playerToRemove}
        onCancel={() => setPlayerToRemove(null)}
        onConfirm={() => {
          if (playerToRemove) {
            removeTournamentPlayer(tournament.id, playerToRemove);
            showToast('Player removed from tournament', 'success');
            setPlayerToRemove(null);
          }
        }}
        title="Remove Player"
        message="Remove this player from the tournament? Their matches and tournament standings will be adjusted."
        confirmLabel="Remove"
        danger={true}
      />
    </div>
  );
};

export default TournamentDetails;
