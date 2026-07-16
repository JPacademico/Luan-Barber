import React from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

interface HeaderInstallButtonProps {
  /** Mirrors the header's own dark-surface state so the icon stays legible over the hero. */
  onDarkSurface?: boolean;
}

/**
 * Icon-only install trigger for the public site's header — the counterpart to
 * AdminInstallButton, styled to match the header's own icon buttons instead of a standalone
 * bordered pill. Renders nothing unless the browser actually offers a native install; the
 * bottom-corner InstallAppBanner remains the primary prompt, this is a persistent fallback for
 * anyone who dismissed it.
 */
export const HeaderInstallButton: React.FC<HeaderInstallButtonProps> = ({
  onDarkSurface = false,
}) => {
  const { canInstall, promptInstall } = useInstallPrompt();

  if (!canInstall) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) toast.success('App instalado! Abra pela tela inicial. 📱');
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
