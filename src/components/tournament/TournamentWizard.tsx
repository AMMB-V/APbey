import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import {
  StageType,
  TiebreakerCriteria,
  Tournament,
} from '../../types/tournament';
import {
  Settings,
  Trophy,
  Copy,
  Layers,
  Sliders,
  Scale,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Check,
  Download,
  Plus,
  Trash2,
  Database,
  Cloud,
  Sparkles,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Filter,
} from 'lucide-react';

export interface TiebreakerMeta {
  id: TiebreakerCriteria;
  label: string;
  subtitle: string;
  description: string;
  tag: string;
  accent: string;
}

export const ALL_TIEBREAKER_OPTIONS: TiebreakerMeta[] = [
  {
    id: 'points',
    label: 'Puntos en la tabla (3x Victoria, 1x Empate)',
    subtitle: 'Puntuación base de clasificación de la etapa',
    description: '3 puntos por victoria y 1 punto por empate en combates completados.',
    tag: 'Base Oficial',
    accent: 'bg-[var(--acero)] text-[var(--grafito)]',
  },
  {
    id: 'head_to_head',
    label: 'Enfrentamiento directo (Duelo particular)',
    subtitle: 'Resultado directo entre los bladers empatados',
    description: 'En empate entre 2 o más participantes, clasifica quien ganó el combate directo entre ellos.',
    tag: 'Clave WBO',
    accent: 'bg-emerald-700 text-white',
  },
  {
    id: 'points_average',
    label: 'Puntos promedio por combate (Anotación media)',
    subtitle: 'Cociente entre puntos a favor y partidos jugados (PF / Partidos)',
    description: 'Calcula el promedio ofensivo dividiendo los puntos a favor entre los combates disputados.',
    tag: 'Promedio',
    accent: 'bg-indigo-700 text-white',
  },
  {
    id: 'points_for',
    label: 'Puntos totales anotados (Puntos a favor)',
    subtitle: 'Suma acumulada total de puntos a favor en la etapa',
    description: 'Mayor cantidad bruta de puntos anotados en todas las batallas. Premia el estilo ofensivo.',
    tag: 'Puntos Totales',
    accent: 'bg-amber-700 text-white',
  },
  {
    id: 'point_diff',
    label: 'Diferencia neta de puntos (PF - PC)',
    subtitle: 'Puntos a favor restando los puntos recibidos en contra',
    description: 'Diferencial aritmético neto entre puntos anotados y recibidos durante los combates.',
    tag: 'Diferencial',
    accent: 'bg-sky-700 text-white',
  },
  {
    id: 'points_ratio',
    label: 'Cociente / Ratio de puntos (PF / PC)',
    subtitle: 'Proporción matemática entre puntos marcados y recibidos',
    description: 'Evita empates cuando los competidores tienen idéntico diferencial neto pero mayor solidez defensiva.',
    tag: 'Cociente',
    accent: 'bg-purple-700 text-white',
  },
  {
    id: 'buchholz',
    label: 'Sistema Buchholz (Fuerza de rivales)',
    subtitle: 'Suma acumulada de puntos de los contrincantes enfrentados',
    description: 'Premia a los competidores con un calendario más exigente frente a oponentes de mayor puntaje.',
    tag: 'Suizo',
    accent: 'bg-rose-700 text-white',
  },
  {
    id: 'seed',
    label: 'Siembra inicial del torneo (Seeding ranking)',
    subtitle: 'Posición de siembra reglamentaria asignada al registrarse',
    description: 'Último recurso reglamentario basado en el ranking o posición de siembra inicial asignada.',
    tag: 'Siembra',
    accent: 'bg-neutral-600 text-white',
  },
];

export const TournamentWizard: React.FC = () => {
  const {
    activeTournament,
    updateTournament,
    createTournament,
    duplicateTournament,
    stages,
    matches,
    participants,
    updateStage,
    updateStageConfig,
    updateStageTiebreakers,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<'general' | 'arbitration' | 'stages' | 'tiebreakers'>('general');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states based on active tournament
  const [name, setName] = useState(activeTournament?.name || '');
  const [description, setDescription] = useState(activeTournament?.description || '');
  const [venueName, setVenueName] = useState(activeTournament?.venueName || '');
  const [venueAddress, setVenueAddress] = useState(activeTournament?.venueAddress || '');
  const [country, setCountry] = useState(activeTournament?.country || 'PA');
  const [entryFee, setEntryFee] = useState<number>(activeTournament?.entryFee || 0);
  const [maxParticipants, setMaxParticipants] = useState<number>(activeTournament?.maxParticipants || 16);

  // Arbitration points
  const [spinPts, setSpinPts] = useState<number>(activeTournament?.finishPoints.spin ?? 1);
  const [overPts, setOverPts] = useState<number>(activeTournament?.finishPoints.over ?? 2);
  const [burstPts, setBurstPts] = useState<number>(activeTournament?.finishPoints.burst ?? 2);
  const [xtremePts, setXtremePts] = useState<number>(activeTournament?.finishPoints.xtreme ?? 3);
  const [foulPts, setFoulPts] = useState<number>(activeTournament?.foulPoints ?? 1); // 1 pt default
  const [foulsPerPoint, setFoulsPerPoint] = useState<number>(activeTournament?.foulsPerPoint ?? 3); // 3 faltas acumuladas

  // 3-tier points to win
  const [pointsGroup, setPointsGroup] = useState<number>(activeTournament?.pointsToWinGroup ?? 4);
  const [pointsPlayoffs, setPointsPlayoffs] = useState<number>(activeTournament?.pointsToWinPlayoffs ?? 5);
  const [pointsFinal, setPointsFinal] = useState<number>(activeTournament?.pointsToWinFinal ?? 7);

  // Tournament stages
  const tournamentStages = stages.filter((s) => s.tournamentId === activeTournament?.id);
  const defaultSelectedStage =
    tournamentStages.find((s) => s.type === 'group_stage' || s.type === 'round_robin' || s.type === 'swiss') ||
    tournamentStages[0];

  const [selectedStageId, setSelectedStageId] = useState<string>(defaultSelectedStage?.id || '');

  // Keep selected stage aligned if tournament switches
  useEffect(() => {
    if (tournamentStages.length > 0 && !tournamentStages.some((s) => s.id === selectedStageId)) {
      setSelectedStageId(defaultSelectedStage?.id || tournamentStages[0].id);
    }
  }, [activeTournament?.id, selectedStageId, tournamentStages, defaultSelectedStage]);

  const activeStage = stages.find((s) => s.id === selectedStageId) || defaultSelectedStage;

  const [advanceCount, setAdvanceCount] = useState<number>(activeStage?.config.advanceCount ?? 2);
  const [groupSize, setGroupSize] = useState<number>(activeStage?.config.groupSize ?? 4);
  const [bestOf, setBestOf] = useState<number>(activeStage?.bestOf ?? 1); // best_of = 1 default
  const [pointsToWin, setPointsToWin] = useState<number>(activeStage?.pointsToWin ?? 4);

  // Tiebreaker priority order for current stage
  const [stageTiebreakers, setStageTiebreakers] = useState<TiebreakerCriteria[]>(
    activeStage?.config.tiebreakers || ['points', 'head_to_head', 'point_diff', 'points_for', 'seed']
  );

  // Sync tiebreakers when selected stage changes
  useEffect(() => {
    if (activeStage?.config.tiebreakers) {
      setStageTiebreakers(activeStage.config.tiebreakers);
    }
  }, [selectedStageId, activeStage?.config.tiebreakers]);

  // Backend persistence status & indicators
  const [isSavingTiebreakers, setIsSavingTiebreakers] = useState<boolean>(false);
  const [applyToAllStages, setApplyToAllStages] = useState<boolean>(false);
  const [lastSyncInfo, setLastSyncInfo] = useState<{
    stageId: string;
    timestamp: string;
    persistedIn: 'backend' | 'local';
    message?: string;
  } | null>(null);

  const moveTiebreaker = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= stageTiebreakers.length) return;
    const copy = [...stageTiebreakers];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setStageTiebreakers(copy);
  };

  const removeTiebreaker = (criterion: TiebreakerCriteria) => {
    if (stageTiebreakers.length <= 1) return; // Keep at least 1
    setStageTiebreakers((prev) => prev.filter((c) => c !== criterion));
  };

  const addTiebreaker = (criterion: TiebreakerCriteria) => {
    if (stageTiebreakers.includes(criterion)) return;
    setStageTiebreakers((prev) => [...prev, criterion]);
  };

  const applyPreset = (preset: 'wbo' | 'average' | 'offensive' | 'swiss') => {
    switch (preset) {
      case 'wbo':
        setStageTiebreakers(['points', 'head_to_head', 'point_diff', 'points_for', 'seed']);
        break;
      case 'average':
        setStageTiebreakers(['points', 'points_average', 'points_ratio', 'point_diff', 'head_to_head', 'seed']);
        break;
      case 'offensive':
        setStageTiebreakers(['points', 'points_for', 'point_diff', 'head_to_head', 'seed']);
        break;
      case 'swiss':
        setStageTiebreakers(['points', 'buchholz', 'point_diff', 'head_to_head', 'seed']);
        break;
    }
  };

  const handleSaveTiebreakers = async () => {
    if (!activeStage) return;
    setIsSavingTiebreakers(true);
    try {
      const result = await updateStageTiebreakers(activeStage.id, stageTiebreakers);

      if (applyToAllStages) {
        // Also update any other group or round robin stages in this tournament
        const otherStages = tournamentStages.filter((s) => s.id !== activeStage.id);
        for (const s of otherStages) {
          await updateStageTiebreakers(s.id, stageTiebreakers);
        }
      }

      setLastSyncInfo({
        stageId: activeStage.id,
        timestamp: new Date().toLocaleTimeString(),
        persistedIn: result.persistedIn,
        message: result.message,
      });

      showSuccess(
        `Reglas de desempate persistidas exitosamente en ${
          result.persistedIn === 'backend' ? 'base de datos backend' : 'almacenamiento local'
        } para la etapa "${activeStage.name}".`
      );
    } catch (err) {
      console.error(err);
      showSuccess('Reglas actualizadas en memoria.');
    } finally {
      setIsSavingTiebreakers(false);
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament) return;
    updateTournament(activeTournament.id, {
      name,
      description,
      venueName,
      venueAddress,
      country,
      entryFee,
      maxParticipants,
    });
    showSuccess('Datos generales del evento guardados exitosamente.');
  };

  const handleSaveArbitration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament) return;
    updateTournament(activeTournament.id, {
      foulPoints: foulPts,
      foulsPerPoint,
      pointsToWinGroup: pointsGroup,
      pointsToWinPlayoffs: pointsPlayoffs,
      pointsToWinFinal: pointsFinal,
      finishPoints: {
        spin: spinPts,
        over: overPts,
        burst: burstPts,
        xtreme: xtremePts,
      },
    });
    showSuccess('Parámetros de arbitraje, faltas y puntuaciones por etapa guardados.');
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDuplicate = () => {
    if (!activeTournament) return;
    const duplicated = duplicateTournament(activeTournament.id);
    showSuccess(`Torneo duplicado exitosamente como plantilla: "${duplicated.name}".`);
  };

  const handleExportCSV = () => {
    if (!activeTournament) return;
    const tParticipants = participants.filter((p) => p.tournamentId === activeTournament.id);
    let csvContent = 'data:text/csv;charset=utf-8,Seed,Blader,CheckedIn,BeyChecked,Deck\n';
    tParticipants.forEach((p) => {
      csvContent += `${p.seed},"${p.displayName}",${p.checkedIn},${p.inspected},"${p.deckCombos?.join(' | ') || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTournament.slug}-participantes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar with actions */}
      <div className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[var(--hueso)] tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--acero)]" />
            Diseñador & Parámetros de Torneo
          </h2>
          <p className="text-xs text-[var(--acero)] mt-1">
            Configuración exacta estilo Challonge adaptada a las reglas de arbitraje de Beyblade X.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-[var(--costura)] hover:bg-[var(--grafito)] text-[var(--hueso)] transition-colors flex items-center gap-1.5"
            title="Exportar lista de participantes en formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>

          <button
            onClick={handleDuplicate}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-neutral-900 hover:bg-neutral-800 text-white transition-colors flex items-center gap-1.5 shadow-xs"
            title="RF-07: Duplicar torneo como plantilla"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicar Plantilla
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 border-b border-[var(--costura)] pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'general' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          General & Sede
        </button>
        <button
          onClick={() => setActiveTab('arbitration')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'arbitration' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Arbitraje & Puntuaciones
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'stages' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Etapas & Avance
        </button>
        <button
          onClick={() => setActiveTab('tiebreakers')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'tiebreakers' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Criterios de Desempate
        </button>
      </div>

      {/* Tab 1: General Info */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">Nombre del Torneo:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] focus:outline-none focus:ring-1 focus:ring-[var(--acero)] text-[var(--hueso)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">Slug / Enlace Público:</label>
              <input
                type="text"
                disabled
                value={activeTournament?.slug || ''}
                className="w-full text-xs font-mono border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] text-[var(--acero)]"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-[var(--acero)]">Descripción & Reglas adicionales:</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] focus:outline-none focus:ring-1 focus:ring-[var(--acero)] text-[var(--hueso)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">Sede del Evento:</label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] focus:outline-none focus:ring-1 focus:ring-[var(--acero)] text-[var(--hueso)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">Dirección de la Sede:</label>
              <input
                type="text"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] focus:outline-none focus:ring-1 focus:ring-[var(--acero)] text-[var(--hueso)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">Cupo Máximo de Jugadores:</label>
              <input
                type="number"
                min={2}
                max={128}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full text-xs font-mono border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] focus:outline-none focus:ring-1 focus:ring-[var(--acero)] text-[var(--hueso)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">Tarifa de Inscripción ($ USD):</label>
              <input
                type="number"
                step="0.5"
                min={0}
                value={entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="w-full text-xs font-mono border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] focus:outline-none focus:ring-1 focus:ring-[var(--acero)] text-[var(--hueso)]"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--costura)]">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Guardar Cambios Generales
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Arbitration Parameters */}
      {activeTab === 'arbitration' && (
        <form onSubmit={handleSaveArbitration} className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--hueso)]">RF-03: Puntos por Tipo de Finish</h3>
            <p className="text-xs text-[var(--acero)] mt-0.5">
              Valores reglamentarios de Beyblade X por defecto: Spin 1, Burst 2, Over 2, Xtreme 3.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-emerald-800 block mb-1">Spin Finish</label>
              <input
                type="number"
                min={0}
                max={10}
                value={spinPts}
                onChange={(e) => setSpinPts(Number(e.target.value))}
                className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 1 pt</span>
            </div>

            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-sky-800 block mb-1">Over Finish</label>
              <input
                type="number"
                min={0}
                max={10}
                value={overPts}
                onChange={(e) => setOverPts(Number(e.target.value))}
                className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 2 pts</span>
            </div>

            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-amber-800 block mb-1">Burst Finish</label>
              <input
                type="number"
                min={0}
                max={10}
                value={burstPts}
                onChange={(e) => setBurstPts(Number(e.target.value))}
                className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 2 pts</span>
            </div>

            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-rose-800 block mb-1">Xtreme Finish</label>
              <input
                type="number"
                min={0}
                max={10}
                value={xtremePts}
                onChange={(e) => setXtremePts(Number(e.target.value))}
                className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 3 pts</span>
            </div>
          </div>

          <div className="border-t border-[var(--costura)] pt-5 space-y-3">
            <h4 className="text-xs font-bold uppercase text-[var(--acero)]">Reglamento de Faltas & Tarjetas</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--acero)]">
                  Puntos otorgados al rival por falta:
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={foulPts}
                  onChange={(e) => setFoulPts(Number(e.target.value))}
                  className="w-full text-xs font-mono border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] text-[var(--hueso)]"
                />
                <span className="text-[11px] text-[var(--acero)]">Defecto: 1 punto al rival.</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--acero)]">
                  Frecuencia de falta por punto (Fouls per point):
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={foulsPerPoint}
                  onChange={(e) => setFoulsPerPoint(Number(e.target.value))}
                  className="w-full text-xs font-mono border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] focus:bg-[var(--chasis)] text-[var(--hueso)]"
                />
                <span className="text-[11px] text-[var(--acero)]">1 = cada falta da punto directo. 3 = acumulación de 3 faltas.</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--costura)]">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Guardar Parámetros de Arbitraje
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Stages & Advancement */}
      {activeTab === 'stages' && (
        <div className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--hueso)]">RF-04 & RF-18: Etapas y Transición de Torneo</h3>
            <p className="text-xs text-[var(--acero)] mt-0.5">
              Control multietapa: Define cómo avanzan los clasificados de la fase de grupos a las llaves de playoffs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-[var(--hueso)]">
                Tras los grupos, pasan los primeros N de cada grupo:
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={advanceCount}
                onChange={(e) => setAdvanceCount(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold border border-[var(--costura)] rounded-lg p-2 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <p className="text-[11px] text-[var(--acero)]">
                Por ejemplo: Si hay 4 grupos y pasan los 2 primeros, se genera un cuadro de Cuartos de Final (8 bladers).
              </p>
            </div>

            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-[var(--hueso)]">
                Tamaño ideal de grupo (Group Size):
              </label>
              <input
                type="number"
                min={3}
                max={8}
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold border border-[var(--costura)] rounded-lg p-2 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <p className="text-[11px] text-[var(--acero)]">
                Distribución serpenteante por siembra (1, 8, 9, 16 en Grupo A, etc.).
              </p>
            </div>

            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="text-xs font-bold text-[var(--hueso)]">
                Mejor de N sets (Best of sets):
              </label>
              <input
                type="number"
                min={1}
                max={7}
                step={2}
                value={bestOf}
                onChange={(e) => setBestOf(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold border border-[var(--costura)] rounded-lg p-2 bg-[var(--grafito)] text-[var(--hueso)]"
              />
              <p className="text-[11px] text-[var(--acero)]">
                Eliminación directa a puntos por defecto: best_of = 1.
              </p>
            </div>
          </div>

          {/* 3 Parameters of points section */}
          <div className="pt-4 border-t border-[var(--costura)] space-y-3">
            <div>
              <h4 className="text-xs font-bold uppercase text-[var(--acero)]">
                Parámetros de Puntos para Ganar (3 Umbrales Reglamentarios)
              </h4>
              <p className="text-[11px] text-[var(--acero)] mt-0.5">
                Configura metas de puntos distintas para cada fase del torneo según el estándar de competición:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
                <label className="text-xs font-bold text-[var(--hueso)] block mb-1">
                  1. Fase de Grupos
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={pointsGroup}
                  onChange={(e) => setPointsGroup(Number(e.target.value))}
                  className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
                />
                <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 4 pts</span>
              </div>

              <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
                <label className="text-xs font-bold text-[var(--hueso)] block mb-1">
                  2. Cuartos / Semifinales
                </label>
                <input
                  type="number"
                  min={1}
                  max={15}
                  value={pointsPlayoffs}
                  onChange={(e) => setPointsPlayoffs(Number(e.target.value))}
                  className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
                />
                <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 5 pts</span>
              </div>

              <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
                <label className="text-xs font-bold text-[var(--hueso)] block mb-1">
                  3. Gran Final
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={pointsFinal}
                  onChange={(e) => setPointsFinal(Number(e.target.value))}
                  className="w-full text-center font-mono font-bold text-base border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
                />
                <span className="text-[10px] text-[var(--acero)] block text-center mt-1">Por defecto: 7 pts</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-[var(--costura)]">
            <button
              onClick={() => {
                if (activeTournament) {
                  updateTournament(activeTournament.id, {
                    pointsToWinGroup: pointsGroup,
                    pointsToWinPlayoffs: pointsPlayoffs,
                    pointsToWinFinal: pointsFinal,
                  });
                }
                showSuccess('Parámetros de etapa y umbrales de puntos actualizados.');
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Guardar Configuración de Etapas y Puntos
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Advanced Stage Tiebreakers */}
      {activeTab === 'tiebreakers' && (
        <div className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-neutral-200 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                  <Scale className="w-5 h-5 text-neutral-700" />
                  Módulo Avanzado: Reglas de Desempate por Etapa
                </h3>
                <p className="text-xs text-[var(--acero)] mt-1">
                  Define criterios específicos por etapa (Enfrentamiento directo, Puntos promedio, Puntos totales o Diferencial) con persistencia en backend.
                </p>
              </div>

              {/* Backend Status Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold shrink-0">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>
                  Backend REST API: <strong className="font-mono">Sincronizado</strong>
                </span>
                {lastSyncInfo && (
                  <span className="text-[10px] text-emerald-700 border-l border-emerald-300 pl-2">
                    {lastSyncInfo.timestamp}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 1. Stage Selector */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[var(--hueso)] flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-neutral-600" />
                Selecciona la Etapa a Configurar:
              </label>
              <span className="text-[11px] text-[var(--acero)]">
                Cada etapa del torneo puede poseer su propia jerarquía de desempate independiente.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {tournamentStages.map((stg) => {
                const isSelected = stg.id === selectedStageId;
                const isGroupOrSwiss =
                  stg.type === 'group_stage' || stg.type === 'round_robin' || stg.type === 'swiss';

                return (
                  <button
                    key={stg.id}
                    type="button"
                    onClick={() => setSelectedStageId(stg.id)}
                    className={`p-3 text-left rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-neutral-900 bg-white ring-2 ring-neutral-900 shadow-xs'
                        : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-neutral-900 truncate">
                        {stg.position}. {stg.name}
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-neutral-900 shrink-0 mt-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono">
                        {stg.type}
                      </span>
                      <span className="text-[10px] text-[var(--acero)]">
                        {stg.config.tiebreakers?.length || 5} reglas
                      </span>
                      {isGroupOrSwiss && (
                        <span className="text-[10px] text-emerald-700 font-medium">
                          ✓ Clasificación activa
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Fast Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--hueso)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Plantillas Reglamentarias Rápidas:
              </span>
              <span className="text-[11px] text-[var(--acero)]">
                Aplica combinaciones predefinidas con 1 clic:
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('wbo')}
                className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left text-xs transition-colors group"
              >
                <div className="font-bold text-neutral-900 group-hover:text-neutral-950">
                  Estándar WBO
                </div>
                <div className="text-[10px] text-[var(--acero)] truncate mt-0.5">
                  Tabla → Directo → Dif. → Totales
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('average')}
                className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left text-xs transition-colors group"
              >
                <div className="font-bold text-indigo-900 group-hover:text-indigo-950">
                  Puntos Promedio
                </div>
                <div className="text-[10px] text-[var(--acero)] truncate mt-0.5">
                  Tabla → Promedio → Ratio → Directo
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('offensive')}
                className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left text-xs transition-colors group"
              >
                <div className="font-bold text-amber-900 group-hover:text-amber-950">
                  Puntos Totales
                </div>
                <div className="text-[10px] text-[var(--acero)] truncate mt-0.5">
                  Tabla → Totales → Dif. → Directo
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('swiss')}
                className="p-2.5 rounded-lg border border-neutral-200 hover:border-neutral-400 bg-neutral-50 hover:bg-white text-left text-xs transition-colors group"
              >
                <div className="font-bold text-rose-900 group-hover:text-rose-950">
                  Challonge / Suizo
                </div>
                <div className="text-[10px] text-[var(--acero)] truncate mt-0.5">
                  Tabla → Buchholz → Dif. → Directo
                </div>
              </button>
            </div>
          </div>

          {/* 3. Active Pipeline of Tiebreaker Criteria */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--hueso)] flex items-center gap-1.5">
                <ListOrdered className="w-4 h-4 text-neutral-700" />
                Jerarquía Activa de Desempate para "{activeStage?.name || 'Etapa actual'}":
              </span>
              <span className="text-[11px] text-[var(--acero)] font-mono">
                {stageTiebreakers.length} criterios activos
              </span>
            </div>

            <div className="space-y-2">
              {stageTiebreakers.map((critId, idx) => {
                const meta =
                  ALL_TIEBREAKER_OPTIONS.find((c) => c.id === critId) || {
                    id: critId,
                    label: critId,
                    subtitle: 'Criterio personalizado',
                    description: '',
                    tag: 'Regla',
                    accent: 'bg-neutral-800 text-white',
                  };

                return (
                  <div
                    key={critId}
                    className="p-3.5 bg-neutral-50/70 hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl flex items-center justify-between gap-3 transition-all shadow-2xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="w-6 h-6 rounded-full bg-[var(--acero)] text-[var(--grafito)] text-xs font-bold font-mono flex items-center justify-center shadow-xs">
                          {idx + 1}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-mono uppercase mt-1">
                          {idx === 0 ? 'Base' : `#${idx + 1}`}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-neutral-900">
                            {meta.label}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${meta.accent}`}>
                            {meta.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-600 mt-0.5">
                          {meta.subtitle}
                        </p>
                        <p className="text-[11px] text-neutral-400 italic mt-0.5">
                          {meta.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveTiebreaker(idx, 'up')}
                        disabled={idx === 0}
                        className={`p-1.5 rounded-lg border border-neutral-200 transition-colors ${
                          idx === 0
                            ? 'opacity-20 cursor-not-allowed bg-[var(--grafito)]'
                            : 'text-neutral-700 bg-white hover:bg-neutral-100 hover:border-neutral-300'
                        }`}
                        title="Subir prioridad en la jerarquía"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTiebreaker(idx, 'down')}
                        disabled={idx === stageTiebreakers.length - 1}
                        className={`p-1.5 rounded-lg border border-neutral-200 transition-colors ${
                          idx === stageTiebreakers.length - 1
                            ? 'opacity-20 cursor-not-allowed bg-[var(--grafito)]'
                            : 'text-neutral-700 bg-white hover:bg-neutral-100 hover:border-neutral-300'
                        }`}
                        title="Bajar prioridad en la jerarquía"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTiebreaker(critId)}
                        disabled={stageTiebreakers.length <= 1}
                        className={`p-1.5 rounded-lg border border-neutral-200 transition-colors ${
                          stageTiebreakers.length <= 1
                            ? 'opacity-20 cursor-not-allowed bg-[var(--grafito)]'
                            : 'text-rose-400 bg-[var(--grafito)] hover:bg-rose-900/30 hover:border-rose-700'
                        }`}
                        title="Remover de la jerarquía activa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Inactive Criteria to Add */}
          {ALL_TIEBREAKER_OPTIONS.some((c) => !stageTiebreakers.includes(c.id)) && (
            <div className="p-4 bg-[var(--grafito)] rounded-xl border border-dashed border-[var(--costura)] space-y-2">
              <span className="text-xs font-bold text-[var(--acero)] block">
                Criterios Adicionales Disponibles para Incorporar:
              </span>
              <div className="flex flex-wrap gap-2">
                {ALL_TIEBREAKER_OPTIONS.filter((c) => !stageTiebreakers.includes(c.id)).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => addTiebreaker(c.id)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--costura)] hover:border-[var(--acero)] bg-[var(--grafito)] hover:bg-[var(--chasis)] text-xs font-semibold text-[var(--hueso)] transition-all flex items-center gap-1.5 shadow-sm group"
                  >
                    <Plus className="w-3.5 h-3.5 text-[var(--acero)] group-hover:text-[var(--hueso)]" />
                    <span>{c.label.split('(')[0].trim()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Live Simulation / Resolution Preview */}
          <div className="p-4 bg-sky-900/20 border border-sky-800/50 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-bold text-sky-200">
                Simulador de Resolución de Desempates ({activeStage?.name || 'Etapa'}):
              </h4>
            </div>
            <p className="text-xs text-sky-300 leading-relaxed">
              En caso de igualdad de puntos de tabla entre 2 o más bladers, el sistema evaluará:
            </p>
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
              {stageTiebreakers.map((crit, idx) => {
                const opt = ALL_TIEBREAKER_OPTIONS.find((c) => c.id === crit);
                return (
                  <React.Fragment key={crit}>
                    <span className="px-2 py-1 rounded bg-sky-900/40 text-sky-200 font-semibold border border-sky-700">
                      {idx + 1}. {opt ? opt.tag : crit}
                    </span>
                    {idx < stageTiebreakers.length - 1 && (
                      <span className="text-sky-400 font-bold">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* 6. Multi-stage scope toggle & Save Button */}
          <div className="pt-4 border-t border-[var(--costura)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold text-[var(--acero)] cursor-pointer">
              <input
                type="checkbox"
                checked={applyToAllStages}
                onChange={(e) => setApplyToAllStages(e.target.checked)}
                className="w-4 h-4 rounded text-[var(--acero)] focus:ring-[var(--acero)] border-[var(--costura)]"
              />
              <span>Aplicar esta jerarquía a todas las etapas de grupos y suizas del torneo</span>
            </label>

            <button
              type="button"
              onClick={handleSaveTiebreakers}
              disabled={isSavingTiebreakers}
              className="px-5 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-500 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {isSavingTiebreakers ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Persistiendo en Backend...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Guardar Reglas de Desempate en Backend</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
