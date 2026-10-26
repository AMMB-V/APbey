import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import {
  Users,
  UserPlus,
  Shuffle,
  CheckCheck,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from 'lucide-react';
import { Participant } from '../../types/tournament';

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Gestión de Bladers & Siembra (Seeding)
            </h2>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-neutral-100 text-neutral-800">
              {tParticipants.length} {activeTournament?.maxParticipants ? `/ ${activeTournament.maxParticipants}` : ''} Jugadores
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-neutral-500 mt-1">
            <span>Check-in: <strong className="text-neutral-800 font-mono">{checkedInCount}/{tParticipants.length}</strong></span>
            <span>·</span>
            <span>Bey Check verificado: <strong className="text-neutral-800 font-mono">{inspectedCount}/{tParticipants.length}</strong></span>
          </div>
        </div>

        {/* Global Participant Actions */}
        {currentRole !== 'public' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => checkInAll(activeTournament!.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Check-in a Todos
            </button>

            <button
              onClick={() => randomizeParticipants(activeTournament!.id)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors flex items-center gap-1.5"
            >
              <Shuffle className="w-3.5 h-3.5" />
              Siembra Aleatoria
            </button>

            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-neutral-900 hover:bg-neutral-800 text-white transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Importar en Bloque (Walk-in)
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Form */}
      {currentRole !== 'public' && (
        <form
          onSubmit={handleAddSingle}
          className="bg-white rounded-xl border border-neutral-200 p-4 shadow-2xs flex flex-col sm:flex-row items-center gap-3"
        >
          <div className="grow w-full sm:w-auto">
            <input
              type="text"
              placeholder="Nombre o Nickname del Blader (ej. Ekusu Kurosu)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="w-full text-xs font-medium border border-neutral-300 rounded-lg px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="grow w-full sm:w-auto">
            <input
              type="text"
              placeholder="Deck Combos (ej. Dran Sword 3-60F, Hells Scythe 4-60B)"
              value={newCombos}
              onChange={(e) => setNewCombos(e.target.value)}
              className="w-full text-xs font-medium border border-neutral-300 rounded-lg px-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Añadir Blader
          </button>
        </form>
      )}

      {/* Participants Table with Reordering */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] uppercase font-bold text-neutral-500 bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">Siembra</th>
                <th className="py-2.5 px-4">Blader / Participante</th>
                <th className="py-2.5 px-4">Deck Registrado</th>
                <th className="py-2.5 px-3 text-center">Check-In</th>
                <th className="py-2.5 px-3 text-center">Bey Check</th>
                {currentRole !== 'public' && (
                  <th className="py-2.5 px-3 text-right">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-neutral-400">
                    No hay bladers registrados en este torneo. Añade participantes arriba.
                  </td>
                </tr>
              ) : (
                tParticipants.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-neutral-50/80 transition-colors">
                    {/* Seed & Order buttons */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-neutral-700">
                      <div className="flex items-center justify-center gap-1">
                        {currentRole !== 'public' && (
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => moveSeed(idx, 'up')}
                              disabled={idx === 0}
                              className={`p-0.5 rounded hover:bg-neutral-200 ${
                                idx === 0 ? 'opacity-20 cursor-not-allowed' : 'text-neutral-600'
                              }`}
                              title="Subir siembra"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveSeed(idx, 'down')}
                              disabled={idx === tParticipants.length - 1}
                              className={`p-0.5 rounded hover:bg-neutral-200 ${
                                idx === tParticipants.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-neutral-600'
                              }`}
                              title="Bajar siembra"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <span className="w-5 text-right font-mono">#{p.seed}</span>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="py-2.5 px-4 font-semibold text-neutral-900">
                      {p.displayName}
                    </td>

                    {/* Combos */}
                    <td className="py-2.5 px-4 text-neutral-600 font-mono text-[11px]">
                      {p.deckCombos && p.deckCombos.length > 0 ? (
                        <div className="space-y-0.5">
                          {p.deckCombos.map((c, i) => (
                            <span key={i} className="inline-block bg-neutral-100 px-1.5 py-0.2 rounded mr-1.5">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">Sin combos registrados</span>
                      )}
                    </td>

                    {/* Check In */}
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => toggleCheckIn(p.id)}
                        disabled={currentRole === 'public'}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          p.checkedIn
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
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
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          p.inspected
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {p.inspected ? 'Aprobado' : 'Sin revisar'}
                      </button>
                    </td>

                    {/* Delete */}
                    {currentRole !== 'public' && (
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-5 border border-neutral-200 animate-in zoom-in-95">
            <h3 className="font-bold text-neutral-900 text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-neutral-700" />
              Importación Masiva de Participantes (Walk-in)
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Pega una lista de nombres de bladers, uno por línea. Se añadirán en orden y se les asignará siembra secuencial.
            </p>

            <form onSubmit={handleBulkSubmit} className="mt-4 space-y-4">
              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={"Kamen X\nChrome Ryugu\nBird Kazami\nMulti Nanairo\nKing Manju\nMeiko Maiden"}
                className="w-full text-xs font-mono p-3 border border-neutral-300 rounded-lg bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded shadow-xs"
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
