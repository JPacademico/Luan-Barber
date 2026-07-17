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

/** EmailJS credentials for the client-side cancellation email. All three are required. */
export const EMAILJS_SERVICE_ID = read(import.meta.env.VITE_EMAILJS_SERVICE_ID);
export const EMAILJS_TEMPLATE_ID = read(import.meta.env.VITE_EMAILJS_TEMPLATE_ID);
export const EMAILJS_PUBLIC_KEY = read(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export const IS_EMAILJS_ENABLED =
  EMAILJS_SERVICE_ID !== '' && EMAILJS_TEMPLATE_ID !== '' && EMAILJS_PUBLIC_KEY !== '';

/** Formspree endpoint (`https://formspree.io/f/xxxx`) — an alternative to EmailJS. */
export const FORMSPREE_ENDPOINT = read(import.meta.env.VITE_FORMSPREE_ENDPOINT);
export const IS_FORMSPREE_ENABLED = FORMSPREE_ENDPOINT !== '';

/**
 * Backend (Supabase Edge Functions) base URL. The single switch the future backend flips:
 * while empty, the app keeps its simulated Pix flow and client-side notification links; once
 * set, features migrate to real server endpoints one by one. See BACKEND_PLAN.md §2.2.
 */
export const API_BASE_URL = toOrigin(import.meta.env.VITE_API_BASE_URL);
export const IS_BACKEND_ENABLED = API_BASE_URL !== '';
