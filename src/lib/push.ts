import { API_BASE_URL, IS_PUSH_ENABLED, VAPID_PUBLIC_KEY } from './env';

/**
 * Subscribes the admin's device to Web Push, so a new booking can reach them even with the app
 * closed. Only meant to run behind the admin gate, triggered by a click (permission prompts
 * require a user gesture).
 */

// VAPID public key is base64url; the browser wants a Uint8Array backed by a plain ArrayBuffer
// (not the wider ArrayBufferLike that Uint8Array.from's ambient typing produces).
const urlBase64ToUint8Array = (base64String: string): Uint8Array<ArrayBuffer> => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

export type PushEnableResult =
  | 'subscribed'
  | 'denied'
  | 'unsupported'
  | 'not-configured'
  | 'no-service-worker'
  | 'server-error'
  | 'error';

export const isPushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Called from a user gesture (button click). Requests permission and registers the device. */
export const enableAdminPush = async (): Promise<PushEnableResult> => {
  if (!IS_PUSH_ENABLED) return 'not-configured';
  if (!isPushSupported()) return 'unsupported';

  // `serviceWorker.ready` never resolves when no worker was ever registered — and registration is
  // production-only (registerServiceWorker.ts). Without this guard the button hangs on "Ativando…"
  // forever in `vite dev` instead of reporting anything.
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return 'no-service-worker';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const ready = await navigator.serviceWorker.ready;

    // Reuse an existing subscription if present, else create one.
    const subscription =
      (await ready.pushManager.getSubscription()) ??
      (await ready.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }));

    const json = subscription.toJSON();
    const res = await fetch(`${API_BASE_URL}/save-push-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        userAgent: navigator.userAgent,
      }),
    });

    if (!res.ok) {
      // The status and body are the only way to tell "function not deployed" (404) from
      // "table missing / secrets unset" (500) — a bare boolean here makes setup gaps invisible.
      const detail = await res.text().catch(() => '');
      console.error(
        `[push] save-push-subscription failed (${res.status}) at ${API_BASE_URL}:`,
        detail
      );
      return 'server-error';
    }

    // Fire a real notification right now, from the same service worker that will display the
    // pushed ones. If this appears but new-booking alerts never do, the browser half is proven
    // good and the problem is server-side (trigger / VAPID keys) — which is otherwise very hard
    // to tell apart from a silently blocked notification.
    await ready.showNotification('Notificações ativadas ✅', {
      body: 'Você receberá um aviso aqui quando um cliente agendar.',
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      tag: 'push-ativado',
    });

    return 'subscribed';
  } catch (err) {
    console.error('[push] enable failed', err);
    return 'error';
  }
};
