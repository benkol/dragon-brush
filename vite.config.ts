import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { VitePWA } from 'vite-plugin-pwa';

// `npm run dev:phone` uses mode "https" so a phone on the same Wi-Fi can open
// the camera (getUserMedia requires a secure context).
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString().slice(0, 16)),
  },
  plugins: [
    react(),
    mode === 'https' ? basicSsl() : null,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      workbox: {
        // Voice clips are small (~10 KB each), so they work offline too.
        globPatterns: ['**/*.{js,css,html,svg,png}', 'voice/**/*.{mp3,json}'],
        globIgnores: ['mediapipe/**'],
        // Face tracking runtime and model (~10 MB) are cached the first time
        // brushing starts instead of on install.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/mediapipe/') || url.hostname === 'storage.googleapis.com',
            handler: 'CacheFirst',
            options: { cacheName: 'face-tracking', expiration: { maxEntries: 10 } },
          },
        ],
      },
      manifest: {
        name: 'Dragon Brush',
        short_name: 'Dragon Brush',
        description: 'Brush your teeth with a fire-breathing dragon!',
        theme_color: '#ff7a59',
        background_color: '#fff6e9',
        display: 'fullscreen',
        orientation: 'portrait',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
    }),
  ],
  build: {
    // three.js is in the main chunk for the dragon previews on every screen.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    env: { TZ: 'UTC' },
  },
}));
