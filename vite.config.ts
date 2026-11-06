/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Served from https://joaoferrari12.github.io/vancouver-public-art/
  base: process.env.VITE_BASE ?? '/vancouver-public-art/',
  build: {
    // Leaflet in its own chunk: the list and filters paint before the map library arrives.
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'leaflet', test: /node_modules[\\/](leaflet|react-leaflet|@react-leaflet)/ }] } } },
  },
  test: {
    // A machine with NODE_ENV=production set globally would load the production build of React, which has no act(); pin it.
    env: { NODE_ENV: 'test' },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
  },
})
