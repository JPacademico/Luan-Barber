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

  /** EmailJS credentials for client-side cancellation emails. */
  readonly VITE_EMAILJS_SERVICE_ID?: string;
  readonly VITE_EMAILJS_TEMPLATE_ID?: string;
  readonly VITE_EMAILJS_PUBLIC_KEY?: string;

  /** Formspree form endpoint — an alternative to EmailJS for cancellation emails. */
  readonly VITE_FORMSPREE_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
