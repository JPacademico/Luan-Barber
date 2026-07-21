import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Two HTML entry points for one SPA. `admin.html` exists so iOS Safari sees the admin
      // manifest in the document it actually loaded — it does not re-read a `rel="manifest"` tag
      // that React swaps in later, which made "Adicionar à Tela de Início" install the public app
      // from /admin. Both documents boot the same bundle; the router decides what renders.
      // vercel.json rewrites /admin* to /admin.html to match.
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
