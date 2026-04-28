import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const target = mode === 'development' ? 'http://localhost:8089' : 'https://api.merdeleine.com'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': { target, changeOrigin: true },
        '/orders': { target, changeOrigin: true },
        '/auth': { target, changeOrigin: true },
        '/oauth2': { target, changeOrigin: true },
        '/bff': { target, changeOrigin: true },
        '/logout': { target, changeOrigin: true },
      },
      allowedHosts: [
        'merdeleine.com',
        'www.merdeleine.com'
      ]
    },
  }
})
