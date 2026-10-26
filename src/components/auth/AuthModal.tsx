import React, { useState, useEffect } from 'react';
import { useTournament } from '../../context/TournamentContext';
import { AceroIcon } from '../common/AceroIcon';
import { KeyRound, UserCheck, Shield, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'invite';
  initialCode?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'login',
  initialCode = '',
}) => {
  const { login, loginWithInvitation } = useTournament();

  const [activeTab, setActiveTab] = useState<'login' | 'invite'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [displayName, setDisplayName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialCode) {
      setInviteCode(initialCode);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [initialTab, initialCode, isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!inviteCode.trim()) {
      setErrorMsg('Por favor ingresa el código de invitación.');
      return;
    }
    if (!displayName.trim()) {
      setErrorMsg('Por favor indica tu nombre o alias para el torneo.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithInvitation(
        inviteCode.trim(),
        displayName.trim(),
        inviteEmail.trim()
      );
      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al canjear invitación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] shadow-2xl overflow-hidden flex flex-col text-[var(--hueso)]">
        
        {/* Header */}
        <div className="p-5 border-b border-[var(--costura)] flex items-center justify-between bg-[var(--grafito)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--chasis)] border border-[var(--costura)] flex items-center justify-center text-sm font-bold text-[var(--hueso)]">
              ⚡
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[var(--hueso)] font-display">
                Acceso a la Plataforma
              </h2>
              <p className="text-[11px] text-[var(--acero)]">
                Control de roles y permisos para torneos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--acero)] hover:text-[var(--hueso)] hover:bg-[var(--chasis)] transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1.5 bg-[var(--grafito)] border-b border-[var(--costura)] text-xs font-semibold">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-[var(--r-chip)] transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'login'
                ? 'bg-[var(--chasis)] text-[var(--hueso)] shadow-xs'
                : 'text-[var(--acero)] hover:text-[var(--hueso)]'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Iniciar Sesión
          </button>
          <button
            onClick={() => {
              setActiveTab('invite');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-[var(--r-chip)] transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'invite'
                ? 'bg-[var(--chasis)] text-[var(--hueso)] shadow-xs'
                : 'text-[var(--acero)] hover:text-[var(--hueso)]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Canjear Invitación
          </button>
        </div>

        {/* Feedback alert */}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-[var(--r-control)] bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-[var(--r-control)] bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: Direct Login */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} className="p-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)] block">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@beybladex.org"
                  required
                  className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] placeholder-[var(--costura)] focus:outline-hidden focus:border-[var(--acero)]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)] block">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] placeholder-[var(--costura)] focus:outline-hidden focus:border-[var(--acero)]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-[var(--r-control)] bg-[var(--hueso)] hover:bg-white text-[var(--tinta)] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLoading ? 'Comprobando credenciales...' : 'Entrar a la Plataforma'}
              </button>
            </div>

          </form>
        )}

        {/* Tab 2: Invitation Code */}
        {activeTab === 'invite' && (
          <form onSubmit={handleClaimInvite} className="p-5 space-y-4">
            <div className="p-3 bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)] text-xs text-[var(--acero)] leading-relaxed">
              El registro oficial de <strong>Árbitros</strong> y <strong>Organizadores</strong> funciona mediante invitación del Administrador.
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)] block">
                Código de Invitación
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="BEY-REF-8921"
                required
                className="w-full text-xs font-mono font-bold tracking-wider border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] uppercase placeholder-[var(--costura)] focus:outline-hidden focus:border-[var(--acero)]"
              />
              <span className="text-[10px] text-[var(--acero)]">
                Código entregado por el administrador (ej. BEY-REF-xxxx o BEY-ORG-xxxx)
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)] block">
                Nombre / Alias Oficial
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Juez Carlos"
                required
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] placeholder-[var(--costura)] focus:outline-hidden focus:border-[var(--acero)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[var(--acero)] block">
                Correo Electrónico (Opcional)
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="carlos.juez@arena.com"
                className="w-full text-xs font-medium border border-[var(--costura)] rounded-[var(--r-control)] px-3 py-2 bg-[var(--grafito)] text-[var(--hueso)] placeholder-[var(--costura)] focus:outline-hidden focus:border-[var(--acero)]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-[var(--r-control)] bg-[var(--cobalto)] hover:brightness-110 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                {isLoading ? 'Validando invitación...' : 'Activar Cuenta & Asignar Rol'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
