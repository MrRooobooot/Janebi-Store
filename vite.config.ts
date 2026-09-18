import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  // Force production semantics regardless of the ambient NODE_ENV inherited
  // from .env (NODE_ENV=development) — dev-mode builds ship jsxDEV + local
  // filePath leaks and bloat the bundle ~27%.
  process.env.NODE_ENV = 'production';
  return {
    mode,
    esbuild: {
      drop: mode === 'production' ? ['debugger'] : [],
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // react-dom + react/jsx-runtime must resolve to vendor-react —
              // framer-motion imports react/jsx-runtime, and if jsx-runtime lands in
              // the motion chunk the whole motion engine becomes an EAGER dep
              // (rolldown chunking artifact: eager index statically imports it).
              if (
                id.includes('react-dom') ||
                id.includes('react-router-dom') ||
                id.includes('jsx-runtime') ||
                id.includes('jsxDEV') ||
                /node_modules\/(react|react-dom|scheduler)\//.test(id)
              ) {
                return 'vendor-react';
              }
              // motion/framer NOT pinned to its own chunk: pinning makes the shared
              // jsx-runtime live in the motion chunk, dragging 130KB motion engine
              // into the eager payload. Without a manual chunk, rolldown puts motion
              // code only into the lazy chunks that import it.
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
