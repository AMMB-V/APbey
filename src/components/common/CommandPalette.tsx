import React, { useEffect, useState } from 'react';
import { Search, Trophy, Shield, Layers, TrendingUp, Radio, Wrench, X } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const { tournaments, activeTournament, currentRole } = useTournament();

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const baseItems = [
    { id: 'torneos', title: 'Torneos', category: 'Navegación', icon: <Trophy className="w-4 h-4 text-amber-400" /> },
    { id: 'bracket', title: 'Bracket & Grupos', category: 'Navegación', icon: <Trophy className="w-4 h-4 text-blue-400" /> },
    { id: 'marcador', title: 'Marcador oficial', category: 'Herramientas', icon: <Radio className="w-4 h-4 text-emerald-400" /> },
    { id: 'rankings', title: 'Rankings WBO & Salón de la Fama', category: 'Estadísticas', icon: <TrendingUp className="w-4 h-4 text-purple-400" /> },
    { id: 'deck', title: 'Deck 3on3 Builder', category: 'Herramientas', icon: <Layers className="w-4 h-4 text-cyan-400" /> },
    { id: 'tierlist', title: 'Tier List Competitiva', category: 'Herramientas', icon: <Shield className="w-4 h-4 text-rose-400" /> },
  ];

  if (currentRole === 'admin' || currentRole === 'organizer' || currentRole === 'referee') {
    baseItems.push({
      id: 'admin',
      title: 'Gestionar Torneo & Árbitros',
      category: 'Gestión',
      icon: <Wrench className="w-4 h-4 text-amber-400" />,
    });
  }

  const filteredItems = baseItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Búsqueda rápida"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-[var(--chasis)] border border-[var(--costura)] rounded-2xl shadow-2xl overflow-hidden flex flex-col text-[var(--hueso)] animate-in zoom-in-95 duration-150">
        <div className="p-3 border-b border-[var(--costura)] flex items-center gap-3">
          <Search className="w-5 h-5 text-[var(--acero)] shrink-0" aria-hidden="true" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Escribe para saltar a una vista o sección..."
            className="w-full bg-transparent text-sm text-[var(--hueso)] placeholder-[var(--acero)] outline-hidden"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar búsqueda rápida"
            className="p-1 text-[var(--acero)] hover:text-[var(--hueso)] rounded-md min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[var(--costura)]/40">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--acero)]">
              No se encontraron secciones para &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--grafito)] transition-colors text-left group min-h-[44px]"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[var(--grafito)] group-hover:bg-[var(--costura)] transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--hueso)]">{item.title}</div>
                    <div className="text-[11px] text-[var(--acero)]">{item.category}</div>
                  </div>
                </div>
                <span className="text-[10px] text-[var(--acero)] font-mono opacity-60 group-hover:opacity-100">
                  Saltar ↵
                </span>
              </button>
            ))
          )}
        </div>

        <div className="p-2.5 bg-[var(--grafito)] border-t border-[var(--costura)] flex items-center justify-between text-[11px] text-[var(--acero)]">
          <span>Consejo: Usa <kbd className="px-1.5 py-0.5 rounded bg-[var(--costura)] font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-[var(--costura)] font-mono text-[10px]">K</kbd> en cualquier momento</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--costura)] font-mono text-[10px]">Esc</kbd> para salir</span>
        </div>
      </div>
    </div>
  );
};
