import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, Gamepad2, BarChart3, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog } from '../ui/ConfirmDialog';

export const Sidebar: React.FC = () => {
  const { state, clearAllData, setActiveTournament } = useApp();
  const { activeTournamentId, tournaments } = state;
  const { showToast } = useToast();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const activeTournament = tournaments.find((t: { id: string }) => t.id === activeTournamentId);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      const success = await clearAllData();
      if (success) {
        showToast('All database records cleared cleanly', 'info');
        setShowClearConfirm(false);
      }
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-[240px] bg-surface border-r border-border hidden lg:flex flex-col z-40">
      <div className="p-6 flex items-center gap-3 border-b border-border-light">
        <Trophy size={24} className="text-accent" />
        <span className="font-display font-bold text-accent tracking-wider text-lg">EF TRACKER</span>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/players" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Users size={18} />
          <span>Players</span>
        </NavLink>
        <NavLink to="/tournaments" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Trophy size={18} />
          <span>Tournaments</span>
        </NavLink>
        <NavLink to="/matches" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Gamepad2 size={18} />
          <span>Matches</span>
        </NavLink>
        <NavLink to="/statistics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <BarChart3 size={18} />
          <span>Statistics</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-border-light">
        <p className="text-xs text-text-muted mb-2 uppercase tracking-wider">Active Tournament</p>
        <select 
          className="w-full bg-bg border border-border-light rounded-lg px-2 py-2 text-sm text-text focus:outline-none focus:border-accent"
          value={activeTournamentId || ''}
          onChange={(e) => setActiveTournament(e.target.value || null)}
        >
          <option value="">All Tournaments</option>
          {tournaments.map((t: { id: string; name: string }) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="p-4 border-t border-border-light">
        <button
          onClick={() => setShowClearConfirm(true)}
          disabled={isClearing}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-text-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-colors"
        >
          <Trash2 size={14} />
          <span>Clear All Data</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="Clear All Project Data"
        message="Are you sure you want to completely erase all players, tournaments, and match records from Supabase? This resets the tracker to a clean state."
        confirmLabel="Wipe Everything"
        danger={true}
      />
    </aside>
  );
};
