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
  | 'error';

export const isPushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/** Called from a user gesture (button click). Requests permission and registers the device. */
export const enableAdminPush = async (): Promise<PushEnableResult> => {
  if (!IS_PUSH_ENABLED) return 'not-configured';
  if (!isPushSupported()) return 'unsupported';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';

  try {
    const registration = await navigator.serviceWorker.ready;

    // Reuse an existing subscription if present, else create one.
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
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
    return res.ok ? 'subscribed' : 'error';
  } catch (err) {
    console.error('[push] enable failed', err);
    return 'error';
  }
};
