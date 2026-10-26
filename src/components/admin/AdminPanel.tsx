import React, { useState } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { UserRole } from '../../types/tournament';
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
  } = useTournament();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'organizer' | 'referee'>('referee');
  const [inviteTournamentId, setInviteTournamentId] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCreateInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const inv = createInvitation(
      inviteEmail.trim(),
      inviteRole,
      inviteTournamentId || undefined
    );
    setInviteEmail('');
    setSuccessMsg(`Invitación creada para ${inv.email} con código ${inv.code}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-neutral-800" />
              Panel de Administración & Control de Invitaciones
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            "Cuentas de organizador y árbitro por invitación del admin": El registro público está cerrado; solo los administradores pueden generar accesos autorizados.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm('¿Restablecer todos los datos a la configuración inicial de demostración?')) {
              resetAllData();
            }
          }}
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-neutral-300 hover:bg-neutral-100 text-neutral-700 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restablecer Datos Demo
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Invite Form + User List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Invite Form */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
            <UserPlus className="w-4 h-4 text-neutral-700" />
            <h3 className="text-sm font-bold text-neutral-900">
              Invitar Nuevo Organizador o Árbitro
            </h3>
          </div>

          <form onSubmit={handleCreateInvite} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Correo Electrónico:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="w-full text-xs font-medium border border-neutral-300 rounded-lg pl-9 pr-3 py-2 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Rol Autorizado:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setInviteRole('referee')}
                  className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${
                    inviteRole === 'referee'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  ⚖️ Árbitro / Juez
                </button>
                <button
                  type="button"
                  onClick={() => setInviteRole('organizer')}
                  className={`p-2 rounded-lg text-xs font-bold border transition-all text-center ${
                    inviteRole === 'organizer'
                      ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                      : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  🏆 Organizador
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">
                Torneo Asignado (Opcional):
              </label>
              <select
                value={inviteTournamentId}
                onChange={(e) => setInviteTournamentId(e.target.value)}
                className="w-full text-xs font-medium border border-neutral-300 rounded-lg p-2 bg-neutral-50 focus:bg-white focus:outline-none"
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
              className="w-full mt-2 px-4 py-2.5 text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Generar Invitación & Código
            </button>
          </form>

          {/* Pending Invitations List */}
          <div className="pt-4 border-t border-neutral-200 space-y-2">
            <div className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              Invitaciones Activas ({invitations.length})
            </div>

            {invitations.length === 0 ? (
              <div className="text-xs text-neutral-400 py-2">
                No hay invitaciones pendientes.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900">{inv.email}</div>
                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono mt-0.5">
                        <span className="uppercase font-bold text-neutral-700">
                          {inv.role === 'referee' ? 'Árbitro' : 'Organizador'}
                        </span>
                        <span>·</span>
                        <span className="bg-neutral-200 px-1 py-0.2 rounded font-bold text-neutral-800">
                          {inv.code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copyToClipboard(inv.code)}
                        className="p-1 rounded text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200"
                        title="Copiar código de invitación"
                      >
                        {copiedCode === inv.code ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => revokeInvitation(inv.id)}
                        className="p-1 rounded text-neutral-400 hover:text-red-600 hover:bg-red-50"
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
        <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-700" />
              <h3 className="text-sm font-bold text-neutral-900">
                Usuarios Registrados & Permisos (RBAC)
              </h3>
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              {users.length} Cuentas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase font-bold text-neutral-500 bg-neutral-50 border-b border-neutral-200">
                <tr>
                  <th className="py-2 px-3">Usuario</th>
                  <th className="py-2 px-3">Email</th>
                  <th className="py-2 px-3">Rol Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      {u.displayName}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-600 font-mono">
                      {u.email}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        value={u.role}
                        onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                        className="text-xs border border-neutral-300 rounded px-2 py-1 bg-white font-medium text-neutral-800"
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
          <div className="pt-4 border-t border-neutral-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-700 mb-2">
              <History className="w-4 h-4 text-neutral-500" />
              Bitácora de Auditoría (Audit Log)
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-neutral-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="pt-2 pb-1 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                    <span className="font-bold text-neutral-700 uppercase">
                      {log.tableName} · {log.action}
                    </span>
                    <span>
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-neutral-800 mt-0.5">
                    {log.note || `Acción en registro ${log.recordId}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
