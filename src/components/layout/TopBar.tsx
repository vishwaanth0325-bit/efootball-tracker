import React from 'react';
import { Menu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title = 'EF Tracker' }) => {
  const { state, setActiveTournament } = useApp();
  const { tournaments, activeTournamentId } = state;

  return (
    <header className="h-[56px] bg-surface border-b border-border flex items-center justify-between px-4 lg:hidden sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button className="text-text-muted hover:text-text">
          <Menu size={24} />
        </button>
        <h1 className="font-display font-semibold text-lg text-text">{title}</h1>
      </div>

      <div className="flex items-center">
        <select 
          className="bg-bg border border-border-light rounded px-2 py-1 text-xs text-text focus:outline-none focus:border-accent w-32"
          value={activeTournamentId || ''}
          onChange={(e) => setActiveTournament(e.target.value || null)}
        >
          <option value="">All Tournaments</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>
    </header>
  );
};
