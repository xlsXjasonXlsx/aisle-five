import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Proxies /kroger-api/* → https://api-ce.kroger.com/*
      // Keeps credentials off the browser origin and avoids CORS issues.
      '/api/kroger': {
        target: 'https://api-ce.kroger.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kroger/, ''),
      },
      '/walmart-api': {
        target: 'https://api.walmart.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/walmart-api/, ''),
      },
    },
  },
})
