import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { generateAssistantReply } from './server/assistantHandler.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  if (env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }

  if (env.OPENAI_MODEL) {
    process.env.OPENAI_MODEL = env.OPENAI_MODEL;
  }

  return {
    plugins: [
      react(),
      {
        name: 'skill-sync-ai-assistant-api',
        configureServer(server) {
          server.middlewares.use('/api/assistant-chat', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed.' }));
              return;
            }

            try {
              const chunks = [];

              for await (const chunk of req) {
                chunks.push(chunk);
              }

              const body = chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString()) : {};
              const reply = await generateAssistantReply(body);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ reply }));
            } catch (error) {
              res.statusCode = error.status || 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error.message || 'Unexpected error.' }));
            }
          });
        },
      },
    ],
  };
})
