import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className={`modal-panel bg-surface w-full ${maxWidth} rounded-xl shadow-2xl animate-slideIn`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-border-light">
            <h2 className="text-lg font-semibold font-display text-text">{title}</h2>
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
