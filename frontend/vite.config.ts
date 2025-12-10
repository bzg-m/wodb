import preact from '@preact/preset-vite';
import { defineConfig, loadEnv } from 'vite';

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Map root FIREBASE_* env vars into Vite client envs so frontend code can
  // read import.meta.env.VITE_FIREBASE_* without duplicating values in files.
  const viteDefs: Record<string, string> = {};
  if (env.FIREBASE_PROJECT_ID) viteDefs['import.meta.env.VITE_FIREBASE_PROJECT_ID'] = JSON.stringify(env.FIREBASE_PROJECT_ID);
  if (env.FIREBASE_AUTH_EMULATOR_HOST) viteDefs['import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST'] = JSON.stringify(env.FIREBASE_AUTH_EMULATOR_HOST);

  return defineConfig({
    plugins: [preact()],
    define: viteDefs,
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:4000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  });
};
