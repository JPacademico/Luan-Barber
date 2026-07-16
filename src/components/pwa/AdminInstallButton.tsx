import React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

/**
 * Installs the admin panel as its own PWA, separate from the public site.
 *
 * The two faces link different manifests (scope `/admin` vs `/`), so a prompt fired here creates
 * a distinct "Luan Admin" home-screen app pointing straight at the panel.
 *
 * Stays visible whenever the panel is not already installed — NOT only when `beforeinstallprompt`
 * has fired. That event is unreliable (never on iOS, and Chrome delays it behind an engagement
 * heuristic), so gating on it made the button vanish. When the native prompt is ready we fire it;
 * otherwise we explain how to install for that platform.
 */
export const AdminInstallButton: React.FC = () => {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  // Hide only when already running as the installed app.
  if (isInstalled) return null;

  const handleInstall = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) toast.success('Painel instalado! Abra pelo ícone na tela inicial.');
      return;
    }

    if (isIOS) {
      toast('Instale o painel', {
        description: 'Toque em Compartilhar e depois em “Adicionar à Tela de Início”.',
        duration: 7000,
      });
      return;
    }

    // Chromium before the prompt is ready, or a browser without programmatic install.
    toast('Instale o painel', {
      description:
        'Abra o menu do navegador (⋮) e escolha “Instalar app” ou “Adicionar à tela inicial”.',
      duration: 7000,
    });
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
