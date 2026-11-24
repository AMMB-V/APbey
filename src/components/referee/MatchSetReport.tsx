import { useEffect, useId, useRef, useState } from 'react';
import type { Match, Participant, SetScore, Stage } from '../../types/tournament';
import { getSetsNeeded, validateSetReport } from '../../lib/engine/arbitration';

interface MatchSetReportProps {
  match: Match;
  stage: Stage;
  players: [Participant, Participant];
  target: number;
  currentScores: SetScore[];
  canReport: boolean;
  onReport: (matchId: string, version: number, scores: SetScore[], partial?: boolean) => Promise<void>;
}

export function MatchSetReport({ match, stage, players, target, currentScores, canReport, onReport }: MatchSetReportProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const nextRowId = useRef(1);
  const [rows, setRows] = useState([{ id: 0, scores: ['', ''] as [string, string] }]);
  const [version, setVersion] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [queued, setQueued] = useState<{version: number; scores: SetScore[]; partial: boolean} | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  const [draftMessage, setDraftMessage] = useState('');
  const draftKey = 'apbey:set-draft:' + match.id;
  useEffect(() => {
    if (version === null || version !== match.version || !canReport) return;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({version, scores: rows.map(row => row.scores)}));
      setDraftMessage('Borrador en esta pestaña. Confirma para enviar el marcador.');
    } catch { setDraftMessage('Almacenamiento local no disponible. Mantén abierta esta pestaña.'); }
  }, [draftKey, rows, version, match.version, canReport]);
  const [error, setError] = useState('');
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const saved = savedVersion !== null && match.version <= savedVersion + 1;

  useEffect(() => {
    if (version !== null) dialog.current?.showModal();
  }, [version]);

  const scores: SetScore[] = rows.map(({ scores: [score1, score2] }) => [
    score1 === '' ? NaN : Number(score1),
    score2 === '' ? NaN : Number(score2),
  ]);
  const result = validateSetReport(scores, stage, target);
  const partialResult = validateSetReport(scores, stage, target, true);
  const winner = result.error === undefined ? players[result.sets1 > result.sets2 ? 0 : 1] : null;
  const changed = version !== null && (version !== match.version || !canReport);

  function openReport() {
    let initial: [string, string][] = currentScores.map(([a,b]) => [String(a), String(b)]);
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
      if (draft?.version === match.version && Array.isArray(draft.scores) && draft.scores.every((pair: unknown) =>
        Array.isArray(pair) && pair.length === 2 && pair.every(value => typeof value === 'string'))) initial = draft.scores;
    } catch { /* Start with the confirmed score when a draft cannot be read. */ }
    setRows(initial.map(([a, b]) => ({
      id: nextRowId.current++, scores: [String(a), String(b)],
    })));
    setError('');
    setVersion(match.version);
  }

  async function send(report: {version: number; scores: SetScore[]; partial: boolean}) {
    if (submitting.current || report.version !== match.version || !canReport) return;
    submitting.current = true;
    setSaving(true);
    setError('');
    try {
      await onReport(match.id, report.version, report.scores, report.partial);
      try { sessionStorage.removeItem(draftKey); } catch { /* The server already confirmed the report. */ }
      if (!report.partial) setSavedVersion(report.version);
      dialog.current?.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar el resultado.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!queued) return;
    if (changed || version === null) {
      setQueued(null);
      return;
    }
    if (online) {
      setQueued(null);
      void send(queued);
    }
  }, [queued, online, changed, version, send]);

  function submit(partial = false) {
    if ((partial ? partialResult.error !== undefined : !winner) || version === null || changed || saving) return;
    const report = {version, scores, partial};
    if (!navigator.onLine) {
      setQueued(report);
      return;
    }
    void send(report);
  }

  return (
    <>
      {match.status === 'completed' && currentScores.length > 0 ? (
        <div className="text-sm text-[var(--hueso)] flex flex-wrap items-center gap-3" aria-label="Resultado por sets">
          {currentScores.map(([score1, score2], index) => (
            <span key={index} className="font-mono text-xs">Set {index + 1} · {score1}–{score2}</span>
          ))}
        </div>
      ) : canReport && !saved && (
        <button type="button" onClick={openReport} className="acero-btn acero-btn--secondary text-xs self-start">
          {match.status === 'in_progress' ? 'Continuar marcador por sets' : 'Reportar resultado por sets'}
        </button>
      )}
      {saved && <span role="status" className="text-xs text-emerald-300">Resultado guardado.</span>}
      {version !== null && (
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          onClose={() => setVersion(null)}
          onCancel={(event) => { if (saving) event.preventDefault(); }}
          className="m-auto w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-[var(--costura)] bg-[var(--chasis)] p-4 sm:p-6 text-[var(--hueso)] shadow-2xl backdrop:bg-black/75"
        >
          <form onSubmit={(event) => { event.preventDefault(); void submit(); }} className="space-y-4">
            <div>
              <h2 id={titleId} className="text-lg font-bold">Reportar resultado por sets</h2>
              <p role="status" className="text-xs text-[var(--acero)]">{saving ? 'Enviando marcador…' : draftMessage}</p>
              {queued && <p role="status">Sin conexión. Se enviará el marcador confirmado al reconectar si mantienes abierto este reporte. <button type="button" className="underline" onClick={() => setQueued(null)}>Cancelar envío pendiente</button></p>}
              <p className="mt-1 text-xs text-[var(--acero)]">
                Al mejor de {stage.bestOf} · {getSetsNeeded(stage)} para ganar · {target} puntos por set. Si empatan, añade otro set.
              </p>
            </div>

            <fieldset disabled={saving || Boolean(queued)} className="space-y-3">
              {rows.map((row, rowIndex) => (
                <div key={row.id} className="rounded-xl border border-[var(--costura)] p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Set {rowIndex + 1}</span>
                    <button
                      type="button"
                      aria-label={`Quitar set ${rowIndex + 1}`}
                      onClick={() => setRows((current) => current.filter(({ id }) => id !== row.id))}
                      className="min-h-9 px-2 text-xs text-[var(--acero)] hover:text-[var(--hueso)]"
                    >
                      Quitar
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {players.map((player, playerIndex) => (
                      <label key={player.id} className="min-w-0 text-xs font-semibold">
                        <span className="block truncate mb-1">{player.displayName}</span>
                        <input
                          aria-label={`Set ${rowIndex + 1}, ${player.displayName}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          required
                          value={row.scores[playerIndex]}
                          onChange={(event) => {
                            const value = event.target.value;
                            setRows((current) => current.map((item) => item.id === row.id
                              ? { ...item, scores: playerIndex === 0 ? [value, item.scores[1]] : [item.scores[0], value] }
                              : item));
                          }}
                          className="w-full min-h-11 rounded-lg border border-[var(--control-border)] bg-[var(--grafito)] p-2 font-mono"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                disabled={Boolean(winner)}
                onClick={() => {
                  const id = nextRowId.current++;
                  setRows((current) => [...current, { id, scores: ['0', '0'] }]);
                }}
                className="acero-btn acero-btn--secondary text-xs disabled:opacity-40"
              >
                Añadir set
              </button>
            </fieldset>

            <p className="text-sm" aria-live="polite">
              {changed
                ? 'El combate cambió. Cierra y vuelve a abrir el formulario para revisar el marcador.'
                : winner
                  ? `Ganador: ${winner.displayName} · Sets ${result.sets1}–${result.sets2}`
                  : rows.every((row) => row.scores.every((score) => score !== ''))
                    ? result.error
                    : 'Completa el marcador de cada set.'}
            </p>
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-[var(--costura)]">
              <button type="button" disabled={saving} onClick={() => dialog.current?.close()} className="acero-btn acero-btn--secondary text-xs">
                Cancelar
              </button>
              <button type="button" disabled={partialResult.error !== undefined || changed || saving} onClick={() => void submit(true)} className="acero-btn acero-btn--secondary text-xs disabled:opacity-40">
                Guardar parcial
              </button>
              <button type="submit" disabled={!winner || changed || saving} className="acero-btn acero-btn--primary text-xs disabled:opacity-40">
                {saving ? 'Guardando…' : 'Confirmar resultado'}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
