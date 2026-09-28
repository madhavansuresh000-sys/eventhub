import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // send /api/... requests to Spring Boot during development
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
