import { useId, useRef } from 'react';
import { Layers, MoreHorizontal, Shield, Tv, X } from 'lucide-react';
import type { MainTabType } from './Header';

export function ToolsMenu({ activeTab, navigate, openStadium }: {
  activeTab: MainTabType;
  navigate: (tab: MainTabType) => void;
  openStadium?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const selected = activeTab === 'deck' || activeTab === 'tierlist';
  const items = [
    { label: 'Deck 3on3', description: 'Construye y guarda tus equipos', icon: Layers, tab: 'deck' },
    { label: 'Tier List', description: 'Consulta las piezas competitivas', icon: Shield, tab: 'tierlist' },
    ...(openStadium ? [{ label: 'Modo Estadio', description: 'Proyecta el marcador en vivo', icon: Tv, tab: null }] : []),
  ] as const;

  return <>
    <button type="button" aria-haspopup="dialog" aria-label="Más herramientas"
      onClick={() => dialog.current?.showModal()}
      className={`flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold md:flex-row md:gap-2 ${selected ? 'text-[var(--cobalto-texto)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'}`}>
      <MoreHorizontal aria-hidden="true" className="size-5" />
      <span>Más</span>
    </button>
    <dialog ref={dialog} aria-labelledby={title}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      className="fixed inset-auto bottom-0 left-0 right-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-[var(--costura)] bg-[var(--chasis)] p-0 text-[var(--hueso)] shadow-2xl backdrop:bg-black/65 md:inset-0 md:m-auto md:max-w-md md:rounded-2xl">
      <div className="safe-bottom p-5">
        <header className="mb-3 flex items-center justify-between border-b border-[var(--costura)] pb-2">
          <h2 id={title} className="text-lg font-bold">Más herramientas</h2>
          <button type="button" aria-label="Cerrar herramientas" onClick={() => dialog.current?.close()}
            className="grid size-11 place-items-center rounded-xl text-[var(--acero)] hover:bg-[var(--grafito)]">
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>
        <ul className="space-y-2">
          {items.map(({ label, description, icon: Icon, tab }) => (
            <li key={label}>
              <button type="button" aria-current={tab === activeTab ? 'page' : undefined}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--costura)] bg-[var(--grafito)] px-3 py-2 text-left hover:border-[var(--acero)]"
                onClick={() => { dialog.current?.close(); if (tab) navigate(tab); else openStadium?.(); }}>
                <Icon aria-hidden="true" className="size-5 shrink-0 text-[var(--cobalto-texto)]" />
                <span><strong className="block text-sm">{label}</strong><span className="text-xs text-[var(--acero)]">{description}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  </>;
}
