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

  // Basic middleware
  app.use(cors());
  app.use(express.json());

  // Global logger
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  const KEY = process.env.GEMINI_API_KEY;
  console.log("Gemini API Key status:", KEY ? `Exists (starts with ${KEY.substring(0, 4)})` : "MISSING");
  const genAI = KEY ? new GoogleGenerativeAI(KEY) : null;

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", keyExists: !!KEY });
  });

  // Explicitly handle ALL methods for this route to catch 405s
  app.all('/api/generate-questions', async (req, res) => {
    console.log(`=== ROUTE HIT: ${req.method} /api/generate-questions ===`);
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      console.warn(`WARNING: Received ${req.method} instead of POST`);
      return res.status(405).json({ error: "Bu endpoint faqat POST so'rovlarini qabul qiladi." });
    }

    const { text, numQuestions, difficulty, language } = req.body;
    console.log('Request body keys:', Object.keys(req.body || {}));

    try {
      const targetCount = numQuestions || 5;
      
      if (!text || text.trim().length < 50) {
        return res.status(400).json({ error: 'Matn juda qisqa. Kamida 50 ta belgi kerak.' });
      }
      
      if (!KEY || !genAI) {
        return res.status(500).json({ error: 'API kaliti sozlanmagan' });
      }

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `You are an expert Uzbek professor creating multiple-choice questions for university exams (HEMIS format). Generate exactly ${targetCount} questions from the following text. 
Difficulty: ${difficulty || 'Normal'}. Language: ${language || 'Uzbek'}.

Output format exactly like this for EACH question:

[Question Stem Here]
====
# Correct option
====
Distractor 1
====
Distractor 2
====
Distractor 3
++++

Rules:
1. Each question block MUST end with ++++.
2. Inside each block, the question stem and each option are separated by ====.
3. Exactly 4 options per question, only one correct (marked with # at the start).
4. Distractors must be plausible and from the same topic.
5. Vary the position of the correct answer.
6. Write in proper academic Uzbek.
7. Use straight apostrophes (') for o' and g'.

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
        count: questions.length 
      });
      
    } catch (error: any) {
      console.error('Gemini error:', error.message);
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
      const options = parts.slice(1);
      const correctIndex = options.findIndex(o => o.startsWith('#'));
      
      if (correctIndex === -1) continue;
      
      // Clean up options
      const cleanedOptions = options.map(o => o.replace(/^#\s*/, ''));
      
      questions.push({
        text: stem,
        options: cleanedOptions,
        correctIndex: correctIndex,
        difficulty: 'orta',
        bloomsLevel: 'Understand',
        topic: 'General'
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
