import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/catalog": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/api/order": {
        target: "http://localhost:8083",
        changeOrigin: true,
      },
      "/api/batches": {
        target: "http://localhost:8085",
        changeOrigin: true,
      },
      "/api/payment": {
        target: "http://localhost:8084",
        changeOrigin: true,
      },
      "/api/batch-counters": {
        target: "http://localhost:8087",
        changeOrigin: true,
      },
    },
  },
})
