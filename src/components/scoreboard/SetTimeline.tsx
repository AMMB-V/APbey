import type { SetScore } from '../../types/tournament';

export function SetTimeline({ scores, canCloseTie, onCloseTie }: {
  scores: SetScore[];
  canCloseTie: boolean;
  onCloseTie: () => void;
}) {
  return (
    <section aria-label="Secuencia de sets" className="space-y-3 rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold">Secuencia de sets</h3>
        {canCloseTie && <button type="button" onClick={onCloseTie} className="acero-btn acero-btn--secondary min-h-11">
          Cerrar set empatado
        </button>}
      </div>
      <ol className="flex flex-wrap gap-2">
        {scores.map(([a, b], index) => {
          const active = index === scores.length - 1;
          return (
            <li key={index} aria-current={active ? 'step' : undefined}
              className="min-w-28 rounded-xl border border-[var(--costura)] bg-[var(--grafito)] p-2 text-xs aria-current:border-[var(--cobalto)]">
              <span className="font-bold">Set {index + 1} · <span className="font-mono tabular-nums">{a}–{b}</span></span>
              <span className="block text-[var(--acero)]">{active ? 'En curso' : a === b ? 'Empate guardado' : 'Finalizado'}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
