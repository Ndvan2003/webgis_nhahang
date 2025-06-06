import { defineConfig } from 'vite';

export default {
  server: {
    proxy: {
      '/geoserver': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geoserver/, '/geoserver')
      }
    }
  }
}