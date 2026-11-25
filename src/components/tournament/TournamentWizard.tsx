import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import {
  StageStructure,
  StageType,
  TiebreakerCriteria,
  Tournament,
  TournamentCategory,
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
    label: 'Puntos en la tabla',
    subtitle: 'Puntuación base de clasificación de la etapa',
    description: '3 puntos por victoria y 1 punto por empate en combates completados.',
    tag: 'Base Oficial',
    accent: 'bg-[var(--acero)] text-[var(--grafito)]',
  },
  {
    id: 'head_to_head',
    label: 'Enfrentamiento directo',
    subtitle: 'Resultado directo entre los bladers empatados',
    description: 'En empate entre 2 o más participantes, clasifica quien ganó el combate directo entre ellos.',
    tag: 'Clave WBO',
    accent: 'bg-emerald-700 text-white',
  },
  {
    id: 'points_average',
    label: 'Puntos promedio por combate',
    subtitle: 'Cociente entre puntos a favor y partidos jugados',
    description: 'Calcula el promedio ofensivo dividiendo los puntos a favor entre los combates disputados.',
    tag: 'Promedio',
    accent: 'bg-indigo-700 text-white',
  },
  {
    id: 'game_wins',
    label: 'Juegos y sets ganados',
    subtitle: 'Cantidad de sets ganados en los combates disputados',
    description: 'Desempata según el total de sets ganados, antes de recurrir a la siembra.',
    tag: 'Sets',
    accent: 'bg-cyan-700 text-white',
  },
  {
    id: 'points_for',
    label: 'Puntos totales anotados',
    subtitle: 'Suma acumulada total de puntos a favor en la etapa',
    description: 'Mayor cantidad bruta de puntos anotados en todas las batallas. Premia el estilo ofensivo.',
    tag: 'Puntos Totales',
    accent: 'bg-amber-700 text-white',
  },
  {
    id: 'point_diff',
    label: 'Diferencia neta de puntos',
    subtitle: 'Puntos a favor restando los puntos recibidos en contra',
    description: 'Diferencial aritmético neto entre puntos anotados y recibidos durante los combates.',
    tag: 'Diferencial',
    accent: 'bg-sky-700 text-white',
  },
  {
    id: 'points_ratio',
    label: 'Ratio de puntos',
    subtitle: 'Proporción matemática entre puntos marcados y recibidos',
    description: 'Evita empates cuando los competidores tienen idéntico diferencial neto pero mayor solidez defensiva.',
    tag: 'Cociente',
    accent: 'bg-purple-700 text-white',
  },
  {
    id: 'median_buchholz',
    label: 'Buchholz medio',
    subtitle: 'Fuerza de rivales descartando el valor más alto y más bajo',
    description: 'Suma los puntos de los rivales y descarta el mayor y el menor cuando hay al menos tres rivales. Los BYEs no cuentan.',
    tag: 'Challonge',
    accent: 'bg-rose-700 text-white',
  },
  {
    id: 'buchholz',
    label: 'Sistema Buchholz',
    subtitle: 'Suma acumulada de puntos de los contrincantes enfrentados',
    description: 'Premia a los competidores con un calendario más exigente frente a oponentes de mayor puntaje.',
    tag: 'Suizo',
    accent: 'bg-rose-700 text-white',
  },
  {
    id: 'seed',
    label: 'Siembra inicial del torneo',
    subtitle: 'Posición de siembra reglamentaria asignada al registrarse',
    description: 'Último recurso reglamentario basado en el ranking o posición de siembra inicial asignada.',
    tag: 'Siembra',
    accent: 'bg-neutral-600 text-white',
  },
];

export const TournamentWizard: React.FC<{
  initialTab?: 'general' | 'arbitration' | 'stages' | 'tiebreakers' | 'permissions';
}> = ({ initialTab = 'general' }) => {
  const {
    activeTournament,
    updateTournament,
    createTournament,
    duplicateTournament,
    addStage,
    removeStage,
    stages,
    matches,
    participants,
    users,
    updateStage,
    updateStageConfig,
    updateStageTiebreakers,
  } = useTournament();

  const [activeTab, setActiveTab] = useState<'general' | 'arbitration' | 'stages' | 'tiebreakers' | 'permissions'>(initialTab);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states based on active tournament
  const [name, setName] = useState(activeTournament?.name || '');
  const [description, setDescription] = useState(activeTournament?.description || '');
  const [venueName, setVenueName] = useState(activeTournament?.venueName || '');
  const [venueAddress, setVenueAddress] = useState(activeTournament?.venueAddress || '');
  const [country, setCountry] = useState(activeTournament?.country || 'PA');
  const [entryFee, setEntryFee] = useState<number>(activeTournament?.entryFee || 0);
  const [maxParticipants, setMaxParticipants] = useState<number>(activeTournament?.maxParticipants || 16);
  const [category, setCategory] = useState<TournamentCategory>(activeTournament?.category || 'clash');

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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setName(activeTournament?.name || '');
    setDescription(activeTournament?.description || '');
    setVenueName(activeTournament?.venueName || '');
    setVenueAddress(activeTournament?.venueAddress || '');
    setCountry(activeTournament?.country || 'PA');
    setEntryFee(activeTournament?.entryFee || 0);
    setMaxParticipants(activeTournament?.maxParticipants || 16);
    setCategory(activeTournament?.category || 'clash');
    setSpinPts(activeTournament?.finishPoints.spin ?? 1);
    setOverPts(activeTournament?.finishPoints.over ?? 2);
    setBurstPts(activeTournament?.finishPoints.burst ?? 2);
    setXtremePts(activeTournament?.finishPoints.xtreme ?? 3);
    setFoulPts(activeTournament?.foulPoints ?? 1);
    setFoulsPerPoint(activeTournament?.foulsPerPoint ?? 3);
    setPointsGroup(activeTournament?.pointsToWinGroup ?? 4);
    setPointsPlayoffs(activeTournament?.pointsToWinPlayoffs ?? 5);
    setPointsFinal(activeTournament?.pointsToWinFinal ?? 7);
  }, [activeTournament?.id]);

  // Tournament stages
  const tournamentStages = stages.filter((s) => s.tournamentId === activeTournament?.id);
  const defaultSelectedStage =
    tournamentStages.find((s) => s.type === 'group_stage' || s.type === 'round_robin' || s.type === 'swiss') ||
    tournamentStages[0];

  const [selectedStageId, setSelectedStageId] = useState<string>(defaultSelectedStage?.id || '');
  const [newStageType, setNewStageType] = useState<StageType>('single_elimination');
  const [newStageName, setNewStageName] = useState('');

  // Keep selected stage aligned if tournament switches
  useEffect(() => {
    if (tournamentStages.length > 0 && !tournamentStages.some((s) => s.id === selectedStageId)) {
      setSelectedStageId(defaultSelectedStage?.id || tournamentStages[0].id);
    }
  }, [activeTournament?.id, selectedStageId, tournamentStages, defaultSelectedStage]);

  const activeStage = stages.find((s) => s.id === selectedStageId) || defaultSelectedStage;
  const stageConfigurationLocked = activeStage?.status !== 'pending';

  const [advanceCount, setAdvanceCount] = useState<number>(activeStage?.config.advanceCount ?? 2);
  const [groupSize, setGroupSize] = useState<number>(activeStage?.config.groupSize ?? 4);
  const [swissRounds, setSwissRounds] = useState<number>(activeStage?.config.swissRounds ?? 3);
  const [swissStations, setSwissStations] = useState<number>(activeStage?.config.swissStations ?? 1);
  const [stageStructure, setStageStructure] = useState<StageStructure>(activeStage?.config.stageStructure ?? 'two_stage');
  const [pointsPerMatchWin, setPointsPerMatchWin] = useState<number>(activeStage?.config.pointsPerMatchWin ?? 1);
  const [pointsPerMatchDraw, setPointsPerMatchDraw] = useState<number>(activeStage?.config.pointsPerMatchDraw ?? 0);
  const [pointsPerSetWin, setPointsPerSetWin] = useState<number>(activeStage?.config.pointsPerSetWin ?? 0);
  const [pointsPerSetDraw, setPointsPerSetDraw] = useState<number>(activeStage?.config.pointsPerSetDraw ?? 0);
  const [pointsPerBye, setPointsPerBye] = useState<number>(activeStage?.config.pointsPerBye ?? 1);
  const [grandFinalType, setGrandFinalType] = useState<NonNullable<typeof activeStage>['config']['grandFinalType']>(
    activeStage?.config.grandFinalType ?? 'one_or_two_matches'
  );
  const [bestOf, setBestOf] = useState<number>(
    activeStage?.bestOf ?? (activeStage?.type === 'group_stage' || activeStage?.type === 'round_robin' || activeStage?.type === 'swiss' ? 1 : 3)
  );
  const [pointsToWin, setPointsToWin] = useState<number>(activeStage?.pointsToWin ?? 4);

  // Tiebreaker priority order for current stage
  const [stageTiebreakers, setStageTiebreakers] = useState<TiebreakerCriteria[]>(
    activeStage?.config.tiebreakers || ['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed']
  );

  // Sync tiebreakers when selected stage changes
  useEffect(() => {
    setAdvanceCount(activeStage?.config.advanceCount ?? 2);
    setGroupSize(activeStage?.config.groupSize ?? 4);
    setSwissRounds(activeStage?.config.swissRounds ?? 3);
    setSwissStations(activeStage?.config.swissStations ?? 1);
    setStageStructure(activeStage?.config.stageStructure ?? 'two_stage');
    setPointsPerMatchWin(activeStage?.config.pointsPerMatchWin ?? 1);
    setPointsPerMatchDraw(activeStage?.config.pointsPerMatchDraw ?? 0);
    setPointsPerSetWin(activeStage?.config.pointsPerSetWin ?? 0);
    setPointsPerSetDraw(activeStage?.config.pointsPerSetDraw ?? 0);
    setPointsPerBye(activeStage?.config.pointsPerBye ?? 1);
    setGrandFinalType(activeStage?.config.grandFinalType ?? 'one_or_two_matches');
    setBestOf(activeStage?.bestOf ?? (
      activeStage?.type === 'group_stage' || activeStage?.type === 'round_robin' || activeStage?.type === 'swiss' ? 1 : 3
    ));
    setPointsToWin(activeStage?.pointsToWin ?? 4);
    setStageTiebreakers(activeStage?.config.tiebreakers || ['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed']);
  }, [selectedStageId, activeStage?.id]);

  // Backend persistence status & indicators
  const [isSavingTiebreakers, setIsSavingTiebreakers] = useState<boolean>(false);
  const [applyToAllStages, setApplyToAllStages] = useState<boolean>(false);
  const [lastSyncInfo, setLastSyncInfo] = useState<{
    stageId: string;
    timestamp: string;
    persistedIn: 'supabase' | 'none';
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
        setStageTiebreakers(['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed']);
        break;
      case 'average':
        setStageTiebreakers(['points', 'points_average', 'points_ratio', 'point_diff', 'head_to_head', 'seed']);
        break;
      case 'offensive':
        setStageTiebreakers(['points', 'points_for', 'point_diff', 'head_to_head', 'seed']);
        break;
      case 'swiss':
        setStageTiebreakers(['points', 'median_buchholz', 'head_to_head', 'point_diff', 'seed']);
        break;
    }
  };

  const handleSaveTiebreakers = async () => {
    if (!activeStage) return;
    setIsSavingTiebreakers(true);
    try {
      const result = await updateStageTiebreakers(activeStage.id, stageTiebreakers);

      if (!result.success) throw new Error(result.message);
      if (applyToAllStages) {
        // Also update any other group or round robin stages in this tournament
        const otherStages = tournamentStages.filter((s) => s.id !== activeStage.id && ['group_stage', 'round_robin', 'swiss'].includes(s.type));
        for (const s of otherStages) {
          const saved = await updateStageTiebreakers(s.id, stageTiebreakers);
          if (!saved.success) throw new Error(`${s.name}: ${saved.message}`);
        }
      }

      setLastSyncInfo({
        stageId: activeStage.id,
        timestamp: new Date().toLocaleTimeString(),
        persistedIn: result.persistedIn,
        message: result.message,
      });

      showSuccess(
        result.success
          ? `Reglas de desempate persistidas en Supabase para la etapa "${activeStage.name}".`
          : result.message
      );
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudieron persistir las reglas de desempate.');
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
      category,
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
    setErrorMsg(null);
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDuplicate = () => {
    if (!activeTournament) return;
    const duplicated = duplicateTournament(activeTournament.id);
    showSuccess(duplicated
      ? `Torneo duplicado exitosamente como plantilla: "${duplicated.name}".`
      : 'No se pudo duplicar el torneo porque ya no está disponible.');
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
          <h2 className="text-base font-bold text-[var(--hueso)] tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--acero)]" />
            Configuración del Torneo
          </h2>
          <p className="text-xs text-[var(--acero)] mt-1">
            {activeTournament?.name}
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
            title="Duplicar torneo como plantilla"
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
      {errorMsg && (
        <div className="p-3 bg-rose-900/30 border border-rose-700 rounded-lg text-xs font-semibold text-rose-300 flex items-center gap-2 animate-in fade-in">
          <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[var(--costura)] pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'general' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          General & Sede
        </button>
        <button
          onClick={() => setActiveTab('arbitration')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'arbitration' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          Reglas & Puntuación
        </button>
        <button
          onClick={() => setActiveTab('stages')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'stages' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          Estructura & Etapas
        </button>
        <button
          onClick={() => setActiveTab('tiebreakers')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'tiebreakers' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          Criterios de Desempate
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'permissions' ? 'bg-[var(--acero)] text-[var(--grafito)]' : 'text-[var(--acero)] hover:text-[var(--hueso)]'
          }`}
        >
          Árbitros & Permisos
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
              <label className="text-xs font-semibold text-[var(--acero)]">Categoría para ranking:</label>
              <select value={category} onChange={(event) => setCategory(event.target.value as TournamentCategory)}
                disabled={activeTournament?.status === 'completed'}
                className="w-full min-h-11 text-xs font-medium border border-[var(--costura)] rounded-lg p-2.5 bg-[var(--grafito)] text-[var(--hueso)] disabled:opacity-60">
                <option value="super">Super · tabla mayor</option>
                <option value="grand">Grand · tabla mayor</option>
                <option value="clash">Clash · tabla estándar</option>
                <option value="twisted">Twisted · tabla estándar</option>
              </select>
              <span className="text-[10px] text-[var(--acero)]">Se bloquea al finalizar para conservar la clasificación oficial.</span>
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
            <h3 className="text-sm font-bold text-[var(--hueso)]">Puntos por finish</h3>
            <p className="text-xs text-[var(--acero)] mt-0.5">
              Valores reglamentarios de Beyblade X por defecto: Spin 1, Burst 2, Over 2, Xtreme 3.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label htmlFor="finish-spin" className="flex items-center gap-2 text-sm font-bold text-[var(--finish-spin)]"><AceroIcon id="i-spin" size="sm" />Spin Finish</label>
              <input id="finish-spin"
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
              <label htmlFor="finish-over" className="flex items-center gap-2 text-sm font-bold text-[var(--finish-over)]"><AceroIcon id="i-over" size="sm" />Over Finish</label>
              <input id="finish-over"
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
              <label htmlFor="finish-burst" className="flex items-center gap-2 text-sm font-bold text-[var(--finish-burst)]"><AceroIcon id="i-burst" size="sm" />Burst Finish</label>
              <input id="finish-burst"
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
              <label htmlFor="finish-xtreme" className="flex items-center gap-2 text-sm font-bold text-[var(--finish-xtreme)]"><AceroIcon id="i-xtreme" size="sm" />Xtreme Finish</label>
              <input id="finish-xtreme"
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
                  Frecuencia de falta por punto (faltas por punto):
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
              Guardar reglas de arbitraje
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Stages & Advancement */}
      {(activeTab === 'stages' || activeTab === 'tiebreakers') && (
          <div className="p-4 bg-[var(--grafito)] rounded-xl border border-[var(--costura)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-[var(--hueso)] flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[var(--acero)]" />
                Etapa que vas a configurar
              </label>
              <span className="text-[11px] text-[var(--acero)]">
                Elige la etapa cuyas reglas quieres consultar o editar.
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
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStageId(stg.id)}
                    className={`p-3 text-left rounded-lg border transition-all text-xs flex flex-col justify-between ${
                      isSelected
                        ? 'border-[var(--cobalto)] bg-[var(--cobalto)]/15 ring-1 ring-[var(--cobalto)] shadow-xs'
                        : 'border-[var(--costura)] bg-[var(--grafito)] hover:border-[var(--costura)] hover:bg-[var(--grafito)]/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="font-bold text-[var(--hueso)] truncate">
                        {stg.position}. {stg.name}
                      </span>
                      {isSelected && (
                        <span className="text-[var(--cobalto-texto)]">✓ Seleccionada</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--chasis)] text-[var(--acero)] font-mono">
                        {{group_stage:'Fase de grupos', swiss:'Sistema suizo', single_elimination:'Eliminación directa', double_elimination:'Doble eliminación', round_robin:'Todos contra todos'}[stg.type]}
                      </span>
                      <span className="text-[10px] text-[var(--acero)]">
                        {stg.config.tiebreakers?.length || 5} reglas
                      </span>
                      {isGroupOrSwiss && (
                        <span className="text-[10px] text-[var(--acero)] font-medium">
                          Tabla de posiciones
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>
      )}
      {activeTab === 'stages' && (
        <fieldset
          disabled={stageConfigurationLocked}
          className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6 disabled:opacity-75"
        >
          <div>
            <h3 className="text-sm font-bold text-[var(--hueso)]">Configuración de {activeStage?.name || 'la etapa'}</h3>
            <p className="text-xs text-[var(--acero)] mt-0.5">
              Ajusta el formato, las condiciones de avance y la puntuación.
            </p>
            {stageConfigurationLocked && (
              <p className="mt-2 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 py-2 text-[11px] font-semibold text-amber-300">
                Esta etapa ya inició. Sus parámetros estructurales están bloqueados; puedes consultar el resumen sin alterar el torneo.
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold text-[var(--hueso)]">
              Tipo de torneo
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                {
                  value: 'single_stage' as const,
                  label: 'Una etapa',
                  description: 'Una sola fase de competición.',
                },
                {
                  value: 'two_stage' as const,
                  label: 'Dos etapas',
                  description: 'Grupos y una etapa final para los clasificados.',
                },
              ]).map((option) => (
                <label
                  key={option.value}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    stageStructure === option.value
                      ? 'bg-[var(--cobalto)]/20 border-[var(--cobalto)] text-[var(--hueso)]'
                      : 'bg-[var(--grafito)] border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)]'
                  }`}
                >
                  <input
                    type="radio"
                    name="wizard-stage-structure"
                    value={option.value}
                    checked={stageStructure === option.value}
                    onChange={() => setStageStructure(option.value)}
                    className="sr-only"
                  />
                  <span className="text-xs font-bold block">{option.label}</span>
                  <span className="text-[10px] mt-0.5 block">{option.description}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-[var(--acero)]">
              La configuración habitual es de dos etapas.
            </p>
          </fieldset>

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
              {activeStage?.type === 'swiss' ? (
                <div className="p-2.5 rounded bg-[var(--cobalto)]/10 border border-[var(--cobalto)]/40 text-xs text-[var(--hueso)] font-medium">
                  Solo puede ser 1 grupo en formato Suizo. Todos los participantes compiten en una tabla unificada.
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
              <label className="block text-xs font-bold text-[var(--hueso)]">
                Al mejor de
                <select
                  value={bestOf}
                  onChange={(e) => setBestOf(Number(e.target.value))}
                  className="mt-2 w-full text-xs font-mono font-bold border border-[var(--costura)] rounded-lg p-2 bg-[var(--grafito)] text-[var(--hueso)]"
                >
                  {[1, 3, 5, 7].map((value) => (
                    <option key={value} value={value}>{value} {value === 1 ? 'set' : 'sets'}</option>
                  ))}
                </select>
              </label>
              <p className="text-[11px] text-[var(--acero)]">
                Fase de grupos/Suizo usan 1 set; eliminación directa usa 3 o 5 sets.
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

            {activeStage?.type === 'swiss' && (
              <div className="p-4 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-2">
                <label htmlFor="wizard-swiss-rounds" className="text-xs font-bold text-[var(--hueso)]">
                  Rondas del Sistema Suizo
                </label>
                <input
                  id="wizard-swiss-rounds"
                  type="number"
                  min={1}
                  max={20}
                  value={swissRounds}
                  onChange={(e) => setSwissRounds(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold border border-[var(--costura)] rounded-lg p-2 bg-[var(--grafito)] text-[var(--hueso)]"
                />
                <label htmlFor="wizard-swiss-stations" className="text-xs font-bold text-[var(--hueso)]">
                  Mesas disponibles por ronda
                </label>
                <input
                  id="wizard-swiss-stations"
                  type="number"
                  min={1}
                  max={64}
                  value={swissStations}
                  onChange={(e) => setSwissStations(Math.max(1, Number(e.target.value)))}
                  className="w-full text-xs font-mono font-bold border border-[var(--costura)] rounded-lg p-2 bg-[var(--grafito)] text-[var(--hueso)]"
                />
                <p className="text-[11px] text-[var(--acero)]">
                  Cierra los combates de una ronda para abrir la siguiente. Cada ronda reparte automáticamente combates y árbitros entre estas mesas.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--costura)] space-y-3">
              <div>
                <h4 className="text-xs font-bold uppercase text-[var(--acero)]">Reglas de puntuación de la etapa</h4>
                <p className="text-[11px] text-[var(--acero)] mt-0.5">
                  Define los valores usados en la clasificación de grupos y en los BYEs.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  ['Victoria de partido', pointsPerMatchWin, setPointsPerMatchWin],
                  ['Empate de partido', pointsPerMatchDraw, setPointsPerMatchDraw],
                  ['Victoria de set', pointsPerSetWin, setPointsPerSetWin],
                  ['Empate de set', pointsPerSetDraw, setPointsPerSetDraw],
                  ['BYE', pointsPerBye, setPointsPerBye],
                ].map(([label, value, setter]) => (
                  <label key={label as string} className="p-3 bg-[var(--grafito)] rounded-lg border border-[var(--costura)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--hueso)] block">{label as string}</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={value as number}
                      onChange={(event) => (setter as (value: number) => void)(Number(event.target.value))}
                      className="w-full text-xs font-mono font-bold border border-[var(--costura)] rounded p-1.5 bg-[var(--grafito)] text-[var(--hueso)]"
                    />
                  </label>
                ))}
              </div>
              {activeStage?.type === 'double_elimination' && <label className="block max-w-sm">
                <span className="text-[10px] font-bold text-[var(--hueso)] block mb-1">Gran Final (Doble Eliminación)</span>
                <select
                  value={grandFinalType}
                  onChange={(event) => setGrandFinalType(event.target.value as typeof grandFinalType)}
                  className="w-full text-xs border border-[var(--costura)] rounded p-2 bg-[var(--grafito)] text-[var(--hueso)]"
                >
                  <option value="one_or_two_matches">Hasta dos combates (con reinicio)</option>
                  <option value="one_match">1 combate</option>
                  <option value="none">Sin gran final</option>
                </select>
              </label>}
            </div>
          <div className="flex justify-end pt-3 border-t border-[var(--costura)]">
            <button
              onClick={async () => {
                if (!activeTournament || !activeStage) return;
                try {
                  await updateStageConfig(activeStage.id, {
                    stageStructure,
                    pointsPerMatchWin,
                    pointsPerMatchDraw,
                    pointsPerSetWin,
                    pointsPerSetDraw,
                    pointsPerBye,
                    grandFinalType,
                    advanceCount,
                    groupSize,
                    swissRounds,
                    swissStations,
                  });
                  await updateStage(activeStage.id, {
                    bestOf,
                    pointsToWin,
                  });
                  updateTournament(activeTournament.id, {
                    pointsToWinGroup: pointsGroup,
                    pointsToWinPlayoffs: pointsPlayoffs,
                    pointsToWinFinal: pointsFinal,
                  });
                  showSuccess('Parámetros de etapa y umbrales de puntos actualizados.');
                } catch (error) {
                  setErrorMsg(error instanceof Error ? error.message : 'No se pudo actualizar la configuración de la etapa.');
                }
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              Guardar configuración de la etapa
            </button>
          </div>
        </fieldset>
      )}

      {/* Tab 4: Advanced Stage Tiebreakers */}
      {activeTab === 'tiebreakers' && (
        <div className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6">
          {/* Header */}
          <div className="border-b border-[var(--costura)] pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[var(--hueso)] tracking-tight flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[var(--acero)]" />
                  Reglas de desempate
                </h3>
                <p className="text-xs text-[var(--acero)] mt-1">
                  Se aplica el primer criterio de la lista. Si persiste el empate, se compara el siguiente.
                </p>
              </div>

              {lastSyncInfo && lastSyncInfo.stageId === activeStage?.id && <span className="text-sm text-[var(--acero)]">Último guardado · {lastSyncInfo.timestamp}</span>}
            </div>
          </div>

          <details className="rounded-xl border border-[var(--costura)] p-3"><summary className="cursor-pointer font-semibold">Gestionar etapas</summary>
            {activeTournament && (
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[var(--costura)]">
                <input
                  type="text"
                  value={newStageName}
                  onChange={(event) => setNewStageName(event.target.value)}
                  placeholder="Nombre de la nueva etapa"
                  className="grow text-xs border border-[var(--costura)] rounded-lg px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)]"
                />
                <select
                  value={newStageType}
                  onChange={(event) => setNewStageType(event.target.value as StageType)}
                  className="text-xs border border-[var(--costura)] rounded-lg px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)]"
                >
                  <option value="single_elimination">Eliminación simple</option>
                  <option value="double_elimination">Doble eliminación</option>
                  <option value="round_robin">Round Robin</option>
                  <option value="swiss">Suizo</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const created = addStage(activeTournament.id, newStageType, newStageName);
                    setNewStageName('');
                    setSelectedStageId(created.id);
                    showSuccess(`Etapa "${created.name}" añadida.`);
                  }}
                  className="px-3 py-2 text-xs font-bold rounded-lg bg-[var(--cobalto)] text-white whitespace-nowrap"
                >
                  + Añadir etapa
                </button>
                {activeStage && tournamentStages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      void removeStage(activeStage.id)
                        .then(() => {
                          const nextStage = tournamentStages.find((stage) => stage.id !== activeStage.id);
                          setSelectedStageId(nextStage?.id || '');
                          showSuccess('Etapa eliminada.');
                        })
                        .catch((error: unknown) => setErrorMsg(error instanceof Error ? error.message : 'No se pudo eliminar la etapa.'));
                    }}
                    className="px-3 py-2 text-xs font-bold rounded-lg border border-rose-700 text-rose-300 whitespace-nowrap"
                  >
                    Eliminar etapa
                  </button>
                )}
              </div>
            )}

          </details>

          {/* 2. Fast Presets */}
          <div className="space-y-3 rounded-xl border border-[var(--costura)] bg-[var(--grafito)]/45 p-3 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-bold text-[var(--hueso)] flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-amber-400/15 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                Plantillas de desempate
              </span>
              <span className="text-[11px] text-[var(--acero)]">
                Elige una para cargar sus criterios.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => applyPreset('wbo')}
                className="group relative min-h-28 overflow-hidden rounded-xl border border-[var(--costura)] bg-[var(--chasis)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-amber-400/60 hover:shadow-[0_8px_24px_rgb(251_191_36/0.08)] focus-visible:outline-2 focus-visible:outline-amber-300"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-amber-400" />
                <span className="mb-2 grid size-8 place-items-center rounded-lg bg-amber-400/15 text-amber-300 transition-transform group-hover:scale-105" aria-hidden="true">
                  <Trophy className="size-4" />
                </span>
                <div className="font-bold text-[var(--hueso)] group-hover:text-amber-200">
                  Estándar WBO
                </div>
                <div className="text-xs leading-relaxed text-[var(--acero)] mt-1">
                  Puntos, Buchholz medio y directo
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('average')}
                className="group relative min-h-28 overflow-hidden rounded-xl border border-[var(--costura)] bg-[var(--chasis)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-400/60 hover:shadow-[0_8px_24px_rgb(129_140_248/0.08)] focus-visible:outline-2 focus-visible:outline-indigo-300"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-indigo-400" />
                <span className="mb-2 grid size-8 place-items-center rounded-lg bg-indigo-400/15 text-indigo-300 transition-transform group-hover:scale-105" aria-hidden="true">
                  <Sliders className="size-4" />
                </span>
                <div className="font-bold text-[var(--hueso)] group-hover:text-indigo-200">
                  Puntos Promedio
                </div>
                <div className="text-xs leading-relaxed text-[var(--acero)] mt-1">
                  Puntos, promedio y cociente
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('offensive')}
                className="group relative min-h-28 overflow-hidden rounded-xl border border-[var(--costura)] bg-[var(--chasis)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_8px_24px_rgb(34_211_238/0.08)] focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-cyan-400" />
                <span className="mb-2 grid size-8 place-items-center rounded-lg bg-cyan-400/15 text-cyan-300 transition-transform group-hover:scale-105" aria-hidden="true">
                  <Layers className="size-4" />
                </span>
                <div className="font-bold text-[var(--hueso)] group-hover:text-cyan-200">
                  Puntos Totales
                </div>
                <div className="text-xs leading-relaxed text-[var(--acero)] mt-1">
                  Tabla → Totales → Dif. → Directo
                </div>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('swiss')}
                className="group relative min-h-28 overflow-hidden rounded-xl border border-[var(--costura)] bg-[var(--chasis)] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-rose-400/60 hover:shadow-[0_8px_24px_rgb(251_113_133/0.08)] focus-visible:outline-2 focus-visible:outline-rose-300"
              >
                <span className="absolute inset-x-0 top-0 h-1 bg-rose-400" />
                <span className="mb-2 grid size-8 place-items-center rounded-lg bg-rose-400/15 text-rose-300 transition-transform group-hover:scale-105" aria-hidden="true">
                  <Scale className="size-4" />
                </span>
                <div className="font-bold text-[var(--hueso)] group-hover:text-rose-200">
                  Challonge / Suizo
                </div>
                <div className="text-xs leading-relaxed text-[var(--acero)] mt-1">
                  Puntos, Buchholz medio y directo
                </div>
              </button>
            </div>
          </div>

          {/* 3. Active Pipeline of Tiebreaker Criteria */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-bold text-[var(--hueso)] flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-[var(--cobalto)]/15 text-[var(--cobalto-texto)]">
                  <ListOrdered className="w-4 h-4" />
                </span>
                Orden de prioridad · {activeStage?.name}
              </span>
              <span className="w-fit rounded-full border border-[var(--costura)] bg-[var(--grafito)] px-2.5 py-1 text-[11px] text-[var(--acero)] font-mono">
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
                    className="group relative overflow-hidden rounded-xl border border-[var(--costura)] bg-[linear-gradient(100deg,var(--grafito),var(--chasis))] p-3.5 pl-4 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-[var(--acero)]/60 hover:shadow-md sm:flex sm:items-center sm:justify-between"
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${meta.accent}`} aria-hidden="true" />
                    <div className="flex min-w-0 items-start gap-3 pr-2">
                      <div className="flex shrink-0 flex-col items-center">
                        <span className={`flex size-8 items-center justify-center rounded-full text-xs font-bold font-mono shadow-sm ${meta.accent}`}>
                          {idx + 1}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-[var(--hueso)] sm:text-base">
                            {meta.label}
                          </span>
                          <span className="rounded-full border border-[var(--costura)] bg-[var(--grafito)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--acero)]">
                            {meta.tag}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--acero)] sm:text-sm">
                          {critId === 'median_buchholz' ? meta.description : meta.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex shrink-0 items-center justify-end gap-1 border-t border-[var(--costura)] pt-3 sm:ml-3 sm:mt-0 sm:border-0 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => moveTiebreaker(idx, 'up')}
                        disabled={idx === 0}
                        className={`min-h-11 min-w-11 grid place-items-center rounded-lg border border-[var(--costura)] transition-colors ${
                          idx === 0
                            ? 'opacity-20 cursor-not-allowed bg-[var(--grafito)]'
                            : 'text-[var(--acero)] bg-[var(--grafito)] hover:bg-[var(--chasis)] hover:border-[var(--costura)]'
                        }`}
                        aria-label={`Subir prioridad de ${meta.label}`} title="Subir prioridad"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTiebreaker(idx, 'down')}
                        disabled={idx === stageTiebreakers.length - 1}
                        className={`min-h-11 min-w-11 grid place-items-center rounded-lg border border-[var(--costura)] transition-colors ${
                          idx === stageTiebreakers.length - 1
                            ? 'opacity-20 cursor-not-allowed bg-[var(--grafito)]'
                            : 'text-[var(--acero)] bg-[var(--grafito)] hover:bg-[var(--chasis)] hover:border-[var(--costura)]'
                        }`}
                        aria-label={`Bajar prioridad de ${meta.label}`} title="Bajar prioridad"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTiebreaker(critId)}
                        disabled={stageTiebreakers.length <= 1}
                        className={`min-h-11 min-w-11 grid place-items-center rounded-lg border border-[var(--costura)] transition-colors ${
                          stageTiebreakers.length <= 1
                            ? 'opacity-20 cursor-not-allowed bg-[var(--grafito)]'
                            : 'text-rose-400 bg-[var(--grafito)] hover:bg-rose-900/30 hover:border-rose-700'
                        }`}
                        aria-label={`Quitar ${meta.label}`} title="Quitar criterio"
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
                Añadir otro criterio
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
              className="px-5 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800               disabled:bg-[var(--grafito)] rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              {isSavingTiebreakers ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Guardando…</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Guardar reglas de desempate</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Referees & permissions */}
      {activeTab === 'permissions' && (
        <div className="bg-[var(--chasis)] rounded-xl border border-[var(--costura)] p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-[var(--hueso)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--acero)]" />
              Árbitros & Permisos
            </h3>
            <p className="text-xs text-[var(--acero)] mt-1">
              Define el equipo autorizado para este torneo. La asignación concreta por etapa, grupo o mesa se gestiona desde el módulo de arbitraje.
            </p>
          </div>

          <div className="p-4 bg-[var(--grafito)] rounded-xl border border-[var(--costura)] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-[var(--hueso)]">Árbitros autorizados</h4>
                <p className="text-[11px] text-[var(--acero)]">
                  Solo los árbitros autorizados deben recibir asignaciones en las etapas del torneo.
                </p>
              </div>
              <span className="text-[10px] font-mono text-[var(--acero)]">
                {activeTournament?.assignedReferees.length || 0} seleccionados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {users
                .filter((user) => user.role === 'referee' || user.role === 'organizer')
                .map((user) => {
                  const isAssigned = activeTournament?.assignedReferees.includes(user.id) || false;
                  return (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAssigned
                          ? 'border-[var(--cobalto)] bg-[var(--cobalto)]/10'
                          : 'border-[var(--costura)] bg-[var(--grafito)] hover:border-[var(--acero)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={() => {
                          if (!activeTournament) return;
                          const assignedReferees = isAssigned
                            ? activeTournament.assignedReferees.filter((id) => id !== user.id)
                            : [...activeTournament.assignedReferees, user.id];
                          updateTournament(activeTournament.id, { assignedReferees });
                        }}
                        className="accent-[var(--cobalto)]"
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-[var(--hueso)] truncate">{user.displayName}</span>
                        <span className="block text-[10px] text-[var(--acero)]">
                          {user.role === 'referee' ? 'Árbitro' : 'Organizador'}
                        </span>
                      </span>
                    </label>
                  );
                })}
            </div>

            {users.filter((user) => user.role === 'referee' || user.role === 'organizer').length === 0 && (
              <p className="text-xs text-[var(--acero)] p-3 border border-dashed border-[var(--costura)] rounded-lg">
                No hay árbitros u organizadores disponibles. Crea o invita usuarios desde el panel de administración.
              </p>
            )}
          </div>

          <div className="p-4 bg-[var(--grafito)] rounded-xl border border-[var(--costura)] space-y-2">
            <h4 className="text-xs font-bold text-[var(--hueso)]">Alcance de permisos</h4>
            <ul className="text-[11px] text-[var(--acero)] space-y-1 list-disc pl-4">
              <li>El organizador y los administradores pueden modificar la configuración del torneo.</li>
              <li>Los árbitros autorizados pueden registrar batallas, penalizaciones y ajustes manuales de sets.</li>
              <li>La asignación por etapa, grupo y mesa se conserva de forma independiente.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
