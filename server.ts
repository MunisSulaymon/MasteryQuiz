import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  console.log("Gemini API Key status:", GEMINI_KEY ? `Exists (starts with ${GEMINI_KEY.substring(0, 4)})` : "MISSING");

  const genAI = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY) : null;

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", keyExists: !!GEMINI_KEY });
  });

  // POST /api/generate-questions
  app.post('/api/generate-questions', express.json(), async (req, res) => {
    console.log('=== GENERATE ROUTE HIT ===');
    console.log('Method:', req.method);
    console.log('Body:', JSON.stringify(req.body).substring(0, 200));
    
    try {
      const { text, count, numQuestions, difficulty, language } = req.body;
      const targetCount = count || numQuestions || 5;
      
      console.log(`Processing generation for ${targetCount} questions. Language: ${language}, Difficulty: ${difficulty}`);
      
      // Validate input
      if (!text || text.trim().length < 50) {
        return res.status(400).json({ 
          error: 'Matn juda qisqa. Kamida 50 ta belgi kerak.' 
        });
      }
      
      // Check API key
      if (!GEMINI_KEY) {
        console.error('GEMINI_API_KEY is not set');
        return res.status(500).json({ 
          error: 'API kaliti sozlanmagan' 
        });
      }
      
      console.log('API Key starts with:', GEMINI_KEY.substring(0, 4));
      
      if (!genAI) {
        return res.status(500).json({ error: 'AI servisi tayyor emas' });
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Generate exactly ${targetCount} multiple-choice questions from the following text in HEMIS format.
Language: ${language || 'Uzbek'}.
Difficulty: ${difficulty || 'medium'}.

HEMIS format rules:
1. Each question block is separated by ++++.
2. Inside each block, the question stem and each option are separated by ====.
3. The CORRECT option MUST start with a # symbol.
4. Provide 4 options for each question.

Example:
Savol matni bu yerda
====
# To'g'ri javob
====
Noto'g'ri javob 1
====
Noto'g'ri javob 2
====
Noto'g'ri javob 3
++++

Text to process:
${text}`;
      
      console.log('Calling Gemini...');
      const result = await model.generateContent(prompt);
      console.log('Gemini response received');
      
      const responseText = result.response.text();
      console.log('Response length:', responseText.length);
      
      if (!responseText || responseText.trim().length === 0) {
        return res.status(500).json({ 
          error: 'AI modeli bo\'sh javob qaytardi' 
        });
      }
      
      // Parse HEMIS format from response
      const questions = parseHemisResponse(responseText);
      
      if (questions.length === 0) {
        console.error("Failed to parse any questions from response:", responseText);
        return res.status(500).json({ error: "AI javobini o'qib bo'lmadi (parsing xatosi). Iltimos qaytadan urinib ko'ring." });
      }

      return res.json({ 
        success: true, 
        questions,
        count: questions.length,
        summary: {
          total: questions.length,
          difficultyCounts: { oson: questions.length, orta: 0, qiyin: 0 } // Mocked as the parser doesn't extract this
        }
      });
      
    } catch (error: any) {
      console.error('Gemini error:', error.message);
      console.error('Full error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        error: 'Generatsiya xatosi: ' + error.message 
      });
    }
  });

  // Helper to parse HEMIS format
  function parseHemisResponse(text: string) {
    const blocks = text.split('++++').filter(b => b.trim());
    const questions = [];
    
    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim()).filter(p => p);
      if (parts.length < 2) continue;
      
      const stem = parts[0];
      const rawOptions = parts.slice(1);
      
      // Find the correct option (starts with #)
      const correctIndex = rawOptions.findIndex(o => o.startsWith('#'));
      
      if (correctIndex === -1) continue;
      
      // Clean up options
      const options = rawOptions.map(o => o.replace(/^#\s*/, ''));
      
      questions.push({
        text: stem,
        options: options,
        correctIndex: correctIndex,
        difficulty: 'orta', // Default
        bloomsLevel: 'Understand', // Default
        topic: 'General', // Default
        confidenceScore: 85,
        sourceReference: stem.substring(0, 80)
      });
    }
    
    return questions;
  }


  app.all("/api/*", (req, res) => {
    console.warn(`API Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API yo'nalishi topilmadi: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
