import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_PASSWORD, BARBER_PASSWORD } from '../../constants/defaults';
import { BARBERS, DEFAULT_BARBER_ID, type BarberId } from '../../constants/barbers';
import { IS_BACKEND_ENABLED } from '../../lib/env';
import { rememberAdminPassword, verifyAdminPassword } from '../../lib/adminApi';
import { readAdminSession, writeAdminSession, type AdminSession } from '../../lib/adminSession';
import { AdminSessionProvider } from './AdminSessionProvider';

interface AdminGateProps {
  children: React.ReactNode;
}

/** The employee barber a non-owner login belongs to, on the no-backend fallback path only. */
const FALLBACK_EMPLOYEE_ID: BarberId =
  BARBERS.find((barber) => !barber.isOwner)?.id ?? DEFAULT_BARBER_ID;

/**
 * Password gate for /admin, now with two logins.
 *
 * When the backend is configured the password is checked *there*, against the ADMIN_PASSWORD
 * (owner) and BARBER_PASSWORD (employee) secrets, so neither is shipped in the JS bundle where
 * anyone could read it. The server also decides WHICH login it was: the role comes back from
 * `verify-admin` and is never chosen by the browser. That is what makes it safe for the owner's
 * panel to edit `services.price_cents` — the amount Pix charges — while the employee's cannot.
 *
 * Without a backend it falls back to the old in-bundle comparison, so local development and the
 * pre-backend demo keep working. That path is not security and never was; see defaults.ts.
 */
export const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const [session, setSession] = useState<AdminSession | null>(() => readAdminSession());
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const grantAccess = (accepted: string, granted: AdminSession) => {
    writeAdminSession(granted);
    // Kept for the session so privileged writes (price sync) can re-authenticate without
    // asking again. Cleared on logout.
    rememberAdminPassword(accepted);
    setSession(granted);
    toast.success('Acesso liberado');
  };

  /** No-backend fallback: compare against the bundled constants and derive the role locally. */
  const loginOffline = () => {
    if (password === ADMIN_PASSWORD) {
      grantAccess(password, { role: 'owner', barberId: DEFAULT_BARBER_ID });
      return;
    }

    // Checked second so that if the two constants were ever set to the same string, the owner
    // (the broader role) wins rather than the employee.
    if (password === BARBER_PASSWORD) {
      grantAccess(password, { role: 'barber', barberId: FALLBACK_EMPLOYEE_ID });
      return;
    }

    toast.error('Senha incorreta');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking) return;

    if (!IS_BACKEND_ENABLED) {
      loginOffline();
      return;
    }

    setIsChecking(true);
    const result = await verifyAdminPassword(password);
    setIsChecking(false);

    if (result.outcome === 'ok') {
      grantAccess(password, { role: result.role, barberId: result.barberId });
      return;
    }

    setPassword('');

    if (result.outcome === 'wrong-password') {
      toast.error('Senha incorreta');
    } else if (result.outcome === 'unreachable') {
      toast.error('Não foi possível falar com o servidor.', {
        description: 'Verifique sua conexão e tente novamente.',
      });
    } else {
      toast.error('Login administrativo não configurado no servidor.', {
        description:
          'Defina os segredos ADMIN_PASSWORD e BARBER_PASSWORD no backend. Detalhes no console.',
        duration: 9000,
      });
    }
  };

  if (session) {
    return <AdminSessionProvider session={session}>{children}</AdminSessionProvider>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-black p-4 font-body">
      <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mb-4 text-brand-gold">
            <Lock size={32} />
          </div>
          <h2 className="font-semibold tracking-tight text-2xl text-white text-center">Área Restrita</h2>
          <p className="text-gray-400 text-sm mt-2 text-center">
            Digite sua senha para acessar o painel. Cada barbeiro entra com a sua.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              disabled={isChecking}
              className="w-full px-4 py-3 bg-black border border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-brand-gold text-white placeholder:text-gray-600 text-center tracking-widest disabled:opacity-60"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={isChecking}
            className="w-full bg-brand-gold text-brand-black font-bold py-3 rounded hover:bg-brand-gold/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isChecking ? 'Verificando…' : 'Acessar Painel'}
          </button>
        </form>
      </div>
    </div>
  );
};
