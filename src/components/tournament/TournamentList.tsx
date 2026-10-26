import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { StageType, TournamentStatus } from '../../types/tournament';
import { AceroIcon } from '../common/AceroIcon';
import {
  Trophy,
  Plus,
  Calendar,
  MapPin,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Copy,
  Trash2,
  Settings,
  Scale,
  X,
} from 'lucide-react';

interface TournamentListProps {
  onSelectTournament: (tournamentId: string, targetTab?: 'bracket' | 'referee' | 'wizard' | 'participants') => void;
}

export const TournamentList: React.FC<TournamentListProps> = ({ onSelectTournament }) => {
  const {
    tournaments,
    activeTournamentId,
    setActiveTournamentId,
    createTournament,
    duplicateTournament,
    deleteTournament,
    participants,
    stages,
    currentRole,
    openAuthModal,
  } = useTournament();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Tournament form state
  const [newName, setNewName] = useState('');
  const [newFormat, setNewFormat] = useState<StageType>('group_stage');
  const [newVenue, setNewVenue] = useState('Arena Beyblade');
  const [newCountry, setNewCountry] = useState('PA');
  const [newMaxParticipants, setNewMaxParticipants] = useState<number>(16);
  const [newEntryFee, setNewEntryFee] = useState<number>(0);
  const [newPointsGroup, setNewPointsGroup] = useState<number>(4);
  const [newPointsPlayoffs, setNewPointsPlayoffs] = useState<number>(5);
  const [newPointsFinal, setNewPointsFinal] = useState<number>(7);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const canManage = currentRole === 'organizer' || currentRole === 'admin';

  // Handle template selection to pre-fill parameters
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = tournaments.find((t) => t.id === templateId);
    if (template) {
      setNewVenue(template.venueName || 'Arena Beyblade');
      setNewCountry(template.country || 'PA');
      setNewMaxParticipants(template.maxParticipants || 16);
      setNewEntryFee(template.entryFee || 0);
      setNewPointsGroup(template.pointsToWinGroup || 4);
      setNewPointsPlayoffs(template.pointsToWinPlayoffs || 5);
      setNewPointsFinal(template.pointsToWinFinal || 7);
      const templateStage = stages.find((s) => s.tournamentId === template.id);
      if (templateStage) {
        setNewFormat(templateStage.type);
      }
    }
  };

  // Filter tournaments
  const filteredTournaments = tournaments.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.venueName && t.venueName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent, targetView: 'participants' | 'bracket' = 'participants') => {
    e.preventDefault();
    if (!newName.trim()) return;

    const templateSource = selectedTemplateId ? tournaments.find(t => t.id === selectedTemplateId) : undefined;
    const templateStage = selectedTemplateId ? stages.find(s => s.tournamentId === selectedTemplateId) : undefined;

    const stageConfig = templateStage?.config || {
      advanceCount: 2,
      groupSize: 4,
      tiebreakers: ['points', 'point_diff', 'head_to_head', 'points_for', 'seed'] as any,
    };

    const created = createTournament(
      {
        name: newName.trim(),
        venueName: newVenue.trim(),
        country: newCountry.trim().toUpperCase(),
        maxParticipants: newMaxParticipants,
        entryFee: newEntryFee,
        pointsToWinGroup: newPointsGroup,
        pointsToWinPlayoffs: newPointsPlayoffs,
        pointsToWinFinal: newPointsFinal,
        foulPoints: templateSource?.foulPoints ?? 1,
        foulsPerPoint: templateSource?.foulsPerPoint ?? 3,
        finishPoints: templateSource?.finishPoints,
      },
      newFormat,
      stageConfig
    );

    setShowCreateModal(false);
    setNewName('');
    setSelectedTemplateId('');
    setSuccessMsg(`¡Torneo "${created.name}" creado con éxito! Redirigiendo a Bladers & Siembra...`);
    setTimeout(() => setSuccessMsg(null), 3500);

    // Direct user to 'participants' so they can add bladers before starting!
    onSelectTournament(created.id, targetView);
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const dup = duplicateTournament(id);
    setSuccessMsg(`Torneo duplicado: "${dup.name}"`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`¿Estás seguro de que deseas eliminar el torneo "${name}"?`)) {
      deleteTournament(id);
      setSuccessMsg(`Torneo eliminado.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const getFormatLabel = (type?: StageType): string => {
    switch (type) {
      case 'group_stage':
        return 'Grupos + Playoffs';
      case 'single_elimination':
        return 'Eliminación Directa';
      case 'double_elimination':
        return 'Doble Eliminación';
      case 'round_robin':
        return 'Todos contra Todos';
      case 'swiss':
        return 'Sistema Suizo';
      default:
        return 'Grupos + Playoffs';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--hueso)] tracking-tight font-display flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" />
              Torneos Oficiales Beyblade X
            </h1>
          </div>
          <p className="text-xs text-[var(--acero)] mt-1">
            Crea, organiza y consulta todos los torneos registrados en la plataforma.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {canManage ? (
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full md:w-auto px-4 py-2 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] hover:bg-white text-[var(--tinta)] transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Torneo</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="w-full md:w-auto px-4 py-2 text-xs font-semibold rounded-[var(--r-control)] border border-[var(--costura)] hover:border-[var(--acero)] text-[var(--hueso)] transition-colors flex items-center justify-center gap-2"
            >
              <span>Acceso Organizador para Crear Torneo</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-600 rounded-[var(--r-control)] text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--chasis)] p-3 rounded-[var(--r-card)] border border-[var(--costura)]">
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 text-[var(--acero)] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nombre, sede o ciudad..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] pl-9 pr-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] placeholder-[var(--costura)] focus:outline-hidden focus:border-[var(--acero)]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-chip)] transition-colors whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-[var(--hueso)] text-[var(--tinta)] font-bold'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] bg-[var(--grafito)]'
            }`}
          >
            Todos ({tournaments.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-chip)] transition-colors whitespace-nowrap ${
              statusFilter === 'in_progress'
                ? 'bg-emerald-500 text-black font-bold'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] bg-[var(--grafito)]'
            }`}
          >
            En Vivo
          </button>
          <button
            onClick={() => setStatusFilter('draft')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-chip)] transition-colors whitespace-nowrap ${
              statusFilter === 'draft'
                ? 'bg-amber-500 text-black font-bold'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] bg-[var(--grafito)]'
            }`}
          >
            Borradores / Registro
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-[var(--r-chip)] transition-colors whitespace-nowrap ${
              statusFilter === 'completed'
                ? 'bg-neutral-700 text-white font-bold'
                : 'text-[var(--acero)] hover:text-[var(--hueso)] bg-[var(--grafito)]'
            }`}
          >
            Finalizados
          </button>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTournaments.map((tourney) => {
          const tParticipants = participants.filter((p) => p.tournamentId === tourney.id);
          const tStages = stages.filter((s) => s.tournamentId === tourney.id);
          const primaryStage = tStages[0];
          const isActive = tourney.id === activeTournamentId;

          return (
            <div
              key={tourney.id}
              onClick={() => onSelectTournament(tourney.id, 'bracket')}
              className={`p-5 rounded-[var(--r-card)] border transition-all cursor-pointer flex flex-col justify-between group ${
                isActive
                  ? 'bg-[var(--chasis)] border-[var(--cobalto)] shadow-md ring-1 ring-[var(--cobalto)]'
                  : 'bg-[var(--chasis)] border-[var(--costura)] hover:border-[var(--acero)] hover:shadow-sm'
              }`}
            >
              <div>
                {/* Header row: Status + Active Pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {tourney.status === 'in_progress' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        EN VIVO
                      </span>
                    ) : tourney.status === 'completed' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                        FINALIZADO
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-300">
                        REGISTRO
                      </span>
                    )}

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--grafito)] border border-[var(--costura)] text-[var(--acero)]">
                      {getFormatLabel(primaryStage?.type)}
                    </span>
                  </div>

                  {isActive && (
                    <span className="text-[10px] font-bold text-[var(--cobalto)] uppercase tracking-wider">
                      ★ Activo
                    </span>
                  )}
                </div>

                {/* Tournament Title */}
                <h3 className="text-base font-bold text-[var(--hueso)] group-hover:text-white transition-colors font-display line-clamp-2">
                  {tourney.name}
                </h3>

                {/* Meta: Venue & Date */}
                <div className="mt-3 space-y-1.5 text-xs text-[var(--acero)]">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--acero)] shrink-0" />
                    <span className="truncate">
                      {tourney.venueName || 'Arena Central'} ({tourney.country})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[var(--acero)] shrink-0" />
                    <span>
                      {tParticipants.length} de {tourney.maxParticipants || 16} bladers inscritos
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--tarjeta-amarilla)]">
                    <span>
                      Meta: {tourney.pointsToWinGroup || 4} pts · Final: {tourney.pointsToWinFinal || 7} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-5 pt-3 border-t border-[var(--costura)] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectTournament(tourney.id, 'bracket')}
                  className="text-xs font-bold text-[var(--cobalto)] hover:text-white flex items-center gap-1 transition-colors"
                >
                  <span>Ver Brackets</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTournament(tourney.id, 'referee');
                        }}
                        className="p-1.5 rounded text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)] transition-colors"
                        title="Abrir Panel de Árbitro"
                      >
                        <Scale className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTournament(tourney.id, 'wizard');
                        }}
                        className="p-1.5 rounded text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)] transition-colors"
                        title="Configurar y Diseñar Torneo"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDuplicate(tourney.id, e)}
                        className="p-1.5 rounded text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)] transition-colors"
                        title="Duplicar como plantilla"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      {tournaments.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(tourney.id, tourney.name, e)}
                          className="p-1.5 rounded text-[var(--acero)] hover:text-rose-400 hover:bg-[var(--grafito)] transition-colors"
                          title="Eliminar torneo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTournaments.length === 0 && (
        <div className="text-center py-12 bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] space-y-3">
          <Trophy className="w-10 h-10 mx-auto text-[var(--acero)] opacity-40" />
          <h3 className="text-sm font-bold text-[var(--hueso)]">No se encontraron torneos</h3>
          <p className="text-xs text-[var(--acero)]">
            Prueba ajustando los filtros de búsqueda o crea un nuevo torneo.
          </p>
        </div>
      )}

      {/* Modal: Crear Nuevo Torneo */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] shadow-2xl overflow-hidden flex flex-col text-[var(--hueso)] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-[var(--costura)] flex items-center justify-between bg-[var(--grafito)] sticky top-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--cobalto)]/20 border border-[var(--cobalto)]/40 flex items-center justify-center text-[var(--cobalto)] font-bold text-sm">
                  🏆
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[var(--hueso)] font-display">
                    Crear Nuevo Torneo de Beyblade X
                  </h2>
                  <p className="text-[11px] text-[var(--acero)]">
                    Configura el formato de llaves y parámetros de arbitraje
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => handleCreateSubmit(e, 'participants')} className="p-6 space-y-4">
              {/* Plantilla de Configuración */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--acero)] block">
                  Cargar desde Plantilla Existente (Opcional)
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)]"
                >
                  <option value="">-- Configuración Estándar Oficial WBO --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      Usar Plantilla: {t.name} ({t.venueName || 'Arena Central'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[var(--acero)]">
                  Copia automáticamente formato de etapas, metas de puntos y reglas de desempate de un torneo previo.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--acero)] block">
                  Nombre del Torneo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Torneo Apertura Beyblade X Panamá 2026"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden focus:border-[var(--acero)]"
                />
              </div>

              {/* Formato del Torneo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--acero)] block">
                  Formato de Competición *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFormat('group_stage')}
                    className={`p-3 rounded-[var(--r-control)] border text-left transition-all ${
                      newFormat === 'group_stage'
                        ? 'bg-[var(--cobalto)]/20 border-[var(--cobalto)] text-[var(--hueso)]'
                        : 'bg-[var(--grafito)] border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--hueso)]">Fase de Grupos + Playoffs</div>
                    <div className="text-[10px] text-[var(--acero)] mt-0.5">Estándar oficial WBO. Grupos en serpentina y llaves finales.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFormat('single_elimination')}
                    className={`p-3 rounded-[var(--r-control)] border text-left transition-all ${
                      newFormat === 'single_elimination'
                        ? 'bg-[var(--cobalto)]/20 border-[var(--cobalto)] text-[var(--hueso)]'
                        : 'bg-[var(--grafito)] border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--hueso)]">Eliminación Directa</div>
                    <div className="text-[10px] text-[var(--acero)] mt-0.5">Cuadro tradicional tipo bracket. Quien pierde queda eliminado.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFormat('double_elimination')}
                    className={`p-3 rounded-[var(--r-control)] border text-left transition-all ${
                      newFormat === 'double_elimination'
                        ? 'bg-[var(--cobalto)]/20 border-[var(--cobalto)] text-[var(--hueso)]'
                        : 'bg-[var(--grafito)] border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--hueso)]">Doble Eliminación</div>
                    <div className="text-[10px] text-[var(--acero)] mt-0.5">Cuadro de Ganadores y Perdedores con Gran Final.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFormat('swiss')}
                    className={`p-3 rounded-[var(--r-control)] border text-left transition-all ${
                      newFormat === 'swiss'
                        ? 'bg-[var(--cobalto)]/20 border-[var(--cobalto)] text-[var(--hueso)]'
                        : 'bg-[var(--grafito)] border-[var(--costura)] text-[var(--acero)] hover:text-[var(--hueso)]'
                    }`}
                  >
                    <div className="text-xs font-bold text-[var(--hueso)]">Sistema Suizo (Swiss)</div>
                    <div className="text-[10px] text-[var(--acero)] mt-0.5">Rondas contra rivales de igual puntaje. Sin eliminación temprana.</div>
                  </button>
                </div>
              </div>

              {/* Sede y País */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--acero)] block">
                    Sede / Local
                  </label>
                  <input
                    type="text"
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    placeholder="Ej. Albrook Mall Arena"
                    className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--acero)] block">
                    Cupo Máximo de Bladers
                  </label>
                  <select
                    value={newMaxParticipants}
                    onChange={(e) => setNewMaxParticipants(Number(e.target.value))}
                    className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden"
                  >
                    <option value={8}>8 Bladers</option>
                    <option value={16}>16 Bladers (Recomendado)</option>
                    <option value={32}>32 Bladers</option>
                    <option value={64}>64 Bladers</option>
                  </select>
                </div>
              </div>

              {/* Metas de Puntos */}
              <div className="p-3 bg-[var(--grafito)] rounded-[var(--r-control)] border border-[var(--costura)] space-y-2">
                <div className="text-xs font-bold text-[var(--hueso)]">
                  Puntos para Ganar el Match (WBO Ruleset):
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--acero)] block">Fase Regular / Grupos</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newPointsGroup}
                      onChange={(e) => setNewPointsGroup(Number(e.target.value))}
                      className="w-full text-center text-xs font-bold border border-[var(--costura)] rounded p-1.5 bg-[var(--chasis)] text-[var(--hueso)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--acero)] block">Playoffs</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={newPointsPlayoffs}
                      onChange={(e) => setNewPointsPlayoffs(Number(e.target.value))}
                      className="w-full text-center text-xs font-bold border border-[var(--costura)] rounded p-1.5 bg-[var(--chasis)] text-[var(--hueso)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--acero)] block">Gran Final</label>
                    <input
                      type="number"
                      min={1}
                      max={15}
                      value={newPointsFinal}
                      onChange={(e) => setNewPointsFinal(Number(e.target.value))}
                      className="w-full text-center text-xs font-bold border border-[var(--costura)] rounded p-1.5 bg-[var(--chasis)] text-[var(--hueso)]"
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[var(--costura)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--r-control)] border border-[var(--costura)] text-[var(--acero)] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => handleCreateSubmit(e, 'bracket')}
                  className="px-4 py-2 text-xs font-semibold rounded-[var(--r-control)] border border-[var(--costura)] hover:bg-[var(--grafito)] text-[var(--hueso)] transition-colors"
                >
                  Guardar como Borrador
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-[var(--r-control)] bg-[var(--hueso)] text-[var(--tinta)] hover:bg-white transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Torneo y Registrar Bladers →</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
