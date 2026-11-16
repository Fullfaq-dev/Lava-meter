import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import meterSheetHandler from './api/read-meter-sheet.js'

function meterSheetApi() {
  return {
    name: 'meter-sheet-api',
    configureServer(server) {
      server.middlewares.use('/api/read-meter-sheet', (req, res) => {
        meterSheetHandler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
    meterSheetApi(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});