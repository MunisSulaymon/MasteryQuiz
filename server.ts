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

  app.get("/api/generate-questions", (req, res) => {
    res.status(405).json({ error: "Bu endpoint faqat POST so'rovlarini qabul qiladi." });
  });

  app.post("/api/generate-questions", async (req, res) => {
    const { text, count = 15 } = req.body;
    console.log(`Received POST /api/generate-questions - Count: ${count}, Text length: ${text?.length}`);

    if (!GEMINI_KEY || !genAI) {
      console.error("Gemini API Key is missing");
      return res.status(500).json({ error: "Gemini API kaliti topilmadi yoki noto'g'ri. Iltimos administrator bilan bog'laning." });
    }

    if (!text || text.length < 10) { // Lowered for debugging
      return res.status(400).json({ error: "Matn juda qisqa. Kamida 100 ta belgi kerak." });
    }

    try {
      console.log("Generating questions using gemini-1.5-flash...");
      let startTime = Date.now();
      
      let model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
        }
      });

      const prompt = `Quyidagi matndan ${count} ta test savoli yaratib ber. Savollar O'zbek tilida bo'lsin.
      Har bir savol variantlari va to'g'ri javob indeksi bilan bo'lishi shart.
      
      JSON formatida qaytar:
      {
        "questions": [
          {
            "text": "savol matni",
            "options": ["variant A", "variant B", "variant C", "variant D"],
            "correctIndex": 0,
            "difficulty": "oson" | "orta" | "qiyin",
            "bloomsLevel": "Remember" | "Understand" | "Apply" | "Analyze",
            "topic": "mavzu nomi",
            "confidenceScore": 85,
            "sourceReference": "matndan olingan qisqa parcha"
          }
        ]
      }

      Matn:
      ${text}`;

      let result;
      try {
        result = await model.generateContent(prompt);
      } catch (flashErr) {
        console.warn("Gemini 1.5 Flash failed, trying Pro fallback...", flashErr);
        model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        result = await model.generateContent(prompt);
      }

      const response = await result.response;
      const responseText = response.text();

      console.log(`Gemini responded in ${Date.now() - startTime}ms`);
      
      if (!responseText || responseText.trim().length === 0) {
        console.error("Gemini response text is empty. Full response candidate:", JSON.stringify(response.candidates?.[0], null, 2));
        return res.status(500).json({ error: "AI javob bermadi (Javob matni bo'sh). Iltimos qaytadan urinib ko'ring." });
      }

      console.log("Raw Response Preview:", responseText.substring(0, 500) + "...");
      
      let data;
      try {
        const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
        data = JSON.parse(cleanedText);
      } catch (jsonErr) {
        console.error("Failed to parse Gemini response as JSON:", responseText);
        return res.status(500).json({ error: "AI javobini o'qib bo'lmadi (JSON format xatosi). Qayta urinib ko'ring." });
      }
      
      const questions = data.questions || [];
      if (questions.length === 0) {
        return res.status(500).json({ error: "AI savol yarata olmadi. Iltimos matnni o'zgartirib ko'ring." });
      }

      // Calculate summary
      const difficultyCounts = { oson: 0, orta: 0, qiyin: 0 };
      questions.forEach((q: any) => {
        if (q.difficulty in difficultyCounts) {
          difficultyCounts[q.difficulty as keyof typeof difficultyCounts]++;
        }
      });

      res.json({
        questions,
        summary: {
          total: questions.length,
          difficultyCounts
        }
      });
    } catch (err: any) {
      console.error("Gemini Error:", err);
      const errorMessage = err.message || "Xatolik yuz berdi.";
      
      if (errorMessage.includes("quota")) {
        return res.status(429).json({ error: "Kunlik limit tugadi. Ertaga yana urinib ko'ring." });
      }
      
      if (errorMessage.includes("API key not valid")) {
        return res.status(500).json({ error: "Gemini API kaliti noto'g'ri. Administrator bilan bog'laning." });
      }

      res.status(500).json({ 
        error: "AI Generation xatosi: " + errorMessage,
        details: err.toString()
      });
    }
  });

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
