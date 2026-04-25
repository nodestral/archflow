import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'demo',
  server: {
    host: '0.0.0.0',
    port: 3002,
    allowedHosts: ['archflow.nodestral.web.id'],
  },
  build: {
    outDir: '../demo-dist',
  },
});
