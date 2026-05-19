import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'api-server',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/generate-questions' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { text, numQuestions, difficulty, language } = JSON.parse(body);
                  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
                  
                  if (!apiKey) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not set' }));
                    return;
                  }

                  const genAI = new GoogleGenerativeAI(apiKey);
                  
                  const targetCount = numQuestions || 5;
                  const prompt = `Generate exactly ${targetCount} multiple-choice questions from the following text. Difficulty: ${difficulty || 'Normal'}. Language: ${language || 'Uzbek'}.
Output format exactly like this:
====
Question stem
++++
A) Option A
B) Option B
C) Option C
D) Option D
#B
DIFFICULTY: ${difficulty || 'Normal'}
BLOOMS: Understand
TOPIC: General
++++
(etc)`;

                  const modelsToTry = [
                    'gemini-1.5-flash-latest',
                    'gemini-1.5-flash-001',
                    'gemini-1.5-pro',
                    'gemini-2.0-flash'
                  ];

                  let result = null;
                  let lastError = null;

                  for (const modelName of modelsToTry) {
                    try {
                      console.log(`[Dev API] Attempting model: ${modelName}`);
                      const model = genAI.getGenerativeModel({ model: modelName });
                      result = await model.generateContent(prompt);
                      if (result && result.response) {
                        console.log(`[Dev API] Success with ${modelName}`);
                        break;
                      }
                    } catch (err: any) {
                      console.warn(`[Dev API] Model ${modelName} failed:`, err.message);
                      lastError = err;
                    }
                  }

                  if (!result) {
                    throw new Error(`Fallback failed: ${lastError?.message}`);
                  }

                  const responseText = result.response.text();
                  
                  // Simple parser for the preview
                  const blocks = responseText.split('++++').filter(b => b.trim());
                  const questions = blocks.map(block => {
                    const parts = block.split('====').map(p => p.trim()).filter(p => p);
                    if (parts.length < 2) return null;
                    const stem = parts[0];
                    const rest = parts[1];
                    const lines = rest.split('\n').map(l => l.trim()).filter(l => l);
                    const optionsLines = lines.filter(l => /^[A-D]\)/.test(l));
                    const correctLine = lines.find(l => l.startsWith('#'));
                    let correctIndex = 0;
                    if (correctLine) {
                      const letter = correctLine.replace('#', '').trim().toUpperCase();
                      correctIndex = ['A', 'B', 'C', 'D'].indexOf(letter);
                    }
                    return { text: stem, options: optionsLines.map(l => l.replace(/^[A-D]\)\s*/, '')), correctIndex };
                  }).filter(q => q);

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, questions }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
