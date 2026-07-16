import { useCallback, useEffect, useState } from 'react';

/** The event Chromium fires before offering installation — not yet in the DOM lib typings. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface InstallPromptState {
  /** A native install prompt is available (Android/desktop Chromium). */
  canInstall: boolean;
  /** The app is already running installed (standalone display mode). */
  isInstalled: boolean;
  /** iOS Safari, which has no beforeinstallprompt and needs manual "Add to Home Screen" steps. */
  isIOS: boolean;
  /** Fires the native prompt. Resolves to whether the user accepted. No-op if unavailable. */
  promptInstall: () => Promise<boolean>;
}

const detectStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari exposes standalone on navigator instead of matchMedia.
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const detectIOS = (): boolean => {
  const ua = window.navigator.userAgent;
  const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac; disambiguate via touch support.
  const isIPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1;
  return isIphoneOrIpad || isIPadOS;
};

/**
 * Captures the `beforeinstallprompt` event and exposes a way to trigger it on demand, so a custom
 * button can drive the native install flow instead of the browser's default mini-infobar.
 */
export const useInstallPrompt = (): InstallPromptState => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectStandalone());
  const isIOS = detectIOS();

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      // Stop Chrome's default mini-infobar; we surface our own button instead.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // The event is single-use; drop it so the button hides after a decision.
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    isIOS,
    promptInstall,
  };
};
