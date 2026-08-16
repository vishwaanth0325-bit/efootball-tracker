import React, { useState } from 'react';
import type { Player } from '../../lib/types';
import { Modal } from '../ui/Modal';
import {
  GROUP_LETTERS,
  buildDefaultGroupAssignments,
  splitPlayersIntoGroupsBySize,
  shufflePlayerIds,
} from '../../lib/tournamentEngine';
import { Users, Shuffle, Plus, Trash2, Sparkles } from 'lucide-react';

interface GroupManagerModalProps {
  tournamentId?: string;
  players: Player[];
  initialAssignments?: Record<string, string[]>;
  onSave: (groupAssignments: Record<string, string[]>, regenerateFixtures: boolean) => Promise<void>;
  onClose: () => void;
}

export const GroupManagerModal: React.FC<GroupManagerModalProps> = ({
  players,
  initialAssignments,
  onSave,
  onClose,
}) => {
  const playerIds = players.map(p => p.id);

  // Initialize group assignments
  const [groups, setGroups] = useState<Record<string, string[]>>(() => {
    if (initialAssignments && Object.keys(initialAssignments).length > 0) {
      return { ...initialAssignments };
    }
    // Default: 4 players per group or 3 players per group
    return splitPlayersIntoGroupsBySize(playerIds, 4);
  });

  const [regenerateFixtures, setRegenerateFixtures] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const groupNames = Object.keys(groups);

  // ── Presets ──────────────────────────────────────────────────────────────

  const handleSplitBySize = (size: number) => {
    const updated = splitPlayersIntoGroupsBySize(playerIds, size);
    setGroups(updated);
  };

  const handleSplitByGroupCount = (count: number) => {
    const updated = buildDefaultGroupAssignments(playerIds, count);
    setGroups(updated);
  };

  const handleRandomize = () => {
    const count = groupNames.length || 4;
    const shuffled = shufflePlayerIds(playerIds);
    const updated = buildDefaultGroupAssignments(shuffled, count);
    setGroups(updated);
  };

  const handleAddGroup = () => {
    const nextIdx = groupNames.length;
    if (nextIdx >= GROUP_LETTERS.length) return;
    const newGroupName = `Group ${GROUP_LETTERS[nextIdx]}`;
    setGroups(prev => ({ ...prev, [newGroupName]: [] }));
  };

  const handleRemoveGroup = (groupName: string) => {
    const playersInGroup = groups[groupName] || [];
    const remainingGroupNames = groupNames.filter(g => g !== groupName);

    if (remainingGroupNames.length === 0) return;

    const updated: Record<string, string[]> = {};
    remainingGroupNames.forEach(g => {
      updated[g] = [...groups[g]];
    });

    // Distribute orphaned players into first group
    if (playersInGroup.length > 0) {
      updated[remainingGroupNames[0]].push(...playersInGroup);
    }

    setGroups(updated);
  };

  const handleMovePlayer = (playerId: string, fromGroup: string, toGroup: string) => {
    if (fromGroup === toGroup) return;

    setGroups(prev => {
      const next = { ...prev };
      next[fromGroup] = (next[fromGroup] || []).filter(id => id !== playerId);
      next[toGroup] = [...(next[toGroup] || []).filter(id => id !== playerId), playerId];
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(groups, regenerateFixtures);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Manage & Split Tournament Groups" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Quick Presets Bar */}
        <div className="p-4 rounded-xl bg-surface border border-border-light space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent" />
              Quick Split Presets ({players.length} Total Players)
            </span>
            <button
              onClick={handleRandomize}
              className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
            >
              <Shuffle className="w-3 h-3" /> Randomize Draw
            </button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-text-muted self-center text-[11px] mr-1">By Size:</span>
            <button
              onClick={() => handleSplitBySize(3)}
              className="btn btn-secondary py-1 px-3 text-xs hover:border-accent"
            >
              3 Players / Group ({Math.ceil(players.length / 3)} Groups)
            </button>
            <button
              onClick={() => handleSplitBySize(4)}
              className="btn btn-secondary py-1 px-3 text-xs hover:border-accent"
            >
              4 Players / Group ({Math.ceil(players.length / 4)} Groups)
            </button>

            <span className="text-text-muted self-center text-[11px] mx-1">By Groups:</span>
            <button
              onClick={() => handleSplitByGroupCount(2)}
              className="btn btn-secondary py-1 px-2.5 text-xs hover:border-accent"
            >
              2 Groups
            </button>
            <button
              onClick={() => handleSplitByGroupCount(3)}
              className="btn btn-secondary py-1 px-2.5 text-xs hover:border-accent"
            >
              3 Groups
            </button>
            <button
              onClick={() => handleSplitByGroupCount(4)}
              className="btn btn-secondary py-1 px-2.5 text-xs hover:border-accent"
            >
              4 Groups
            </button>
            <button
              onClick={() => handleSplitByGroupCount(8)}
              className="btn btn-secondary py-1 px-2.5 text-xs hover:border-accent"
            >
              8 Groups
            </button>
          </div>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto pr-1">
          {groupNames.map(groupName => {
            const memberIds = groups[groupName] || [];
            const memberPlayers = memberIds.map(id => players.find(p => p.id === id)).filter(Boolean) as Player[];

            return (
              <div
                key={groupName}
                className="p-4 rounded-xl bg-surface/70 border border-border-light space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-border-light pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-accent/15 border border-accent/30 text-accent font-bold text-xs flex items-center justify-center">
                        {groupName.replace('Group ', '')}
                      </span>
                      <h4 className="font-display font-bold text-sm text-text">{groupName}</h4>
                      <span className="text-[11px] text-text-muted">({memberPlayers.length} teams)</span>
                    </div>

                    {groupNames.length > 2 && (
                      <button
                        onClick={() => handleRemoveGroup(groupName)}
                        className="btn btn-ghost text-red-400 p-1 hover:bg-red-500/10 text-xs"
                        title="Remove group"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  {/* Player list in group */}
                  <div className="space-y-1.5 min-h-[80px]">
                    {memberPlayers.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center italic">Empty group</p>
                    ) : (
                      memberPlayers.map(p => (
                        <div
                          key={p.id}
                          className="p-2 rounded-lg bg-bg/80 border border-border-light/80 flex items-center justify-between text-xs gap-2"
                        >
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-text truncate">{p.name}</span>
                            {p.team && <span className="text-[10px] text-text-muted block truncate">{p.team}</span>}
                          </div>

                          {/* Move group dropdown */}
                          <select
                            value={groupName}
                            onChange={(e) => handleMovePlayer(p.id, groupName, e.target.value)}
                            className="bg-surface border border-border-light rounded px-1.5 py-0.5 text-[11px] text-text focus:outline-none focus:border-accent shrink-0"
                          >
                            {groupNames.map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add group button card */}
          {groupNames.length < GROUP_LETTERS.length && (
            <button
              onClick={handleAddGroup}
              className="p-4 rounded-xl border border-dashed border-border-light hover:border-accent hover:bg-accent/5 flex flex-col items-center justify-center text-text-muted hover:text-accent gap-2 min-h-[140px] transition-colors"
            >
              <Plus className="w-6 h-6" />
              <span className="text-xs font-semibold">Add New Group</span>
            </button>
          )}
        </div>

        {/* Fixture generation option */}
        <div className="p-3 bg-accent/10 border border-accent/30 rounded-xl flex items-center justify-between gap-3 text-xs">
          <label className="flex items-center gap-2 text-text cursor-pointer">
            <input
              type="checkbox"
              checked={regenerateFixtures}
              onChange={(e) => setRegenerateFixtures(e.target.checked)}
              className="rounded border-border-light text-accent focus:ring-accent"
            />
            <span className="font-medium">
              Automatically generate round-robin match fixtures for these groups
            </span>
          </label>
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border-light">
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary flex items-center gap-1.5"
            disabled={isSaving}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Apply & Save Groups'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
