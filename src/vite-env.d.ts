/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Password for the /admin gate. Optional — falls back to the default in constants/defaults.ts.
   * Note this is compiled into the client bundle and is therefore public; see the comment there.
   */
  readonly VITE_ADMIN_PASSWORD?: string;

  /** Supabase project URL, e.g. https://xxxx.supabase.co. Enables cloud booking sync. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon/public key. Safe to ship; protected by Row Level Security. */
  readonly VITE_SUPABASE_ANON_KEY?: string;

  /**
   * Base URL of the backend (Supabase Edge Functions). Empty = backend not deployed yet; the
   * app keeps its current simulated Pix / client-side notification behaviour. See BACKEND_PLAN.md.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
