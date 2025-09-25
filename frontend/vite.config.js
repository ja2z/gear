import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imageOptimizationPlugin } from './plugins/imageOptimization.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), imageOptimizationPlugin()],
  base: '/',
  server: {
    host: '0.0.0.0', // Allow connections from any IP address
    port: 5173, // Explicitly set port
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})