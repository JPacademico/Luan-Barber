/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Password for the /admin gate. Optional — falls back to the default in constants/defaults.ts.
   * Note this is compiled into the client bundle and is therefore public; see the comment there.
   */
  readonly VITE_ADMIN_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
