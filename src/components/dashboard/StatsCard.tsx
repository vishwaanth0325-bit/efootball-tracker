import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'accent' | 'green' | 'amber' | 'red';
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, icon: Icon, color = 'accent' }) => {
  let colorClass = 'text-accent';
  if (color === 'green') colorClass = 'text-green-500';
  if (color === 'amber') colorClass = 'text-amber-500';
  if (color === 'red') colorClass = 'text-red-500';

  return (
    <div className="card p-4 lg:p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="text-text-muted text-sm font-medium">{label}</span>
        <Icon size={20} className={colorClass} />
      </div>
      <div className="font-display text-3xl font-bold text-text">
        {value}
      </div>
    </div>
  );
};
