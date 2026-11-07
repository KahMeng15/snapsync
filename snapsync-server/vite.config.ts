import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'snapsync Operator',
        short_name: 'snapsync',
        description: 'snapsync - Self-Hosted Photo Booth Operator Hub',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'any',
        start_url: process.env.VITE_BASE_URL || '/',
        scope: process.env.VITE_BASE_URL || '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['assets/**'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//, /^\/photos\//, /^\/share\//, /^\/internal\//],
      },
    }),
  ],
  root: './frontend',
  envDir: '../..',
  base: process.env.VITE_BASE_URL || '/',
  build: {
    outDir: '../public',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia', 'axios', 'socket.io-client'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src'),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
    port: 5173,
    proxy: {
      [`${process.env.VITE_BASE_URL || '/'}api`]: {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_BASE_URL || '/'}`), '/')
      },
      [`${process.env.VITE_BASE_URL || '/'}socket.io`]: {
        target: 'http://127.0.0.1:3000',
        ws: true,
        rewrite: (path) => path.replace(new RegExp(`^${process.env.VITE_BASE_URL || '/'}`), '/')
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        ws: true,
      },
    },
  },
})
