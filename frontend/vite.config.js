import react from '@vitejs/plugin-react'
import { env } from 'node:process'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': env.SO_API_PROXY_TARGET || 'http://localhost:8080',
    },
  },
  // Vite hereda server.proxy en preview si no se configura explícitamente.
  preview: { proxy: {} },
})
