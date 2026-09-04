import { defineConfig, loadEnv, transformWithEsbuild } from 'vite';
import react from '@vitejs/plugin-react';

function resolveProxyTarget(env) {
  const raw =
    env.VITE_API_URL ||
    env.REACT_APP_API_URL ||
    'http://127.0.0.1:8010';
  return raw.replace(/^wss?:\/\//, 'http://');
}

function buildLegacyReactAppDefines(env) {
  const define = {
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
  };

  Object.entries(env).forEach(([key, value]) => {
    if (!key.startsWith('REACT_APP_')) return;
    define[`process.env.${key}`] = JSON.stringify(value);
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  });

  return define;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = resolveProxyTarget(env);

  return {
    plugins: [
      {
        name: 'treat-js-files-as-jsx',
        enforce: 'pre',
        async transform(code, id) {
          if (!id.includes('/src/') || !id.endsWith('.js')) return null;
          return transformWithEsbuild(code, id, {
            loader: 'jsx',
            jsx: 'automatic',
          });
        },
      },
      react({ include: /\.[jt]sx?$/ }),
    ],
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    define: buildLegacyReactAppDefines(env),
    build: {
      // three.js alone is ~665 kB; keep the warning meaningful for app regressions
      // without flagging the intentionally-large vendor split below.
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          hoistTransitiveImports: false,
          // Split heavy, stable vendors into their own long-cache chunks so the
          // main app bundle stays small and browser caching survives app-only edits.
          manualChunks(id) {
            // Keep Vite's import() preload helper off the three.js chunk so
            // Unified Theory does not statically download 700kB+ before paint.
            if (id.includes('preload-helper')) return 'preload-helper';
            if (!id.includes('node_modules')) return undefined;
            // drei's three-ecosystem dependencies must ride with three, or
            // Rollup reports a three -> vendor -> three circular chunk.
            if (
              /[\\/]node_modules[\\/]three([\\/]|$)/.test(id) ||
              id.includes('@react-three') ||
              /[\\/]node_modules[\\/](three-stdlib|three-mesh-bvh|troika-three-text|troika-three-utils|troika-worker-utils|@monogrid[\\/]gainmap-js|maath|meshline|camera-controls|stats-gl|stats\.js|detect-gpu|glsl-noise|suspend-react|zustand|tunnel-rat|react-composer|@react-spring|@use-gesture|hls\.js|@mediapipe|its-fine|react-reconciler|webgl-sdf-generator|bidi-js)([\\/]|$)/.test(id)
            ) {
              return 'three';
            }
            // A single vendor chunk. Splitting react/mui/charts/markdown
            // created Rollup circular chunks and a TDZ crash
            // (`Cannot access 'P' before initialization`) that white-screened
            // the production SPA.
            return 'vendor';
          },
        },
      },
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
        '/ws': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: true,
    },
  };
});
