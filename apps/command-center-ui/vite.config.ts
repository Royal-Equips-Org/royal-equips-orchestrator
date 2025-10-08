/// <reference types="vite/client" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/command-center/',
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.REACT_APP_VERSION': JSON.stringify('3.0.0')
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: { 
    sourcemap: true,
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API routes
      '/v1': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      // Proxy health endpoints to backend
      '/health': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      '/healthz': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      '/readyz': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      '/liveness': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      '/readiness': {
        target: 'http://localhost:10000',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  }
})