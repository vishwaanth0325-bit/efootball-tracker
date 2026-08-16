import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, Gamepad2, BarChart3 } from 'lucide-react';

export const MobileNav: React.FC = () => {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface/95 backdrop-blur-md border-t border-border flex items-center justify-around z-50 px-2 shadow-2xl">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            isActive ? 'text-accent font-bold scale-105' : 'text-text-muted hover:text-text'
          }`
        }
      >
        <LayoutDashboard size={20} />
        <span className="text-[10px]">Dashboard</span>
      </NavLink>

      <NavLink
        to="/players"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            isActive ? 'text-accent font-bold scale-105' : 'text-text-muted hover:text-text'
          }`
        }
      >
        <Users size={20} />
        <span className="text-[10px]">Players</span>
      </NavLink>

      <NavLink
        to="/tournaments"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            isActive ? 'text-accent font-bold scale-105' : 'text-text-muted hover:text-text'
          }`
        }
      >
        <Trophy size={20} />
        <span className="text-[10px]">Tourneys</span>
      </NavLink>

      <NavLink
        to="/matches"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            isActive ? 'text-accent font-bold scale-105' : 'text-text-muted hover:text-text'
          }`
        }
      >
        <Gamepad2 size={20} />
        <span className="text-[10px]">Matches</span>
      </NavLink>

      <NavLink
        to="/statistics"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-1 py-1 px-2 rounded-xl transition-all ${
            isActive ? 'text-accent font-bold scale-105' : 'text-text-muted hover:text-text'
          }`
        }
      >
        <BarChart3 size={20} />
        <span className="text-[10px]">Stats</span>
      </NavLink>
    </nav>
  );
};
