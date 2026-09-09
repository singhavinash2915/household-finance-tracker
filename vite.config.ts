import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// For GitHub Pages project sites the app is served from
// https://<user>.github.io/<repo>/ so assets must be requested from /<repo>/.
// Override at build time with:  BASE_PATH=/my-repo-name/ npm run build
const base = process.env.BASE_PATH ?? '/household-finance-tracker/'

export default defineConfig({
  base,
  plugins: [
    react(),
    // Installable on a phone's home screen, and fully usable offline: the app
    // shell is precached, and there is no API to fall back to anyway.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['apple-touch-icon.png', 'icon.svg'],
      manifest: false, // public/manifest.webmanifest is the source of truth
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      devOptions: { enabled: false },
    }),
  ],
})
