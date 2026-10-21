import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          saveSlots: path.resolve(__dirname, 'save-slots.html'),
          unityGame: path.resolve(__dirname, 'unity-game.html'),
          unityComparison: path.resolve(__dirname, 'unity-comparison.html'),
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Large model copies can briefly lock files on Windows; reload after changing assets.
      watch: { ignored: file => {
        const normalized=file.replace(/\\/g,'/');
        return /(?:^|\/)(?:UnityComparison|artifacts)(?:\/|$)/.test(normalized)
          || /\/public\/unity-[^/]+(?:\/|$)/.test(normalized)
          || /\/public\/models\/(?:game-fit|people-preview)(?:\/|$)/.test(normalized);
      } },
    },
  };
});

