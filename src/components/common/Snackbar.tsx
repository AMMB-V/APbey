import React, { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';

export interface SnackbarAction {
  label: string;
  onClick: () => void;
}

interface SnackbarProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  onUndo?: () => void;
  undoLabel?: string;
  duration?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  message,
  isOpen,
  onClose,
  onUndo,
  undoLabel = 'Deshacer',
  duration = 5000,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-4 py-3 bg-[var(--chasis)] border border-[var(--costura)] text-[var(--hueso)] rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="text-sm font-medium leading-snug truncate pr-2">
        {message}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onUndo && (
          <button
            type="button"
            onClick={() => {
              onUndo();
              onClose();
            }}
            className="px-3 py-1.5 bg-[var(--cobalto)] text-[var(--tinta)] hover:opacity-90 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs min-h-[36px]"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{undoLabel}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="p-1 text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--costura)] rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
