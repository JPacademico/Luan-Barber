import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ADMIN_PASSWORD } from '../../constants/defaults';

interface AdminGateProps {
  children: React.ReactNode;
}

export const AdminGate: React.FC<AdminGateProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('adminAuth') === 'true';
  });
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', 'true');
      setIsAuthenticated(true);
      toast.success('Acesso liberado');
    } else {
      toast.error('Senha incorreta');
      setPassword('');
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
              className="w-full px-4 py-3 bg-black border border-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-brand-gold text-white placeholder:text-gray-600 text-center tracking-widest"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-brand-gold text-brand-black font-bold py-3 rounded hover:bg-brand-gold/90 transition-colors"
          >
            Acessar Painel
          </button>
        </form>
      </div>
    </div>
  );
};
