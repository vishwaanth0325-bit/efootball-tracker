import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export const Toast: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => {
        let Icon = Info;
        let colorClass = 'text-accent';
        let bgClass = 'bg-surface border-border-light';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          colorClass = 'text-green-500';
        } else if (toast.type === 'error') {
          Icon = XCircle;
          colorClass = 'text-red-500';
        }

        return (
          <div key={toast.id} className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border ${bgClass} animate-slideIn w-80 max-w-[calc(100vw-2rem)]`}>
            <Icon className={`shrink-0 ${colorClass}`} size={20} />
            <p className="flex-1 text-sm font-medium text-text">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="shrink-0 p-1 text-text-muted hover:text-text rounded transition-colors">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};
