import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icons/*.png'],
      // includeAssets: ['favicon-qufree.png', 'icons-qufree/*.png'],
      includeAssets: ['favicon-qufree-teal.png', 'icons-qufree-teal/*.png'],
      manifest: {
        // name: 'Qunjee — Super Lifestyle Platform',
        name: 'Qufree — Find any business by its number',
        // short_name: 'Qunjee - PWA',
        short_name: 'Qufree',
        // description: 'Restaurants | Travel | Salon | Wedding | Health | Education',
        description: 'Find any business by its number on Qufree and book instantly.',
        // theme_color: '#1C223F',
        // theme_color: '#FCA206',
        theme_color: '#1B5566',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        // start_url: '/index',
        start_url: '/find-business',
        icons: [
          // { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          // { src: '/icons-qufree/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/icons-qufree-teal/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
          // { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          // { src: '/icons-qufree/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/icons-qufree-teal/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
          // { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          // { src: '/icons-qufree/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons-qufree-teal/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          // { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          // { src: '/icons-qufree/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons-qufree-teal/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          // { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          // { src: '/icons-qufree/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons-qufree-teal/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          // { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          // { src: '/icons-qufree/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons-qufree-teal/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          // { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          // { src: '/icons-qufree/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons-qufree-teal/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          // { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          // { src: '/icons-qufree/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons-qufree-teal/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            // name: 'Browse Businesses',
            name: 'Find a Business',
            // short_name: 'Browse',
            short_name: 'Find',
            // url: '/index',
            url: '/find-business',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'My Appointments',
            short_name: 'Bookings',
            url: '/index/my-appointments',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
          },
          {
            name: 'Admin Dashboard',
            short_name: 'Admin',
            url: '/admin/dashboard',
            icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Deliberately NOT caching *.googleapis.com generally — that used to
        // include firestore.googleapis.com, identitytoolkit.googleapis.com,
        // etc. (Firebase's own SDK traffic), which meant Auth/Firestore
        // responses could be served stale from the service worker's Cache
        // Storage — invisible to a normal hard-refresh (Ctrl+Shift+R only
        // busts the HTTP cache, not an active SW's Cache Storage) and
        // completely bypassing whatever firestore.rules says right now.
        // No app code calls googleapis.com directly (confirmed via grep) —
        // this rule only ever existed to catch Firebase's own requests it
        // should never have touched. Firestore/Auth already have their own
        // robust offline-cache/sync layer built into the SDK; caching their
        // network layer again here was actively harmful, not redundant.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 31536000 },
            },
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
            },
          },
          {
            // Fixed-name images (banners, icons) can be overwritten in place
            // on deploy — CacheFirst would keep serving the old bytes for up
            // to 30 days since the URL never changes. StaleWhileRevalidate
            // still serves instantly from cache but refetches in the
            // background on every visit, so an overwrite shows up next load.
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-images',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    cssCodeSplit: true,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor:   ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/messaging'],
          ui:       ['lucide-react', 'react-hot-toast', 'date-fns'],
        },
      },
    },
  },
})
