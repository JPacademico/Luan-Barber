import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_PASSWORD } from '../../constants/defaults';
import { IS_BACKEND_ENABLED } from '../../lib/env';
import { rememberAdminPassword, verifyAdminPassword } from '../../lib/adminApi';

interface AdminGateProps {
  children: React.ReactNode;
}

/**
 * Password gate for /admin.
 *
 * When the backend is configured the password is checked *there*, against the ADMIN_PASSWORD
 * secret, so it is no longer shipped in the JS bundle where anyone could read it. That is what
 * makes it safe for the panel to edit `services.price_cents` — the amount Pix charges.
 *
 * Without a backend it falls back to the old in-bundle comparison, so local development and the
 * pre-backend demo keep working. That path is not security and never was; see defaults.ts.
 */
export const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const grantAccess = (accepted: string) => {
    sessionStorage.setItem('adminAuth', 'true');
    // Kept for the session so privileged writes (price sync) can re-authenticate without
    // asking again. Cleared on logout.
    rememberAdminPassword(accepted);
    setIsAuthenticated(true);
    toast.success('Acesso liberado');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking) return;

    if (!IS_BACKEND_ENABLED) {
      if (password === ADMIN_PASSWORD) grantAccess(password);
      else {
        toast.error('Senha incorreta');
        setPassword('');
      }
      return;
    }

    setIsChecking(true);
    const outcome = await verifyAdminPassword(password);
    setIsChecking(false);

    if (outcome === 'ok') {
      grantAccess(password);
      return;
    }

    setPassword('');

    if (outcome === 'wrong-password') {
      toast.error('Senha incorreta');
    } else if (outcome === 'unreachable') {
      toast.error('Não foi possível falar com o servidor.', {
        description: 'Verifique sua conexão e tente novamente.',
      });
    } else {
      toast.error('Login administrativo não configurado no servidor.', {
        description: 'Defina o segredo ADMIN_PASSWORD no backend. Detalhes no console.',
        duration: 9000,
      });
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
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
            Digite a senha administrativa para acessar o painel de controle.
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
