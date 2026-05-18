import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/generate-questions", async (req, res) => {
    const { text, count = 15 } = req.body;

    if (!text || text.length < 100) {
      return res.status(400).json({ error: "Matn juda qisqa. Kamida 100 ta belgi kerak." });
    }

    try {
      console.log("Generating questions for text length:", text.length);
      const startTime = Date.now();
      
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `Quyidagi matndan ${count} ta test savoli yaratib ber. Savollar O'zbek tilida bo'lsin.
            Har bir savol variantlari va to'g'ri javob indeksi bilan bo'lishi shart.
            
            Matn:
            ${text}` }]
          }
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctIndex: { type: Type.INTEGER },
                    difficulty: { type: Type.STRING, enum: ["oson", "orta", "qiyin"] },
                    bloomsLevel: { type: Type.STRING, enum: ["Remember", "Understand", "Apply", "Analyze"] },
                    topic: { type: Type.STRING },
                    confidenceScore: { type: Type.NUMBER },
                    sourceReference: { type: Type.STRING }
                  },
                  required: ["text", "options", "correctIndex", "difficulty", "bloomsLevel", "topic"]
                }
              }
            },
            required: ["questions"]
          }
        }
      });

      console.log(`Gemini responded in ${Date.now() - startTime}ms`);
      
      const responseText = response.text || '';
      
      if (!responseText) {
        console.error("Gemini response is empty. Response object:", JSON.stringify(response, null, 2));
        // Check if there are safety notice or other reasons
        const safetyDetails = response.candidates?.[0]?.finishReason;
        return res.status(500).json({ 
          error: "AI javob bermadi. Iltimos matnni qisqartirib yoki o'zgartirib ko'ring.",
          details: safetyDetails 
        });
      }

      console.log("Raw Response Preview:", responseText.substring(0, 500) + "...");
      
      let data;
      try {
        // Fallback for markdown blocks if they somehow appear
        const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
        data = JSON.parse(cleanedText);
      } catch (jsonErr) {
        console.error("Failed to parse Gemini response as JSON:", responseText);
        return res.status(500).json({ error: "AI javobini o'qib bo'lmadi (JSON error). Qayta urinib ko'ring." });
      }
      
      // Calculate summary
      const difficultyCounts = { oson: 0, orta: 0, qiyin: 0 };
      const questions = data.questions || [];
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
      if (err.message?.includes("quota")) {
        res.status(429).json({ error: "Kunlik limit tugadi. Ertaga yana urinib ko'ring yoki Premium tarifga o'ting." });
      } else {
        res.status(500).json({ error: "Xatolik yuz berdi. Qayta urinib ko'ring." });
      }
    }
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
