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
   * app keeps its current simulated Pix behaviour and push notifications stay disabled.
   */
  readonly VITE_API_BASE_URL?: string;

  /** VAPID public key for Web Push, from `npx web-push generate-vapid-keys`. Enables push. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
