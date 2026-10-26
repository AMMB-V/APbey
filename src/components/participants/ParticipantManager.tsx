import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import {
  Users,
  UserPlus,
  Shuffle,
  CheckCheck,
  Trash2,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Download,
  Printer,
  Sparkles,
} from 'lucide-react';

export const ParticipantManager: React.FC = () => {
  const {
    activeTournament,
    participants,
    addParticipant,
    addBulkParticipants,
    removeParticipant,
    toggleCheckIn,
    checkInAll,
    toggleInspected,
    reorderParticipants,
    randomizeParticipants,
    currentRole,
  } = useTournament();

  const [newName, setNewName] = useState('');
  const [newCombos, setNewCombos] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const tParticipants = activeTournament
    ? participants.filter((p) => p.tournamentId === activeTournament.id).sort((a, b) => a.seed - b.seed)
    : [];

  const checkedInCount = tParticipants.filter((p) => p.checkedIn).length;
  const inspectedCount = tParticipants.filter((p) => p.inspected).length;

  const handleAddSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament || !newName.trim()) return;
    const combos = newCombos
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    addParticipant(activeTournament.id, newName.trim(), combos.length > 0 ? combos : undefined);
    setNewName('');
    setNewCombos('');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament || !bulkText.trim()) return;
    const names = bulkText
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    addBulkParticipants(activeTournament.id, names);
    setBulkText('');
    setShowBulkModal(false);
  };

  const moveSeed = (index: number, direction: 'up' | 'down') => {
    if (!activeTournament) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= tParticipants.length) return;

    const copy = [...tParticipants];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    reorderParticipants(activeTournament.id, copy);
  };

  const exportToCSV = () => {
    if (tParticipants.length === 0) return;
    const headers = ['Siembra', 'Nombre', 'CheckIn', 'BeyCheck', 'Combo 1', 'Combo 2', 'Combo 3'];
    const rows = tParticipants.map((p) => [
      p.seed,
      `"${p.displayName.replace(/"/g, '""')}"`,
      p.checkedIn ? 'SI' : 'NO',
      p.inspected ? 'SI' : 'NO',
      `"${(p.deckCombos?.[0] || '').replace(/"/g, '""')}"`,
      `"${(p.deckCombos?.[1] || '').replace(/"/g, '""')}"`,
      `"${(p.deckCombos?.[2] || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bladers_${activeTournament?.slug || 'torneo'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-[var(--hueso)]">
      {/* Top Banner */}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--hueso)] tracking-tight font-display">
              Gestión de Bladers, Decks 3on3 & Siembra (Seeding)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-[var(--r-chip)] font-mono font-bold bg-[var(--grafito)] text-[var(--hueso)] border border-[var(--costura)]">
              {tParticipants.length} {activeTournament?.maxParticipants ? `/ ${activeTournament.maxParticipants}` : ''} Jugadores
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-[var(--acero)] mt-1">
            <span>Check-in: <strong className="text-[var(--hueso)] font-mono">{checkedInCount}/{tParticipants.length}</strong></span>
            <span>·</span>
            <span>Bey Check verificado: <strong className="text-[var(--hueso)] font-mono">{inspectedCount}/{tParticipants.length}</strong></span>
          </div>
        </div>

        {/* Global Participant Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportToCSV}
            className="btn btn--secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Exportar lista de participantes a CSV"
          >
            <AceroIcon id="i-exportar" size="sm" />
            Exportar CSV
          </button>

          <button
            onClick={handlePrint}
            className="btn btn--secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
            title="Imprimir planilla de check-in para mesa"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir
          </button>

          {currentRole !== 'public' && (
            <>
              <button
                onClick={() => checkInAll(activeTournament!.id)}
                className="btn btn--secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              >
                <AceroIcon id="i-checkin" size="sm" className="text-emerald-400" />
                Check-in a Todos
              </button>

              <button
                onClick={() => randomizeParticipants(activeTournament!.id)}
                className="btn btn--secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Siembra Aleatoria
              </button>

              <button
                onClick={() => setShowBulkModal(true)}
                className="btn btn--primary text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Importar en Bloque (Walk-in)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Quick Add Form */}
      {currentRole !== 'public' && (
        <form
          onSubmit={handleAddSingle}
          className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="grow w-full sm:w-auto">
            <input
              type="text"
              placeholder="Nombre o Nickname del Blader (ej. Ekusu Kurosu)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)]"
            />
          </div>

          <div className="grow w-full sm:w-auto">
            <input
              type="text"
              placeholder="Deck Combos 3on3 (ej. Dran Sword 3-60F, Wizard Rod 9-60B, Phoenix Wing 5-60P)"
              value={newCombos}
              onChange={(e) => setNewCombos(e.target.value)}
              className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)] font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto btn btn--primary text-xs px-4 py-2 flex items-center justify-center gap-1.5 shrink-0"
          >
            <AceroIcon id="i-anadir" size="sm" />
            Añadir Blader
          </button>
        </form>
      )}

      {/* Participants Table with Reordering */}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tabla">
            <thead>
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">Siembra</th>
                <th className="py-2.5 px-4">Blader / Participante</th>
                <th className="py-2.5 px-4">Deck Registrado (3on3)</th>
                <th className="py-2.5 px-3 text-center">Check-In</th>
                <th className="py-2.5 px-3 text-center">Bey Check</th>
                {currentRole !== 'public' && (
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[var(--acero)]">
                    No hay bladers registrados en este torneo. Añade participantes arriba o impórtalos en bloque.
                  </td>
                </tr>
              ) : (
                tParticipants.map((p, idx) => (
                  <tr key={p.id}>
                    {/* Seed & Order buttons */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      <div className="flex items-center justify-center gap-1">
                        {currentRole !== 'public' && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveSeed(idx, 'up')}
                              disabled={idx === 0}
                              className={`p-0.5 rounded hover:bg-[var(--grafito)] ${
                                idx === 0 ? 'opacity-20 cursor-not-allowed' : 'text-[var(--acero)] hover:text-white'
                              }`}
                              title="Subir siembra"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveSeed(idx, 'down')}
                              disabled={idx === tParticipants.length - 1}
                              className={`p-0.5 rounded hover:bg-[var(--grafito)] ${
                                idx === tParticipants.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-[var(--acero)] hover:text-white'
                              }`}
                              title="Bajar siembra"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <span className="w-5 text-right font-mono text-[var(--cobalto)]">#{p.seed}</span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-4 font-semibold text-[var(--hueso)]">
                      {p.displayName}
                    </td>

                    {/* Combos */}
                    <td className="py-2.5 px-4 font-mono text-[11px]">
                      {p.deckCombos && p.deckCombos.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.deckCombos.map((c, i) => (
                            <span key={i} className="inline-block bg-[var(--grafito)] border border-[var(--costura)] text-[var(--hueso)] px-1.5 py-0.5 rounded-[var(--r-chip)]">
                              ⚡ {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--acero)] italic">Sin combos registrados (1on1 o pendiente)</span>
                      )}
                    </td>

                    {/* Check In */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleCheckIn(p.id)}
                        disabled={currentRole === 'public'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--r-chip)] text-[11px] font-semibold transition-colors ${
                          p.checkedIn
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                            : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-white border border-[var(--costura)]'
                        }`}
                      >
                        {p.checkedIn ? 'Confirmado' : 'Pendiente'}
                      </button>
                    </td>

                    {/* Bey Check */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleInspected(p.id)}
                        disabled={currentRole === 'public'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[var(--r-chip)] text-[11px] font-semibold transition-colors ${
                          p.inspected
                            ? 'bg-blue-950/60 text-blue-300 border border-blue-700/50'
                            : 'bg-[var(--grafito)] text-[var(--acero)] hover:text-white border border-[var(--costura)]'
                        }`}
                      >
                        <AceroIcon id="i-beycheck" size="sm" className="text-[var(--cobalto)]" />
                        {p.inspected ? 'Aprobado' : 'Sin revisar'}
                      </button>
                    </td>

                    {/* Delete */}
                    {currentRole !== 'public' && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="p-1.5 rounded-[var(--r-control)] text-[var(--acero)] hover:text-rose-400 hover:bg-[var(--grafito)] transition-colors"
                          title="Eliminar participante"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--chasis)] rounded-[var(--r-card)] shadow-2xl max-w-lg w-full p-5 border border-[var(--costura)] animate-in zoom-in-95 text-[var(--hueso)]">
            <h3 className="font-bold text-[var(--hueso)] text-base flex items-center gap-2 font-display">
              <FileSpreadsheet className="w-5 h-5 text-[var(--cobalto)]" />
              Importación Masiva de Participantes (Walk-in)
            </h3>
            <p className="text-xs text-[var(--acero)] mt-1">
              Pega una lista de nombres de bladers, uno por línea. Se añadirán en orden y se les asignará siembra secuencial automáticamente.
            </p>

            <form onSubmit={handleBulkSubmit} className="mt-4 space-y-4">
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Kamen X\nChrome Ryugu\nBird Kazami\nMulti Nanairo\nKing Manju\nMeiko Maiden"}
                className="w-full text-xs font-mono p-3 border border-[var(--costura)] rounded-[var(--r-control)] bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)]"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--costura)]">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="btn btn--secondary text-xs px-3.5 py-1.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn--primary text-xs px-4 py-1.5"
                >
                  Importar Bladers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
