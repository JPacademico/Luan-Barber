import React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * Installs the admin panel as its own PWA, separate from the public site.
 *
 * The two faces link different manifests (scope `/admin` vs `/`), so a prompt fired here creates
 * a distinct "Luan Admin" home-screen app pointing straight at the panel. Rendered in the admin
 * header; shows only when the browser actually offers a native install.
 */
export const AdminInstallButton: React.FC = () => {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) toast.success('Painel instalado! Abra pelo ícone na tela inicial.');
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-sky-500/40 text-sky-300 text-xs font-medium hover:bg-sky-500/10 transition-colors"
      title="Instalar o painel como app"
    >
      <Download size={15} />
      <span className="hidden sm:inline">Instalar painel</span>
    </button>
  );
};
