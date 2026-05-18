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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Quyidagi matndan ${count} ta test savoli yaratib ber. Savollar O'zbek tilida bo'lsin.
        Qiyinchilik darajalari (oson, orta, qiyin) va Bloom taksonomiyasi (Remember, Understand, Apply, Analyze) bo'yicha taqsimlansin.
        Har bir savol uchun quyidagi JSON formatda javob ber:
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
              "sourceReference": "matndan olingan qisqa parcha (max 80 belgi)"
            }
          ]
        }
        
        Matn:
        ${text}`,
        config: {
          responseMimeType: "application/json",
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

      const data = JSON.parse(response.text || "{}");
      
      // Calculate summary
      const difficultyCounts = { oson: 0, orta: 0, qiyin: 0 };
      data.questions?.forEach((q: any) => {
        if (q.difficulty in difficultyCounts) {
          difficultyCounts[q.difficulty as keyof typeof difficultyCounts]++;
        }
      });

      res.json({
        ...data,
        summary: {
          total: data.questions?.length || 0,
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
