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
          // Split heavy, stable vendors into their own long-cache chunks so the
          // main app bundle stays small and browser caching survives app-only edits.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
            if (
              id.includes('recharts') ||
              /[\\/]d3(-[a-z]+)?[\\/]/.test(id) ||
              id.includes('victory-vendor') ||
              id.includes('internmap')
            )
              return 'charts';
            if (
              /(react-markdown|remark|rehype|micromark|mdast|hast|unist|vfile|property-information|character-entities|decode-named-character-reference|comma-separated-tokens|space-separated-tokens)/.test(
                id,
              )
            )
              return 'markdown';
            if (
              id.includes('react-router') ||
              id.includes('react-dom') ||
              id.includes('/scheduler/') ||
              /[\\/]react[\\/]/.test(id)
            )
              return 'react-vendor';
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
