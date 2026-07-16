import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

const DISMISS_KEY = 'luan-studio-install-dismissed';

const wasDismissed = (): boolean => {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Stylised "Install Luan Studio App" prompt.
 *
 * Renders nothing unless the browser actually offers installation (Chromium fired
 * `beforeinstallprompt`) or the visitor is on iOS Safari, where install is manual. It hides on the
 * admin panel — that is a back-office tool, not something to pin to a home screen — and stays
 * hidden once dismissed.
 */
export const InstallAppBanner: React.FC = () => {
  const { canInstall, isInstalled, isIOS, promptInstall } = useInstallPrompt();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState<boolean>(wasDismissed);

  const isAdmin = pathname.startsWith('/admin');
  const showIOSHint = isIOS && !isInstalled;

  if (isInstalled || dismissed || isAdmin || (!canInstall && !showIOSHint)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Non-fatal: the banner just reappears next session.
    }
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success('App instalado! Abra pela tela inicial. 📱');
      dismiss();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Instalar o app Luan Studio"
      // Kept clear of the WhatsApp FAB (fixed bottom-right): lifted above it on mobile, and
      // anchored bottom-LEFT on desktop where the FAB never reaches.
      className="fixed z-40 inset-x-3 bottom-24 sm:inset-x-auto sm:left-4 sm:bottom-4 sm:w-[360px] animate-slide-up"
    >
      <div className="relative overflow-hidden rounded-2xl border border-brand-gold/40 bg-brand-black text-white shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-gold/15 to-transparent" aria-hidden="true" />

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="relative p-5">
          <div className="flex items-start gap-3">
            <span className="shrink-0 grid place-items-center w-11 h-11 rounded-xl bg-brand-gold text-brand-black">
              <Smartphone size={22} />
            </span>
            <div className="min-w-0 pr-4">
              <h3 className="font-display font-bold text-base leading-tight">
                Instale o app Luan Studio
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Agende em segundos direto da sua tela inicial, sem abrir o navegador.
              </p>
            </div>
          </div>

          {showIOSHint && !canInstall ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-gray-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              Toque em <Share size={14} className="inline text-brand-gold" /> e depois em
              <span className="font-semibold text-white">“Adicionar à Tela de Início”.</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleInstall}
              className="btn-primary w-full mt-4 py-3 text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2"
            >
              <Download size={16} /> Instalar App
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
