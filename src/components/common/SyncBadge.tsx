import React, { useEffect, useState } from 'react';
import { CloudCheck, CloudOff, RefreshCw } from 'lucide-react';

interface SyncBadgeProps {
  pendingCount?: number;
  className?: string;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({ pendingCount = 0, className = '' }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="status"
        aria-live="polite"
        title="Sin conexión a internet. Los cambios se guardarán localmente."
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80 shadow-xs ${className}`}
      >
        <CloudOff className="w-3.5 h-3.5 text-rose-400 shrink-0" aria-hidden="true" />
        <span>Sin conexión</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        title={`${pendingCount} operaciones pendientes de sincronización`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80 shadow-xs ${className}`}
      >
        <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin shrink-0" aria-hidden="true" />
        <span>Pendiente ({pendingCount})</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      title="Todos los datos están sincronizados"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/70 text-emerald-300 border border-emerald-800/70 shadow-xs ${className}`}
    >
      <CloudCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
      <span>Guardado</span>
    </div>
  );
};
