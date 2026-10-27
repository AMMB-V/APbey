import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { UserRole } from '../../types/tournament';
import { SupabaseModal } from './SupabaseModal';
import { RefereeAssignmentView } from './RefereeAssignmentView';
import {
  ShieldCheck,
  Mail,
  UserPlus,
  Trash2,
  Copy,
  Check,
  History,
  RotateCcw,
  KeyRound,
  Users,
  Database,
  UploadCloud,
  ExternalLink,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    users,
    invitations,
    auditLogs,
    createInvitation,
    revokeInvitation,
    changeUserRole,
    tournaments,
    resetAllData,
    supabaseSyncInfo,
    syncCurrentTournamentToSupabase,
  } = useTournament();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'organizer' | 'referee'>('referee');
  const [inviteTournamentId, setInviteTournamentId] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const inv = createInvitation(
        inviteEmail.trim(),
        inviteRole,
        inviteTournamentId || undefined
      );
      setInviteEmail('');
      setSuccessMsg(`Invitación creada para ${inv.email} con código ${inv.code}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo crear la invitación.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await syncCurrentTournamentToSupabase();
    setSuccessMsg(res.message);
    setIsSyncing(false);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const [adminTab, setAdminTab] = useState<'referees' | 'invitations'>('referees');

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-[var(--hueso)]">
      {/* Top Banner */}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--hueso)] tracking-tight flex items-center gap-2 font-display">
              <ShieldCheck className="w-5 h-5 text-[var(--cobalto)]" />
              Panel de Administración, Asignación & Supabase
            </h2>
          </div>
          <p className="text-xs text-[var(--acero)] mt-1">
            Gestión de oficiales, asignación de árbitros con arrastrar y soltar, sincronización en Supabase PostgreSQL y control de accesos RBAC.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowDbModal(true)}
            className="btn btn--secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Configurar Supabase
          </button>

          <button
            onClick={() => {
              if (confirm('¿Restablecer todos los datos a la configuración inicial de demostración?')) {
                resetAllData();
              }
            }}
            className="btn btn--secondary text-xs px-3 py-1.5 flex items-center gap-1.5 hover:text-rose-400"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restablecer Demo
          </button>
        </div>
      </div>

      {/* Supabase Status Bar */}
      <div className={`p-4 rounded-[var(--r-control)] border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        supabaseSyncInfo.isConnected
          ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
          : 'bg-amber-950/20 border-amber-800/50 text-amber-300'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${supabaseSyncInfo.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div>
            <div className="text-xs font-bold font-mono">
              Base de Datos: {supabaseSyncInfo.isConnected ? 'Supabase Conectado (https://inkxdmjxhzdssfzjjtaw.supabase.co)' : 'Modo Local (Sin conexión a Supabase)'}
            </div>
            <div className="text-[11px] text-[var(--acero)]">
              {supabaseSyncInfo.message} {supabaseSyncInfo.lastSync && `· Última sinc: ${supabaseSyncInfo.lastSync}`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {supabaseSyncInfo.isConnected ? (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn btn--primary text-xs py-1 px-3 flex items-center gap-1"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar a Supabase'}
            </button>
          ) : (
            <button
              onClick={() => setShowDbModal(true)}
              className="btn btn--primary text-xs py-1 px-3"
            >
              Conectar Supabase
            </button>
          )}
        </div>
      </div>

      {/* Subtabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-[var(--costura)] pb-2 overflow-x-auto">
        <button
          onClick={() => setAdminTab('referees')}
          className={`px-4 py-2 rounded-[var(--r-control)] text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'referees'
              ? 'bg-[var(--chasis)] text-[var(--hueso)] border border-[var(--costura)] shadow-sm'
              : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--chasis)]/50'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-[var(--cobalto)]" />
          <span>Asignación de Árbitros</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
            Drag & Drop
          </span>
        </button>

        <button
          onClick={() => setAdminTab('invitations')}
          className={`px-4 py-2 rounded-[var(--r-control)] text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            adminTab === 'invitations'
              ? 'bg-[var(--chasis)] text-[var(--hueso)] border border-[var(--costura)] shadow-sm'
              : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--chasis)]/50'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[var(--acero)]" />
          <span>Invitaciones & Roles (RBAC)</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
            {users.length} usuarios
          </span>
        </button>
      </div>

      {/* Tab 1: Asignación de Árbitros */}
      {adminTab === 'referees' && <RefereeAssignmentView />}

      {/* Tab 2: Invitaciones & Roles (RBAC) */}
      {adminTab === 'invitations' && (
        <div className="space-y-6">
          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-600 rounded-[var(--r-control)] text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div role="alert" className="p-3 bg-rose-950/40 border border-rose-700 rounded-[var(--r-control)] text-xs font-semibold text-rose-300 flex items-center gap-2">
              <span aria-hidden="true">!</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Grid: Invite Form + User List */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Invite Form */}
            <div className="lg:col-span-5 bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--costura)]">
                <UserPlus className="w-4 h-4 text-[var(--cobalto)]" />
                <h3 className="text-sm font-bold text-[var(--hueso)] font-display">
                  Invitar Nuevo Organizador o Árbitro
                </h3>
              </div>

          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">
                Correo Electrónico:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--acero)] absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="arbitro@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] pl-9 pr-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden focus:border-[var(--cobalto)] font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">
                Rol Autorizado:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole('referee')}
                  className={`p-2 rounded-[var(--r-control)] text-xs font-bold border transition-all text-center ${
                    inviteRole === 'referee'
                      ? 'bg-[var(--hueso)] text-[var(--tinta)] border-transparent font-bold shadow-xs'
                      : 'bg-[var(--grafito)] text-[var(--acero)] border-[var(--costura)] hover:text-[var(--hueso)]'
                  }`}
                >
                  ⚖️ Árbitro / Juez
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole('organizer')}
                  className={`p-2 rounded-[var(--r-control)] text-xs font-bold border transition-all text-center ${
                    inviteRole === 'organizer'
                      ? 'bg-[var(--hueso)] text-[var(--tinta)] border-transparent font-bold shadow-xs'
                      : 'bg-[var(--grafito)] text-[var(--acero)] border-[var(--costura)] hover:text-[var(--hueso)]'
                  }`}
                >
                  🏆 Organizador
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)]">
                Torneo Asignado (Opcional):
              </label>
              <select
                value={inviteTournamentId}
                onChange={(e) => setInviteTournamentId(e.target.value)}
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] p-2 bg-[var(--grafito)] text-[var(--hueso)] focus:outline-hidden"
              >
                <option value="">Acceso general (Sin torneo exclusivo)</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full mt-2 btn btn--primary text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Generar Invitación & Código
            </button>
          </form>

          {/* Pending Invitations List */}
          <div className="pt-4 border-t border-[var(--costura)] space-y-2">
            <div className="text-xs font-bold text-[var(--acero)] uppercase tracking-wider">
              Invitaciones Activas ({invitations.length})
            </div>

            {invitations.length === 0 ? (
              <div className="text-xs text-[var(--acero)] py-2">
                No hay invitaciones pendientes.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-2.5 bg-[var(--grafito)] rounded-[var(--r-control)] border border-[var(--costura)] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[var(--hueso)]">{inv.email}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-[var(--acero)] font-mono mt-0.5">
                        <span className="uppercase font-bold text-[var(--cobalto)]">
                          {inv.role === 'referee' ? 'Árbitro' : 'Organizador'}
                        </span>
                        <span>·</span>
                        <span className="bg-[var(--costura)] px-1 py-0.2 rounded font-bold text-[var(--hueso)]">
                          {inv.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(inv.code)}
                        className="p-1 rounded text-[var(--acero)] hover:text-[var(--hueso)]"
                        title="Copiar código de invitación"
                      >
                        {copiedCode === inv.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}?invite=${encodeURIComponent(inv.code)}`;
                          copyToClipboard(url);
                        }}
                        className="p-1 rounded text-[var(--acero)] hover:text-[var(--cobalto)]"
                        title="Copiar enlace directo de invitación"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => revokeInvitation(inv.id)}
                        className="p-1 rounded text-[var(--acero)] hover:text-rose-400"
                        title="Revocar invitación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: User Roles Management */}
        <div className="lg:col-span-7 bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--costura)]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[var(--cobalto)]" />
              <h3 className="text-sm font-bold text-[var(--hueso)] font-display">
                Usuarios Registrados & Permisos (RBAC)
              </h3>
            </div>
            <span className="text-xs text-[var(--acero)] font-mono">
              {users.length} Cuentas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-[var(--acero)] bg-[var(--grafito)] border-b border-[var(--costura)]">
                <tr>
                  <th className="py-2 px-3">Usuario</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Rol Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--costura)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--grafito)]">
                    <td className="py-2.5 px-3 font-semibold text-[var(--hueso)]">
                      {u.displayName}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--acero)] font-mono">
                      {u.email}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                        className="text-xs border border-[var(--costura)] rounded-[var(--r-control)] px-2 py-1 bg-[var(--grafito)] font-medium text-[var(--hueso)] focus:outline-hidden"
                      >
                        <option value="admin">Admin</option>
                        <option value="organizer">Organizador</option>
                        <option value="referee">Árbitro</option>
                        <option value="blader">Blader</option>
                        <option value="public">Público</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Audit Log / Bitácora Section */}
          <div className="pt-4 border-t border-[var(--costura)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--acero)] mb-2">
              <History className="w-4 h-4 text-[var(--cobalto)]" />
              Bitácora de Auditoría (Audit Log)
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[var(--costura)]">
              {auditLogs.map((log) => (
                <div key={log.id} className="pt-2 pb-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[var(--acero)] font-mono">
                    <span className="font-bold text-[var(--hueso)] uppercase">
                      {log.tableName} · {log.action}
                    </span>
                    <span>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[var(--acero)] mt-0.5">
                    {log.note || `Acción en registro ${log.recordId}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </div>
  );
};
