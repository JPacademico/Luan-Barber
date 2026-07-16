/**
 * Registers the PWA service worker.
 *
 * Production only: in dev the SW's caching fights Vite's HMR and serves stale modules. The worker
 * file itself is a static asset in /public, served at /sw.js.
 */
export const registerServiceWorker = (): void => {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      // Registration failure must never break the app; the site works fine without the SW.
      console.error('Service worker registration failed:', error);
    });
  });
};
