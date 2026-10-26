import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import {
  persistRefereeAssignments,
  generateSupabaseSQL,
  fetchRefereeAssignments,
  SupabaseSyncResult,
} from '../../lib/supabase/refereeAssignments';

export const RefereeAssignmentView: React.FC = () => {
  const {
    tournaments,
    activeTournamentId,
    setActiveTournamentId,
    activeTournament,
    stages,
    groups,
    matches,
    users,
    assignRefereeToGroup,
    assignRefereeToStage,
    unassignRefereeFromAll,
    autoBalanceRefereesAcrossGroups,
    currentUser,
  } = useTournament();

  // Selected tournament and stage
  const currentTourney = activeTournament || tournaments[0];
  const tourneyStages = stages
    .filter((s) => s.tournamentId === (currentTourney?.id || activeTournamentId))
    .sort((a, b) => a.position - b.position);

  const [selectedStageId, setSelectedStageId] = useState<string>(
    tourneyStages[0]?.id || ''
  );

  useEffect(() => {
    if (tourneyStages.length > 0 && !tourneyStages.some((s) => s.id === selectedStageId)) {
      setSelectedStageId(tourneyStages[0].id);
    }
  }, [currentTourney?.id, tourneyStages, selectedStageId]);

  const activeStage = tourneyStages.find((s) => s.id === selectedStageId) || tourneyStages[0];
  const stageGroups = groups.filter((g) => g.stageId === activeStage?.id);

  // Referee Pool: Filter users with referee or organizer role
  const referees = users.filter((u) => u.role === 'referee' || u.role === 'organizer');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'assigned'>('all');

  // Drag & drop state
  const [draggedRefId, setDraggedRefId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Supabase persistence feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SupabaseSyncResult | null>(null);
  const [showSqlViewer, setShowSqlViewer] = useState(false);
  const [quickAssignModal, setQuickAssignModal] = useState<{
    targetType: 'group' | 'stage';
    targetId: string;
    targetName: string;
  } | null>(null);

  // Load existing persisted state on mount or tournament switch
  useEffect(() => {
    if (!currentTourney) return;
    fetchRefereeAssignments(currentTourney.id).then((saved) => {
      if (saved) {
        setSyncStatus({
          success: true,
          persistedIn: 'backend',
          timestamp: saved.updatedAt,
          message: 'Asignaciones cargadas desde la base de datos.',
          recordsUpdated: Object.keys(saved.groupAssignments).length,
        });
      }
    });
  }, [currentTourney?.id]);

  // Compute referee assignment counts across the current tournament
  const getRefereeWorkload = (refId: string) => {
    const stageIds = tourneyStages.map((s) => s.id);
    const assignedGroups = groups.filter(
      (g) => stageIds.includes(g.stageId) && g.refereeId === refId
    );
    const assignedMatches = matches.filter(
      (m) => m.tournamentId === currentTourney?.id && m.refereeId === refId
    );
    return {
      groupCount: assignedGroups.length,
      matchCount: assignedMatches.length,
    };
  };

  // Filtered referees list
  const filteredReferees = referees.filter((ref) => {
    const matchesSearch =
      ref.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ref.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const workload = getRefereeWorkload(ref.id);
    if (filterMode === 'available') return workload.groupCount === 0;
    if (filterMode === 'assigned') return workload.groupCount > 0;
    return true;
  });

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, refId: string) => {
    e.dataTransfer.setData('text/plain', refId);
    e.dataTransfer.effectAllowed = 'copyMove';
    setDraggedRefId(refId);
  };

  const handleDragEnd = () => {
    setDraggedRefId(null);
    setDragOverTarget(null);
  };

  // Handle Drop on Group
  const handleDropOnGroup = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    const refId = e.dataTransfer.getData('text/plain') || draggedRefId;
    if (refId) {
      assignRefereeToGroup(groupId, refId);
      triggerAutoSync();
    }
    setDragOverTarget(null);
    setDraggedRefId(null);
  };

  // Handle Drop on Stage / Phase
  const handleDropOnStage = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const refId = e.dataTransfer.getData('text/plain') || draggedRefId;
    if (refId) {
      assignRefereeToStage(stageId, refId);
      triggerAutoSync();
    }
    setDragOverTarget(null);
    setDraggedRefId(null);
  };

  // Trigger Supabase persistence
  const triggerAutoSync = async () => {
    if (!currentTourney) return;
    setIsSyncing(true);

    const groupMap: Record<string, string | null> = {};
    stageGroups.forEach((g) => {
      groupMap[g.id] = g.refereeId || null;
    });

    const stageMap: Record<string, string | null> = {};
    if (activeStage) {
      stageMap[activeStage.id] = null;
    }

    try {
      const result = await persistRefereeAssignments(
        currentTourney.id,
        stageMap,
        groupMap,
        currentUser.id
      );
      setSyncStatus(result);
    } catch (err: any) {
      setSyncStatus({
        success: false,
        persistedIn: 'local',
        timestamp: new Date().toISOString(),
        message: 'Error al sincronizar con Supabase: ' + (err?.message || 'Error desconocido'),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto balance referees across groups with direct save
  const handleAutoBalance = () => {
    if (!activeStage) return;
    autoBalanceRefereesAcrossGroups(activeStage.id);
    setTimeout(() => {
      triggerAutoSync();
    }, 100);
  };

  // Unassign all from active stage
  const handleClearStageAssignments = () => {
    if (!confirm('¿Desasignar los árbitros de todos los grupos de esta fase?')) return;
    stageGroups.forEach((g) => {
      assignRefereeToGroup(g.id, null);
    });
    triggerAutoSync();
  };

  // Current generated SQL statements for Supabase inspection
  const generatedSql = currentTourney
    ? generateSupabaseSQL(
        currentTourney.id,
        activeStage ? { [activeStage.id]: null } : {},
        stageGroups.reduce((acc, g) => ({ ...acc, [g.id]: g.refereeId || null }), {})
      )
    : [];

  return (
    <div
      className="space-y-6 text-[var(--hueso)] font-['Atkinson_Hyperlegible_Next',sans-serif]"
      style={{
        backgroundColor: 'var(--grafito, #1b1d21)',
        minHeight: '100%',
        padding: '1.5rem',
        borderRadius: 'var(--r-card, 10px)',
        border: '1px solid var(--costura, #363b43)',
      }}
    >
      {/* Header bar styled with Acero design tokens */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[var(--costura,#363b43)]">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="p-2 rounded-[var(--r-control,4px)] text-[var(--cobalto,#5c80f5)]"
              style={{ backgroundColor: 'var(--chasis, #25282e)', border: '1px solid var(--costura,#363b43)' }}
            >
              <AceroIcon id="i-arbitro" size="lg" />
            </span>
            <div>
              <h2 className="t-title text-[var(--hueso,#ece8e0)] font-bold tracking-tight">
                Asignación de Árbitros
              </h2>
              <p className="t-label text-[var(--acero,#a3abb5)] text-xs mt-0.5">
                Arrastra y suelta árbitros hacia grupos o fases del torneo. Persistencia automática en Supabase PostgreSQL.
              </p>
            </div>
          </div>
        </div>

        {/* Tournament & Stage Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tournament selection */}
          <div className="flex items-center gap-1.5 bg-[var(--chasis,#25282e)] border border-[var(--costura,#363b43)] px-3 py-1.5 rounded-[var(--r-control,4px)]">
            <AceroIcon id="i-trofeo" size="sm" className="text-[var(--acero,#a3abb5)]" />
            <select
              value={currentTourney?.id || ''}
              onChange={(e) => setActiveTournamentId(e.target.value)}
              className="bg-transparent text-xs font-bold text-[var(--hueso,#ece8e0)] focus:outline-none cursor-pointer"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#25282e] text-[#ece8e0]">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Direct Supabase Manual Sync Button */}
          <button
            onClick={triggerAutoSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-[var(--r-control,4px)] border border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs antialiased"
            title="Guardar asignaciones en Supabase"
          >
            <AceroIcon id="i-ok" size="sm" className={isSyncing ? 'animate-spin' : 'text-emerald-400'} />
            <span>{isSyncing ? 'Sincronizando...' : 'Guardar en Supabase'}</span>
          </button>

          {/* Toggle SQL inspector */}
          <button
            onClick={() => setShowSqlViewer(!showSqlViewer)}
            className="px-3 py-1.5 rounded-[var(--r-control,4px)] border border-[var(--costura,#363b43)] bg-[var(--chasis,#25282e)] text-[var(--hueso,#ece8e0)] hover:border-[var(--acero,#a3abb5)] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs antialiased"
            title="Ver sentencias SQL generadas para Supabase"
          >
            <AceroIcon id="i-ajustes" size="sm" className="text-[var(--acero,#a3abb5)]" />
            <span>Ver SQL Supabase</span>
          </button>
        </div>
      </div>

      {/* Persistence Status Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-[var(--chasis,#25282e)] rounded-[var(--r-control,4px)] border border-[var(--costura,#363b43)] text-xs">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: syncStatus?.success ? 'var(--en-vivo, #7bc96f)' : 'var(--tarjeta-amarilla, #f2c230)',
              boxShadow: syncStatus?.success ? '0 0 8px #7bc96f' : 'none',
            }}
          />
          <div>
            <span className="font-bold text-[var(--hueso,#ece8e0)]">
              {syncStatus?.persistedIn === 'supabase'
                ? 'Conectado a Supabase (Producción Postgres RLS)'
                : syncStatus?.persistedIn === 'backend'
                ? 'Sincronizado con Backend & Esquema Supabase'
                : 'Sincronización Lista para Supabase'}
            </span>
            <span className="text-[var(--acero,#a3abb5)] ml-2">
              {syncStatus?.message || 'Los cambios se persistirán en la base de datos de Supabase.'}
            </span>
          </div>
        </div>

        {syncStatus?.timestamp && (
          <div className="text-[11px] font-mono text-[var(--acero,#a3abb5)]">
            Último guardado: {new Date(syncStatus.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        )}
      </div>

      {/* SQL Payload Modal / Inspector */}
      {showSqlViewer && (
        <div className="p-4 bg-[#141518] rounded-[var(--r-control,4px)] border border-[var(--costura,#363b43)] space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AceroIcon id="i-posiciones" size="sm" className="text-[var(--cobalto,#5c80f5)]" />
              <span className="font-bold text-xs text-[var(--hueso,#ece8e0)] uppercase tracking-wider">
                Sentencias SQL Generadas para Supabase (Tabla groups & matches)
              </span>
            </div>
            <button
              onClick={() => setShowSqlViewer(false)}
              className="text-[var(--acero,#a3abb5)] hover:text-white text-xs px-2 py-0.5"
            >
              ✕ Cerrar
            </button>
          </div>
          <div className="bg-[#0b0c0e] p-3 rounded font-mono text-[11px] text-emerald-400 max-h-48 overflow-y-auto space-y-1">
            {generatedSql.map((sql, idx) => (
              <pre key={idx} className="whitespace-pre-wrap">{sql}</pre>
            ))}
          </div>
        </div>
      )}

      {/* Stage Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-[var(--acero,#a3abb5)] shrink-0 flex items-center gap-1">
          <AceroIcon id="i-llave" size="sm" />
          Fase a Gestionar:
        </span>
        {tourneyStages.map((stage) => {
          const isSelected = stage.id === selectedStageId;
          const stageIcon =
            stage.type === 'group_stage'
              ? 'i-grupos'
              : stage.type === 'swiss'
              ? 'i-suizo'
              : stage.type === 'double_elimination'
              ? 'i-doble'
              : 'i-llave';

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStageId(stage.id)}
              className={`px-3 py-1.5 rounded-[var(--r-control,4px)] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-[var(--hueso,#ece8e0)] text-[var(--tinta,#101114)] shadow-sm'
                  : 'bg-[var(--chasis,#25282e)] text-[var(--acero,#a3abb5)] hover:text-[var(--hueso,#ece8e0)] border border-[var(--costura,#363b43)]'
              }`}
            >
              <AceroIcon id={stageIcon as any} size="sm" />
              <span>{stage.name}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({stage.type === 'group_stage' ? `${groups.filter(g => g.stageId === stage.id).length} grupos` : 'Playoffs'})
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Left Referee Pool + Right Drop Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Referee Pool (Banco de Árbitros) */}
        <div className="lg:col-span-4 bg-[var(--chasis,#25282e)] border border-[var(--costura,#363b43)] rounded-[var(--r-card,10px)] p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--costura,#363b43)]">
            <div className="flex items-center gap-2">
              <AceroIcon id="i-arbitro" size="md" className="text-[var(--cobalto,#5c80f5)]" />
              <h3 className="font-bold text-sm text-[var(--hueso,#ece8e0)]">
                Banco de Árbitros
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--acero,#a3abb5)] bg-[#1b1d21] px-2 py-0.5 rounded">
              {referees.length} Oficiales
            </span>
          </div>

          <p className="text-[11px] text-[var(--acero,#a3abb5)] leading-relaxed">
            Mantén presionado y arrastra una tarjeta de árbitro hacia cualquier grupo o hacia la fase para asignarlo.
          </p>

          {/* Search bar */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Buscar árbitro por nombre o correo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-[#1b1d21] text-[var(--hueso,#ece8e0)] border border-[var(--costura,#363b43)] rounded-[var(--r-control,4px)] focus:border-[var(--hueso,#ece8e0)] focus:outline-none"
            />

            {/* Filter mode chips */}
            <div className="flex gap-1.5 text-[11px]">
              {(['all', 'available', 'assigned'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-2.5 py-1 rounded-[var(--r-chip,3px)] font-semibold transition-colors ${
                    filterMode === mode
                      ? 'bg-[var(--cobalto,#5c80f5)] text-[var(--tinta,#101114)]'
                      : 'bg-[#1b1d21] text-[var(--acero,#a3abb5)] hover:text-white border border-[var(--costura,#363b43)]'
                  }`}
                >
                  {mode === 'all' ? 'Todos' : mode === 'available' ? 'Disponibles' : 'Asignados'}
                </button>
              ))}
            </div>
          </div>

          {/* Referees Draggable Cards */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredReferees.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--acero,#a3abb5)] bg-[#1b1d21] rounded border border-[var(--costura,#363b43)]">
                No hay árbitros que coincidan con la búsqueda.
              </div>
            ) : (
              filteredReferees.map((ref) => {
                const workload = getRefereeWorkload(ref.id);
                const isDragging = draggedRefId === ref.id;

                return (
                  <div
                    key={ref.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, ref.id)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-[var(--r-card,10px)] border transition-all cursor-grab active:cursor-grabbing select-none ${
                      isDragging
                        ? 'opacity-40 border-dashed border-[var(--cobalto,#5c80f5)] bg-[#1b1d21]'
                        : 'bg-[#1b1d21] hover:bg-[#202329] border-[var(--costura,#363b43)] hover:border-[var(--acero,#a3abb5)] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            backgroundColor: 'var(--costura, #363b43)',
                            color: 'var(--hueso, #ece8e0)',
                            border: '1px solid var(--acero, #a3abb5)',
                          }}
                        >
                          {ref.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--hueso,#ece8e0)] truncate flex items-center gap-1.5">
                            <span>{ref.displayName}</span>
                            <span className="text-[10px] font-mono text-[var(--acero,#a3abb5)] uppercase font-semibold">
                              {ref.role === 'organizer' ? '🏆 Org' : '⚖️ Árbitro'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--acero,#a3abb5)] truncate font-mono">
                            {ref.email}
                          </div>
                        </div>
                      </div>

                      {/* Drag Grip Icon */}
                      <div className="text-[var(--acero,#a3abb5)] opacity-60 hover:opacity-100 shrink-0 text-sm">
                        ⋮⋮
                      </div>
                    </div>

                    {/* Status & Workload Badge */}
                    <div className="mt-2.5 pt-2 border-t border-[var(--costura,#363b43)] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              workload.groupCount > 0 ? 'var(--cobalto, #5c80f5)' : 'var(--en-vivo, #7bc96f)',
                          }}
                        />
                        <span className="text-[var(--acero,#a3abb5)]">
                          {workload.groupCount > 0
                            ? `${workload.groupCount} ${workload.groupCount === 1 ? 'grupo' : 'grupos'}`
                            : 'Disponible'}
                        </span>
                      </div>

                      {workload.groupCount > 0 && (
                        <button
                          onClick={() => {
                            if (currentTourney) {
                              unassignRefereeFromAll(currentTourney.id, ref.id);
                              triggerAutoSync();
                            }
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                          title="Desasignar de todos los grupos"
                        >
                          Liberar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Drop Zones (Fases y Grupos) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Stage Drop Target (Asignar a toda la fase / etapa) */}
          {activeStage && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTarget(`stage_${activeStage.id}`);
              }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={(e) => handleDropOnStage(e, activeStage.id)}
              className={`p-4 rounded-[var(--r-card,10px)] border transition-all ${
                dragOverTarget === `stage_${activeStage.id}`
                  ? 'bg-[#1e2330] border-2 border-[var(--cobalto,#5c80f5)] shadow-md'
                  : 'bg-[var(--chasis,#25282e)] border-[var(--costura,#363b43)]'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#1b1d21] rounded-[var(--r-control,4px)] border border-[var(--costura,#363b43)] text-[var(--cobalto,#5c80f5)]">
                    <AceroIcon id="i-trofeo" size="lg" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--cobalto,#5c80f5)] text-[var(--tinta,#101114)]">
                        Asignación Global de Fase
                      </span>
                      <span className="text-xs font-mono text-[var(--acero,#a3abb5)]">
                        {activeStage.name}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--acero,#a3abb5)] mt-1">
                      {dragOverTarget === `stage_${activeStage.id}` ? (
                        <span className="text-[var(--cobalto,#5c80f5)] font-bold">
                          ¡Suelta aquí para asignar como Árbitro Principal de toda la fase!
                        </span>
                      ) : (
                        'Arrastra un árbitro aquí para asignarlo a todas las partidas de esta fase.'
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {stageGroups.length > 0 && (
                    <button
                      onClick={handleAutoBalance}
                      className="acero-btn acero-btn--primary text-xs flex items-center gap-1.5"
                      title="Asigna automáticamente árbitros disponibles de forma balanceada"
                    >
                      <AceroIcon id="i-todos" size="sm" />
                      <span>Distribuir Equitativamente</span>
                    </button>
                  )}
                  {stageGroups.some((g) => g.refereeId) && (
                    <button
                      onClick={handleClearStageAssignments}
                      className="px-2.5 py-1.5 text-xs text-[var(--acero,#a3abb5)] hover:text-red-400 bg-[#1b1d21] border border-[var(--costura,#363b43)] rounded-[var(--r-control,4px)] font-bold"
                      title="Quitar todos los árbitros de esta fase"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Groups Grid / Drop Targets */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AceroIcon id="i-grupos" size="md" className="text-[var(--cobre,#ee8433)]" />
                <h3 className="font-bold text-sm text-[var(--hueso,#ece8e0)]">
                  Grupos de la Fase ({stageGroups.length})
                </h3>
              </div>
              <span className="text-xs text-[var(--acero,#a3abb5)]">
                {stageGroups.filter((g) => g.refereeId).length} de {stageGroups.length} grupos asignados
              </span>
            </div>

            {stageGroups.length === 0 ? (
              <div className="p-8 text-center bg-[var(--chasis,#25282e)] rounded-[var(--r-card,10px)] border border-[var(--costura,#363b43)] space-y-2">
                <AceroIcon id="i-alerta" size="lg" className="mx-auto text-[var(--tarjeta-amarilla,#f2c230)]" />
                <div className="text-sm font-bold text-[var(--hueso,#ece8e0)]">
                  Esta fase no tiene grupos configurados.
                </div>
                <p className="text-xs text-[var(--acero,#a3abb5)] max-w-md mx-auto">
                  Es una etapa de eliminación directa o suiza continua. Puedes arrastrar árbitros a la caja superior de "Asignación Global de Fase" para cubrir todas sus partidas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stageGroups.map((group) => {
                  const assignedReferee = users.find((u) => u.id === group.refereeId);
                  const isHovered = dragOverTarget === `group_${group.id}`;
                  const groupMatches = matches.filter((m) => m.groupId === group.id);

                  return (
                    <div
                      key={group.id}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverTarget(`group_${group.id}`);
                      }}
                      onDragLeave={() => setDragOverTarget(null)}
                      onDrop={(e) => handleDropOnGroup(e, group.id)}
                      className={`p-4 rounded-[var(--r-card,10px)] border transition-all flex flex-col justify-between ${
                        isHovered
                          ? 'bg-[#1e2330] border-2 border-[var(--cobalto,#5c80f5)] shadow-md scale-[1.01]'
                          : assignedReferee
                          ? 'bg-[var(--chasis,#25282e)] border-[var(--costura,#363b43)]'
                          : 'bg-[#1a1c20] border-dashed border-[var(--costura,#363b43)] hover:border-[var(--acero,#a3abb5)]'
                      }`}
                    >
                      {/* Group Header */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-[var(--costura,#363b43)]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--hueso,#ece8e0)]">
                              {group.name}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1b1d21] text-[var(--acero,#a3abb5)] border border-[var(--costura,#363b43)]">
                              {group.participantIds.length} Bladers
                            </span>
                          </div>

                          <span className="text-[11px] font-mono text-[var(--acero,#a3abb5)]">
                            {groupMatches.length} Partidas
                          </span>
                        </div>

                        {/* Assigned Referee Display or Drop Prompt */}
                        {assignedReferee ? (
                          <div className="p-3 bg-[#1b1d21] rounded-[var(--r-control,4px)] border border-[var(--costura,#363b43)] flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                                style={{
                                  backgroundColor: 'var(--cobalto, #5c80f5)',
                                  color: 'var(--tinta, #101114)',
                                }}
                              >
                                {assignedReferee.displayName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-[var(--hueso,#ece8e0)] truncate">
                                  {assignedReferee.displayName}
                                </div>
                                <div className="text-[10px] text-[var(--acero,#a3abb5)] font-mono truncate">
                                  Árbitro Oficial Asignado
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                assignRefereeToGroup(group.id, null);
                                triggerAutoSync();
                              }}
                              className="text-[var(--acero,#a3abb5)] hover:text-red-400 p-1.5 rounded transition-colors"
                              title="Remover árbitro de este grupo"
                            >
                              <AceroIcon id="i-cerrar" size="sm" />
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`p-4 rounded-[var(--r-control,4px)] border text-center transition-colors ${
                              isHovered
                                ? 'border-[var(--cobalto,#5c80f5)] bg-[#232938] text-[var(--cobalto,#5c80f5)] font-bold text-xs'
                                : 'border-dashed border-[var(--costura,#363b43)] text-[var(--acero,#a3abb5)] text-xs'
                            }`}
                          >
                            {isHovered ? (
                              '¡Suelta aquí para asignar árbitro!'
                            ) : (
                              <div className="space-y-1">
                                <div className="font-semibold">Sin Árbitro Asignado</div>
                                <div className="text-[10px] opacity-75">
                                  Arrastra un árbitro aquí o usa el botón inferior
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Manual Assignment Quick Button (Accessibility / Touch) */}
                      <div className="mt-3 pt-2 border-t border-[var(--costura,#363b43)] flex items-center justify-between text-xs">
                        <span className="text-[10px] text-[var(--acero,#a3abb5)] font-mono">
                          {assignedReferee ? '✓ Asignado' : 'Pendiente'}
                        </span>

                        <div className="relative">
                          <select
                            value={group.refereeId || ''}
                            onChange={(e) => {
                              const refId = e.target.value || null;
                              assignRefereeToGroup(group.id, refId);
                              triggerAutoSync();
                            }}
                            className="text-[11px] font-semibold bg-[#1b1d21] text-[var(--hueso,#ece8e0)] border border-[var(--costura,#363b43)] rounded px-2 py-1 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Seleccionar Árbitro --</option>
                            {referees.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.displayName} ({r.role === 'organizer' ? 'Organizador' : 'Árbitro'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
