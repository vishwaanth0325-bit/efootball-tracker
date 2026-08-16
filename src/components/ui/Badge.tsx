import React from 'react';
import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant: 'win' | 'draw' | 'loss' | 'upcoming' | 'ongoing' | 'completed' | 'postponed' | 'cancelled' | 'active' | 'inactive' | 'default';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, size = 'sm' }) => {
  let variantClass = '';
  
  switch (variant) {
    case 'win': variantClass = 'badge-win'; break;
    case 'draw': variantClass = 'badge-draw'; break;
    case 'loss': variantClass = 'badge-loss'; break;
    case 'upcoming': variantClass = 'status-upcoming'; break;
    case 'ongoing': variantClass = 'status-ongoing'; break;
    case 'completed': variantClass = 'status-completed'; break;
    case 'postponed': variantClass = 'status-postponed'; break;
    case 'cancelled': variantClass = 'status-cancelled'; break;
    case 'active': variantClass = 'bg-accent/20 text-accent'; break;
    case 'inactive': variantClass = 'bg-border text-text-muted'; break;
    default: variantClass = 'bg-surface text-text-muted'; break;
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center justify-center font-medium rounded-full ${variantClass} ${sizeClass}`}>
      {children}
    </span>
  );
};
