import React, { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  onConfirm,
  onCancel,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus the primary button when opened
    const timer = setTimeout(() => confirmButtonRef.current?.focus(), 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      btn: 'bg-rose-600 hover:bg-rose-500 text-white',
      icon: <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" aria-hidden="true" />,
    },
    warning: {
      btn: 'bg-amber-500 hover:bg-amber-400 text-black',
      icon: <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" aria-hidden="true" />,
    },
    primary: {
      btn: 'bg-[var(--cobalto)] hover:opacity-90 text-[var(--tinta)]',
      icon: <CheckCircle className="w-6 h-6 text-[var(--cobalto)] shrink-0" aria-hidden="true" />,
    },
  }[variant];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl shadow-2xl p-6 text-[var(--hueso)] flex flex-col gap-4 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {variantStyles.icon}
            <h2 id="confirm-dialog-title" className="text-lg font-bold tracking-tight text-[var(--hueso)]">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cerrar diálogo"
            className="p-1.5 text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--costura)] rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p id="confirm-dialog-description" className="text-sm text-[var(--acero)] leading-relaxed whitespace-pre-line">
          {description}
        </p>

        <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-[var(--costura)]">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-[var(--grafito)] border border-[var(--costura)] text-[var(--hueso)] hover:bg-[var(--costura)] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all shadow-md ${variantStyles.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
