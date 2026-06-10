import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // autoUpdate: new SW auto-activates via skipWaiting+clientsClaim.
      // The controllerchange listener in main.tsx then reloads the page
      // so users always get the new assets immediately.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Window World Assistant',
        short_name: 'WWA Field',
        description: 'Window World sales rep field app — works offline',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/mobile',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache static assets (JS, CSS, fonts, images) — NOT html (served NetworkFirst below)
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2,xlsx}'],
        runtimeCaching: [
          {
            // Navigation (HTML) — always try network first so phone gets latest index.html
            // Falls back to cache when offline. This prevents stale SW from serving old app.
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'navigation-v1',
              networkTimeoutSeconds: 3,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Appointments + openings: cache-first with network update in background
            // IMPORTANT: Only cache GET requests — PATCH/DELETE (archive/delete) must go NetworkOnly
            urlPattern: ({ request, url }: { request: Request; url: URL }) =>
              request.method === 'GET' && /\/api\/(appointments|openings|customers)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-appointments-v3',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Pricing + rules: cache for 24h — GET only
            urlPattern: ({ request, url }: { request: Request; url: URL }) =>
              request.method === 'GET' && /\/api\/(pricing|rules|measurement-rules)/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-config',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Dashboard + quality scores: network-first but fall back to cache
            urlPattern: /\/api\/(dashboard|mobile)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dashboard',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Forms auto-fill: cache so order form loads offline
            urlPattern: /\/api\/forms/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-forms',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Voice/parse: network-only (requires AI, graceful offline fail)
            urlPattern: /\/api\/(voice|exports)/,
            handler: 'NetworkOnly',
          },
        ],
        // Navigate to index.html for SPA routes — offline fallback only
        // (NetworkFirst handler above handles online navigation)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        // Cache bust: 2026-05-26-v1 — fix PATCH/DELETE blocked by SW StaleWhileRevalidate
      },
      devOptions: {
        enabled: false, // don't run SW in dev mode (causes confusion)
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      }
    }
  },
  test: {
    exclude: ['tests/e2e/**', 'node_modules/**', '**/*.spec.ts'],
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy PDF/canvas libraries into separate chunks (~593KB combined)
          // These are only needed during export — don't block initial load
          'vendor-pdf': ['jspdf'],
          'vendor-canvas': ['html2canvas'],
          // Split React core for better caching (changes less often)
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});

// Cache bust: 2026-05-25-v5 — fix archive/delete buttons dropped by 4s polling re-render race on iOS
