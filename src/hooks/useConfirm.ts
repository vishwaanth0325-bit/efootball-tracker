import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((confirmed: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({ ...options, isOpen: true, resolve });
    });
  }, []);

  const handleResponse = useCallback((confirmed: boolean) => {
    state.resolve?.(confirmed);
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state]);

  return { confirmState: state, confirm, handleResponse };
}
