/**
 * Centralised, typed access to the `VITE_*` environment variables.
 *
 * Everything here is compiled into the client bundle and is therefore public — never put a
 * server secret in a `VITE_` variable. The Supabase *anon* key is designed to be public; it is
 * safe to ship precisely because Row Level Security on the database decides what it can touch.
 */

const read = (value: string | undefined): string => (value ?? '').trim();

// Strip trailing slashes: a pasted "https://x.supabase.co/" would otherwise produce a broken
// "https://x.supabase.co//rest/v1" and every request would 404.
export const SUPABASE_URL = read(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, '');
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
