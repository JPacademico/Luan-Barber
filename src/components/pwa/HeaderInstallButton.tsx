import React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

interface HeaderInstallButtonProps {
  /** Mirrors the header's own dark-surface state so the icon stays legible over the hero. */
  onDarkSurface?: boolean;
}

/**
 * Icon-only install trigger for the public header.
 *
 * It stays visible whenever the app is not already installed — NOT only when the browser has
 * fired `beforeinstallprompt`. That event is unreliable (never on iOS, and Chrome delays it behind
 * an engagement heuristic), so gating the icon on it made it vanish on mobile. When the native
 * prompt is ready we fire it; otherwise we explain how to install for that platform. The
 * bottom-corner banner remains the primary prompt; this is the always-there fallback.
 */
export const HeaderInstallButton: React.FC<HeaderInstallButtonProps> = ({
  onDarkSurface = false,
}) => {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();

  // Hide only when already running as the installed app.
  if (isInstalled) return null;

  const handleInstall = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) toast.success('App instalado! Abra pela tela inicial. 📱');
      return;
    }

    if (isIOS) {
      toast('Instale o app Luan Studio', {
        description: 'Toque em Compartilhar e depois em “Adicionar à Tela de Início”.',
        duration: 7000,
      });
      return;
    }

    // Chromium before the prompt is ready, or a browser without programmatic install.
    toast('Instale o app Luan Studio', {
      description:
        'Abra o menu do navegador (⋮) e escolha “Instalar app” ou “Adicionar à tela inicial”.',
      duration: 7000,
    });
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label="Instalar aplicativo"
      title="Instalar aplicativo"
      className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-gold ${
        onDarkSurface
          ? 'text-white hover:bg-white/10'
          : 'text-brand-black dark:text-brand-cream hover:bg-gray-200 dark:hover:bg-brand-gray'
      }`}
    >
      <Download size={20} />
    </button>
  );
};
