import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { aiConfig } from './server/deepseek.ts';
import { createAiHandler } from './server/handler.ts';

function deepSeekPlugin(): Plugin {
  let handler: ReturnType<typeof createAiHandler>;
  return {
    name: 'climbmate-private-ai',
    configResolved(config) {
      const env = { ...loadEnv(config.mode, config.envDir, ''), ...process.env };
      handler = createAiHandler(aiConfig(env));
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        void handler(request, response)
          .then((handled) => {
            if (!handled) next();
          })
          .catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        void handler(request, response)
          .then((handled) => {
            if (!handled) next();
          })
          .catch(next);
      });
    },
  };
}
export default defineConfig({ plugins: [react(), deepSeekPlugin()] });
