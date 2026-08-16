import React from 'react';

interface LoadingSpinnerProps {
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ fullPage = false }) => {
  const spinner = (
    <div 
      style={{
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-accent)',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 0.8s linear infinite'
      }}
    />
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-bg">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {spinner}
    </div>
  );
};
