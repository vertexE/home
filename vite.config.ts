import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src', filename: 'sw.ts',
    registerType: 'autoUpdate',
    injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,ico}'] },
    manifest: {
      id: './', name: 'Pocket', short_name: 'Pocket',
      description: 'A little home for your everyday lists.',
      start_url: './', scope: './', display: 'standalone',
      background_color: '#f5f3ee', theme_color: '#f5f3ee',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
  })],
});
