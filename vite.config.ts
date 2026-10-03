import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: { main: path.resolve(__dirname, 'index.html'), gameProposal: path.resolve(__dirname, 'game-proposal.html'), expansion: path.resolve(__dirname, 'expansion.html'), propertyPreview: path.resolve(__dirname, 'property-preview.html'), cityModelPreview: path.resolve(__dirname, 'city-model-preview.html'), cityGamePrototype: path.resolve(__dirname, 'city-game-prototype.html'), cozyPrototype: path.resolve(__dirname, 'cozy-prototype.html'), characterPreview: path.resolve(__dirname, 'character-preview.html'), castPreview: path.resolve(__dirname, 'cast-preview.html') },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Large model copies can briefly lock files on Windows; reload after changing assets.
      watch: { ignored: ['**/public/models/game-fit/**', '**/public/models/people-preview/**', '**/artifacts/**'] },
    },
  };
});

