import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // Set CORS headers for Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, numQuestions, difficulty, language } = req.body;
    
    if (!text || text.length < 50) {
      return res.status(400).json({ error: 'Matn juda qisqa. Kamida 50 ta belgi kerak.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('SERVER_ERROR: GEMINI_API_KEY is missing');
      return res.status(500).json({ error: 'API kaliti sozlanmagan (Internal Server Error)' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    const targetCount = numQuestions || 5;
    const targetDifficulty = difficulty || 'Normal';
    const targetLanguage = language || 'Uzbek';

    const prompt = `You are an expert ${targetLanguage} professor creating multiple-choice questions for university exams (HEMIS format). 
Generate exactly ${targetCount} questions from the following text. 
Difficulty: ${targetDifficulty}. 
Language: ${targetLanguage}.

Output format exactly like this for EACH question:

====
Question stem here
++++
A) Option A
B) Option B
C) Option C
D) Option D
#C
DIFFICULTY: ${targetDifficulty}
BLOOMS: Understand
TOPIC: General

Rules:
1. Each question block MUST end with ++++.
2. Inside each block, the question stem and options are separated as shown.
3. The correct answer MUST start with # followed by the letter (e.g. #C).
4. Exactly 4 options per question.
5. Distractors must be plausible.
6. Write in proper academic ${targetLanguage}.
7. Use straight apostrophes (') for o' and g' if in Uzbek.

Text to process:
${text}`;

    const modelsToTry = [
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash-001',
      'gemini-1.5-pro',
      'gemini-2.0-flash'
    ];

    let result = null;
    let lastError = null;
    let successfulModel = '';

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result && result.response) {
          successfulModel = modelName;
          console.log(`Success with model: ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`Model ${modelName} failed:`, err.message);
        lastError = err;
        // Continue to next model if this one failed (e.g. 404 or other transient error)
      }
    }

    if (!result) {
      throw new Error(`Barcha AI modellari xatolik berdi: ${lastError?.message || 'Noma\'lum xatolik'}`);
    }

    const responseText = result.response.text();

    if (!responseText || responseText.trim().length === 0) {
      return res.status(500).json({ error: 'AI bo\'sh javob qaytardi' });
    }

    // Parse HEMIS format
    const blocks = responseText.split('++++').filter(b => b.trim());
    const questions = [];

    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim()).filter(p => p);
      if (parts.length < 2) continue;

      const stem = parts[0];
      const rest = parts[1]; // Options and metadata

      const lines = rest.split('\n').map(l => l.trim()).filter(l => l);
      
      // Extract options A-D
      const optionsLines = lines.filter(l => /^[A-D]\)/.test(l));
      
      // Find the correct answer marked with #
      const correctLine = lines.find(l => l.startsWith('#'));
      let correctIndex = -1;
      if (correctLine) {
        const correctLetter = correctLine.replace('#', '').trim().toUpperCase();
        correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
      }

      if (optionsLines.length >= 4 && correctIndex !== -1) {
        questions.push({
          text: stem,
          options: optionsLines.map(l => l.replace(/^[A-D]\)\s*/, '')),
          correctIndex: correctIndex
        });
      }
    }

    if (questions.length === 0) {
      console.error('PARSE_ERROR: Could not parse questions from response:', responseText);
      return res.status(500).json({ error: 'AI javobini o\'qib bo\'lmadi (parsing xatosi)' });
    }

    return res.status(200).json({ success: true, questions });

  } catch (error) {
    console.error('GEMINI_ERROR:', error);
    return res.status(500).json({ error: 'Generatsiya xatosi: ' + error.message });
  }
}
