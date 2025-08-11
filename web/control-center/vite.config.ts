import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/command-center/',
  build: {
    outDir: '../../app/static',
    emptyOutDir: false // Don't empty entire static dir
  },
  server: {
    port: 3001,
    host: true
  }
})