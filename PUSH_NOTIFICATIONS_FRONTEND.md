# Feature plan — Mobile push notification to the admin (FRONTEND half)

**Goal:** when a client books, the admin's installed PWA receives a push notification on their
phone, even with the app closed.

**Free & standard?** Yes — Web Push API + VAPID, no paid service. Works on installed PWAs on
Android/desktop, and on **iOS 16.4+ only when the site is added to the Home Screen** (regular
Safari tabs can't receive push on iOS).

This is the **frontend half**. The **backend half** (store subscriptions, send the push) is in the
backend repo: `Luan-Studio-Back/PUSH_NOTIFICATIONS_BACKEND.md`. Do the backend Step 1 (generate
the VAPID keys) first — you need the **public** key here.

The frontend's job is three things:
1. Ask the admin for notification permission and **subscribe** the device.
2. Send that subscription to the backend (`save-push-subscription`).
3. **Show** the notification from the service worker when a push arrives.

Because only the admin should get these, all of this lives **behind the admin gate** — a device
only subscribes when someone opens the admin panel and turns it on.

---

## Prerequisites already in place

- The app is a PWA with a service worker at `public/sw.js`, registered by
  `src/lib/registerServiceWorker.ts`. Good — push needs exactly that.
- There's an admin dashboard (`src/components/admin/AdminDashboard.tsx`) to host an "enable
  notifications" control.

---

## Step 1 — Env var: the VAPID public key

Add to `.env` / `.env.example` and to Vercel:
```
VITE_VAPID_PUBLIC_KEY=BB...     # the PUBLIC key from `npx web-push generate-vapid-keys`
VITE_API_BASE_URL=https://PROJECT_REF.functions.supabase.co
```
`VITE_API_BASE_URL` is already wired through `src/lib/env.ts` (`API_BASE_URL`) — push needs it to
reach `save-push-subscription`. Add a read for the VAPID key alongside it:
```ts
// src/lib/env.ts
export const VAPID_PUBLIC_KEY = read(import.meta.env.VITE_VAPID_PUBLIC_KEY);
export const IS_PUSH_ENABLED = IS_BACKEND_ENABLED && VAPID_PUBLIC_KEY !== '';
```

---

## Step 2 — Service worker: handle incoming pushes

Add to `public/sw.js` (these are additive — they don't touch the existing caching logic). Also
**bump `CACHE_VERSION`** (e.g. `luan-studio-v3`) so the updated worker rolls out:

```js
// Show a notification when a push arrives (fired even when the app is closed).
self.addEventListener('push', (event) => {
  let data = { title: 'Luan Studio Barber', body: 'Novo agendamento', url: '/admin' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch { /* keep defaults */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo-maskable.svg',
      badge: '/favicon-admin.svg',
      data: { url: data.url },
      tag: 'novo-agendamento',
    })
  );
});

// Focus (or open) the admin panel when the notification is tapped.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes('/admin'));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
```

---

## Step 3 — A helper to subscribe the device

New file `src/lib/push.ts`:

```ts
import { API_BASE_URL, VAPID_PUBLIC_KEY, IS_PUSH_ENABLED } from './env';

// VAPID public key is base64url; the browser wants a Uint8Array.
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
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
```

> Note: the service worker only registers in production (`registerServiceWorker.ts` bails in dev),
> so push can only be tested on a deployed/preview build, not `vite dev`.

---

## Step 4 — UI: an "enable notifications" control in the admin panel

Add a small button — e.g. a new component `src/components/admin/PushToggle.tsx` — shown in the
`AdminDashboard` header or the `AppointmentsPanel`. It must be triggered by a **click** (permission
prompts require a user gesture).

```tsx
import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { enableAdminPush, isPushSupported } from '../../lib/push';
import { IS_PUSH_ENABLED } from '../../lib/env';

const MESSAGES = {
  subscribed: ['success', 'Notificações ativadas neste aparelho.'],
  denied: ['error', 'Permissão negada. Ative nas configurações do navegador.'],
  unsupported: ['error', 'Este navegador não suporta notificações.'],
  'not-configured': ['error', 'Notificações ainda não configuradas no servidor.'],
  error: ['error', 'Não foi possível ativar. Tente novamente.'],
} as const;

export const PushToggle: React.FC = () => {
  const [busy, setBusy] = useState(false);
  if (!IS_PUSH_ENABLED || !isPushSupported()) return null;

  const handleClick = async () => {
    setBusy(true);
    const result = await enableAdminPush();
    const [kind, msg] = MESSAGES[result];
    kind === 'success' ? toast.success(msg) : toast.error(msg);
    setBusy(false);
  };

  return (
    <button type="button" onClick={handleClick} disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-800 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50">
      <Bell size={16} /> {busy ? 'Ativando…' : 'Ativar notificações'}
    </button>
  );
};
```

Then drop `<PushToggle />` into the dashboard (e.g. in `AdminDashboard`'s nav row, or above the
appointments list).

---

## Step 5 — iOS caveat (tell Luan)

On iPhone, push only works if the site is **installed to the Home Screen** (Share → "Adicionar à
Tela de Início") and opened from that icon, on **iOS 16.4 or newer**. In a normal Safari tab the
"Ativar notificações" button will report `denied`/`unsupported` — that's expected. Android and
desktop Chrome/Edge work from the installed PWA (and even a normal tab on desktop). The existing
install prompts (`InstallAppBanner` / `AdminInstallButton`) already guide installation.

---

## How to test end-to-end

1. Deploy the backend half first (VAPID secrets, `save-push-subscription`, push in
   `notify-booking-created`).
2. Deploy this frontend with `VITE_VAPID_PUBLIC_KEY` + `VITE_API_BASE_URL` set.
3. Install the PWA on a phone, open `/admin`, tap **Ativar notificações**, allow the prompt.
4. Confirm a row appeared in the backend's `push_subscriptions` table.
5. Make a test booking from another device → the phone should buzz with "Novo agendamento".

---

## New files / edits summary (frontend)

| File | Change |
| --- | --- |
| `.env` / Vercel | add `VITE_VAPID_PUBLIC_KEY`, `VITE_API_BASE_URL` |
| `src/lib/env.ts` | export `VAPID_PUBLIC_KEY`, `IS_PUSH_ENABLED` |
| `public/sw.js` | add `push` + `notificationclick` handlers; bump `CACHE_VERSION` |
| `src/lib/push.ts` | new — `enableAdminPush`, `isPushSupported` |
| `src/components/admin/PushToggle.tsx` | new — the enable button |
| `AdminDashboard.tsx` (or `AppointmentsPanel.tsx`) | render `<PushToggle />` |

## Deliverables checklist (frontend)

- [ ] Env vars set (`VITE_VAPID_PUBLIC_KEY`, `VITE_API_BASE_URL`)
- [ ] `env.ts` exports added
- [ ] `sw.js` push/notificationclick handlers + `CACHE_VERSION` bump
- [ ] `src/lib/push.ts`
- [ ] `PushToggle` component wired into the admin UI
- [ ] Tested on an installed PWA (Android first; iOS needs Home-Screen install, 16.4+)
