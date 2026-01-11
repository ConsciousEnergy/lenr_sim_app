import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: "**/*.{jsx,js}", // Tell React plugin to process JSX in JS files
    }),
  ],
  server: {
    port: 3000,
    hmr: {
      overlay: true, // Show errors in overlay
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  esbuild: {
    jsx: 'automatic',
  },
  clearScreen: false, // Don't clear the console on server restart
  // Explicitly disable caching to ensure all changes are picked up
  optimizeDeps: {
    force: true,
  },
}); 