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
  X,
  Send,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const {
    currentUser,
    currentRole,
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
    importRankingWorkbook,
    rankings,
    hallOfFame,
  } = useTournament();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'organizer' | 'referee'>('referee');
  const [inviteTournamentId, setInviteTournamentId] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isImportingRankings, setIsImportingRankings] = useState(false);
  const activeInvitations = invitations.filter((invitation) => invitation.status === 'pending');
  const [emailModalData, setEmailModalData] = useState<{
    isOpen: boolean;
    email: string;
    code: string;
    role?: string;
  } | null>(null);
  const [emailCopiedState, setEmailCopiedState] = useState<boolean>(false);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const inv = await createInvitation(
        inviteEmail.trim(),
        inviteRole,
        inviteTournamentId || undefined
      );
      setInviteEmail('');
      setSuccessMsg(
        inv.emailStatus === 'sent'
          ? `Invitación guardada y aceptada por el proveedor de correo para ${inv.email}.`
          : `Invitación guardada, pero el correo aún no fue enviado a ${inv.email}.`
      );
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

  const prepareInvitationEmail = (email: string, code: string, role?: string) => {
    const inviteUrl = `${window.location.origin}?invite=${encodeURIComponent(code)}`;
    const roleLabel = role === 'organizer' ? 'Organizador' : 'Árbitro Oficial';
    const emailBody = `¡Hola!\n\nHas sido invitado a Beyblade X Arena con el rol de ${roleLabel}.\n\nCódigo de invitación: ${code}\nEnlace de registro directo: ${inviteUrl}\n\nPor favor usa esta dirección de correo (${email}) para registrarte o iniciar sesión.\n\n¡Nos vemos en la arena!`;

    // Copy to clipboard immediately as a reliable backup
    try {
      navigator.clipboard.writeText(emailBody);
      setSuccessMsg(`✓ Texto de invitación copiado al portapapeles para ${email}`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch {}

    // Also attempt mailto via temporary anchor
    try {
      const subject = encodeURIComponent(`Invitación a Beyblade X Arena (${roleLabel})`);
      const body = encodeURIComponent(emailBody);
      const mailtoLink = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
      const tempLink = document.createElement('a');
      tempLink.href = mailtoLink;
      tempLink.target = '_blank';
      tempLink.rel = 'noopener noreferrer';
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
    } catch {
      // Fallback handled by modal
    }

    setEmailModalData({
      isOpen: true,
      email,
      code,
      role,
    });
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    const res = await syncCurrentTournamentToSupabase();
    setSuccessMsg(res.message);
    setIsSyncing(false);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleRankingWorkbook = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setErrorMsg(null);
    setIsImportingRankings(true);
    try {
      const imported = await importRankingWorkbook(file);
      setSuccessMsg(`Rankings actualizados: ${imported.rankings} bladers y ${imported.hallOfFame} torneos del Salón de la Fama.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'No se pudo importar el archivo Excel.');
    } finally {
      setIsImportingRankings(false);
    }
  };

  const [adminTab, setAdminTab] = useState<'referees' | 'invitations' | 'rankings'>('referees');

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

          {currentRole === 'admin' && (
            <button
              onClick={() => setAdminTab('rankings')}
              className={`px-4 py-2 rounded-[var(--r-control)] text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                adminTab === 'rankings'
                  ? 'bg-[var(--chasis)] text-[var(--hueso)] border border-[var(--costura)] shadow-sm'
                  : 'text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--chasis)]/50'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-300" />
              <span>Importar Rankings</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">Solo admin</span>
            </button>
          )}
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
          <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-[var(--r-control)] text-xs text-amber-200">
            <strong>Entrega por correo:</strong> el sistema genera códigos y enlaces seguros, pero el envío automático SMTP aún no está configurado. Usa el botón de correo para abrir tu cliente y enviar la invitación.
          </div>

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
              Invitaciones Activas ({activeInvitations.length})
            </div>

            {activeInvitations.length === 0 ? (
              <div className="text-xs text-[var(--acero)] py-2">
                No hay invitaciones pendientes.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {activeInvitations.map((inv) => (
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
                        onClick={() => prepareInvitationEmail(inv.email, inv.code, inv.role)}
                        className="p-1 rounded text-[var(--acero)] hover:text-amber-300"
                        title="Enviar / preparar correo de invitación"
                        aria-label={`Enviar correo a ${inv.email}`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          void revokeInvitation(inv.id).catch((error: unknown) => {
                            setErrorMsg(error instanceof Error ? error.message : 'No se pudo revocar la invitación.');
                          });
                        }}
                        className="p-1 rounded text-[var(--acero)] hover:text-rose-400"
                        title="Eliminar invitación"
                        aria-label={`Eliminar invitación de ${inv.email}`}
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

  {adminTab === 'rankings' && currentRole === 'admin' && (
    <section className="space-y-5">
      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-600 rounded-[var(--r-control)] text-xs font-semibold text-emerald-300" role="status">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-rose-950/40 border border-rose-700 rounded-[var(--r-control)] text-xs font-semibold text-rose-300" role="alert">
          {errorMsg}
        </div>
      )}
      <div className="bg-[var(--chasis)] rounded-[var(--r-card)] border border-[var(--costura)] p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <UploadCloud className="w-5 h-5 text-purple-300 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[var(--hueso)]">Fuente oficial de Rankings</h3>
            <p className="text-xs text-[var(--acero)] mt-1">
              Carga un libro .xlsx. Usa una hoja <strong>Rankings</strong> y, opcionalmente, otra hoja <strong>HallOfFame</strong>.
              La importación reemplaza la publicación anterior y elimina datos de prueba.
            </p>
          </div>
        </div>
        <label className="mt-5 flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-purple-700/70 bg-purple-950/30 px-4 py-3 text-xs font-bold text-purple-200 hover:bg-purple-950/60">
          <UploadCloud className="w-4 h-4" />
          {isImportingRankings ? 'Procesando archivo...' : 'Adjuntar archivo Excel'}
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={handleRankingWorkbook}
            disabled={isImportingRankings}
          />
        </label>
        <p className="mt-3 text-[11px] text-[var(--acero)]">
          Publicado actualmente: {rankings.length} bladers · {hallOfFame.length} entradas del Salón de la Fama.
        </p>
      </div>
    </section>
  )}

      {/* Modal de Envío y Preparación de Correo de Invitación */}
      {emailModalData?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--costura)]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--hueso)] font-display">
                    Invitación por Correo Electrónico
                  </h3>
                  <p className="text-xs text-[var(--acero)]">
                    Destinatario: <span className="font-mono text-[var(--hueso)]">{emailModalData.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEmailModalData(null)}
                className="p-1.5 rounded-lg text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--grafito)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[var(--grafito)] border border-[var(--costura)] space-y-2">
                <div className="flex justify-between items-center text-[11px] text-[var(--acero)]">
                  <span>CÓDIGO DE ACCESO</span>
                  <span className="font-mono font-bold text-[var(--cobalto)]">{emailModalData.code}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-[var(--acero)]">
                  <span>ROL ASIGNADO</span>
                  <span className="font-bold text-[var(--hueso)] capitalize">
                    {emailModalData.role === 'organizer' ? 'Organizador' : 'Árbitro Oficial'}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--acero)] pt-1 border-t border-[var(--costura)]">
                  <span>ENLACE DIRECTO:</span>
                  <div className="mt-1 font-mono text-[10px] break-all bg-[var(--chasis)] p-2 rounded text-[var(--hueso)]">
                    {`${window.location.origin}?invite=${encodeURIComponent(emailModalData.code)}`}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-[11px] leading-relaxed">
                💡 Si tu cliente de correo (Outlook, Mail o Thunderbird) no se abrió automáticamente debido a restricciones de seguridad del navegador en el visor, puedes abrir Gmail Web directamente o copiar la plantilla de invitación.
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[var(--costura)]">
              <button
                type="button"
                onClick={() => {
                  const inviteUrl = `${window.location.origin}?invite=${encodeURIComponent(emailModalData.code)}`;
                  const roleLabel = emailModalData.role === 'organizer' ? 'Organizador' : 'Árbitro Oficial';
                  const fullText = `Has sido invitado a Beyblade X Arena como ${roleLabel}.\n\nCódigo de invitación: ${emailModalData.code}\nEnlace directo: ${inviteUrl}\n\nIngresa con este correo (${emailModalData.email}) al registrarte.`;
                  copyToClipboard(fullText);
                  setEmailCopiedState(true);
                  setTimeout(() => setEmailCopiedState(false), 3000);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--grafito)] hover:bg-[var(--costura)] text-[var(--hueso)] text-xs font-bold flex items-center justify-center gap-2 border border-[var(--costura)] transition-all cursor-pointer"
              >
                {emailCopiedState ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {emailCopiedState ? '¡Mensaje Copiado!' : 'Copiar Mensaje'}
              </button>

              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emailModalData.email)}&su=${encodeURIComponent('Invitación a Beyblade X Arena')}&body=${encodeURIComponent(
                  `Has sido invitado a Beyblade X Arena.\n\nCódigo: ${emailModalData.code}\nEnlace: ${window.location.origin}?invite=${encodeURIComponent(emailModalData.code)}\n\nUsa este correo (${emailModalData.email}) para acceder.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--cobalto)] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Send className="w-4 h-4" />
                Abrir en Gmail Web
              </a>
            </div>
          </div>
        </div>
      )}

      <SupabaseModal isOpen={showDbModal} onClose={() => setShowDbModal(false)} />
    </div>
  );
};
