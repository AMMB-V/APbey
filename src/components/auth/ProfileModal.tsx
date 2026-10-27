import React, { useEffect, useState } from 'react';
import { KeyRound, Mail, Save, User, X } from 'lucide-react';
import { useTournament } from '../../context/TournamentContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useTournament();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setDisplayName(currentUser.displayName);
    setEmail(currentUser.email);
    setPassword('');
    setMessage(null);
    setError(null);
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateProfile({ displayName, email, password });
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setMessage(result.message);
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="w-full max-w-md bg-[var(--chasis)] border border-[var(--costura)] rounded-[var(--r-card)] shadow-2xl text-[var(--hueso)]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--costura)] bg-[var(--grafito)]">
          <div>
            <h2 id="profile-modal-title" className="text-sm font-bold font-display">Mi perfil y seguridad</h2>
            <p className="text-[11px] text-[var(--acero)] mt-1">Actualiza tus datos de acceso y tu nombre visible.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[var(--acero)] hover:text-[var(--hueso)]" aria-label="Cerrar perfil">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {message && <div className="p-3 rounded-[var(--r-control)] border border-emerald-700 bg-emerald-950/40 text-xs text-emerald-300" role="status">{message}</div>}
          {error && <div className="p-3 rounded-[var(--r-control)] border border-rose-700 bg-rose-950/40 text-xs text-rose-300" role="alert">{error}</div>}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--acero)]">Nombre visible</span>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-[var(--acero)]" />
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={100} required className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)]" />
            </div>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--acero)]">Correo de acceso</span>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--acero)]" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)]" />
            </div>
            <span className="block text-[10px] text-[var(--acero)]">Supabase puede pedir confirmación en el correo nuevo.</span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--acero)]">Nueva contraseña <span className="font-normal">(opcional)</span></span>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-[var(--acero)]" />
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="Mínimo 8 caracteres" className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--grafito)] border border-[var(--costura)] rounded-[var(--r-control)]" />
            </div>
          </label>

          <button type="submit" disabled={saving} className="w-full btn btn--primary text-xs py-2.5 flex items-center justify-center gap-2 disabled:opacity-60">
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};
