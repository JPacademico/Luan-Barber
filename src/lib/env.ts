/**
 * Centralised, typed access to the `VITE_*` environment variables.
 *
 * Everything here is compiled into the client bundle and is therefore public — never put a
 * server secret in a `VITE_` variable. The Supabase *anon* key is designed to be public; it is
 * safe to ship precisely because Row Level Security on the database decides what it can touch.
 */

const read = (value: string | undefined): string => (value ?? '').trim();

/**
 * Reduces whatever was pasted into `VITE_SUPABASE_URL` to a bare origin.
 *
 * The client appends `/rest/v1/...` itself, so any path on the configured value breaks every
 * request. A URL pasted as ".../rest/v1" produced ".../rest/v1/rest/v1/bookings", which PostgREST
 * rejects with `PGRST125: Invalid path specified in request URL`. Taking the origin makes the app
 * tolerant of a trailing slash, an included REST path, or a missing protocol.
 */
const toOrigin = (raw: string | undefined): string => {
  const value = read(raw);
  if (!value) return '';

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    console.error('[Luan] VITE_SUPABASE_URL inválida, ignorando:', value);
    return '';
  }
};

export const SUPABASE_URL = toOrigin(import.meta.env.VITE_SUPABASE_URL);
export const SUPABASE_ANON_KEY = read(import.meta.env.VITE_SUPABASE_ANON_KEY);

/**
 * Cloud persistence is only used when both Supabase variables are present. Absent either one,
 * the app transparently falls back to per-device localStorage, so the build never breaks and the
 * demo keeps working before the database is wired up.
 */
export const IS_CLOUD_ENABLED = SUPABASE_URL !== '' && SUPABASE_ANON_KEY !== '';

// Cancellations/bookings send nothing server-side any more — the admin reviews and sends the
// WhatsApp cancellation draft manually. The client-side EmailJS / Formspree plumbing was removed.

/**
 * Backend (Supabase Edge Functions) base URL. Empty while the backend isn't deployed; the app's
 * simulated Pix flow doesn't need it. Push notifications do — it's where `save-push-subscription`
 * lives.
 */
export const API_BASE_URL = toOrigin(import.meta.env.VITE_API_BASE_URL);
export const IS_BACKEND_ENABLED = API_BASE_URL !== '';

/**
 * VAPID public key for Web Push. Both this and the backend base URL must be present for the
 * admin's "Ativar notificações" control to do anything real.
 */
export const VAPID_PUBLIC_KEY = read(import.meta.env.VITE_VAPID_PUBLIC_KEY);
export const IS_PUSH_ENABLED = IS_BACKEND_ENABLED && VAPID_PUBLIC_KEY !== '';
