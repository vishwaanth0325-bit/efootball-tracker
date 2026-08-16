import React from 'react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center h-full w-full">
      <div className="w-16 h-16 flex items-center justify-center rounded-full bg-surface mb-4">
        <Icon size={32} className="text-text-muted" />
      </div>
      <h3 className="text-lg font-medium text-text mb-2 font-display">{title}</h3>
      {description && <p className="text-text-muted max-w-md mb-6">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
};
