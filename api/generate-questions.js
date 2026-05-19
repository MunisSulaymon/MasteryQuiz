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
      return res.status(400).json({ error: 'Matn juda qisqa' });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API kaliti topilmadi' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Fetch available models
    const modelsResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey
    );
    const modelsData = await modelsResponse.json();
    const availableModels = modelsData.models || [];

    // Find a suitable model
    let modelName = null;
    for (const m of availableModels) {
      if (m.name.includes('gemini') && 
          m.supportedGenerationMethods?.includes('generateContent')) {
        if (m.name.includes('flash')) {
          modelName = m.name.replace('models/', '');
          break;
        }
      }
    }
    if (!modelName) {
      // fallback to any gemini model
      const geminiModel = availableModels.find(m => 
        m.name.includes('gemini') && 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      if (geminiModel) modelName = geminiModel.name.replace('models/', '');
    }
    if (!modelName) {
      return res.status(500).json({ error: 'No suitable Gemini model found' });
    }

    console.log('Selected model:', modelName);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are an expert ${language || 'Uzbek'} professor creating multiple-choice questions for university exams (HEMIS format). 
Generate exactly ${numQuestions || 5} questions from the following text. 
Difficulty: ${difficulty || 'Normal'}. Language: ${language || 'Uzbek'}.

Output format exactly like this for EACH question:

Question stem here
====
#Correct option here
====
Distractor 1 here
====
Distractor 2 here
====
Distractor 3 here
++++

Rules:
1. Each question block MUST end with ++++.
2. Inside each block, the question stem and each option are separated by ====.
3. The CORRECT option MUST start with a # symbol.
4. Exactly 4 options per question.
5. Vary the position of the correct answer (it shouldn't always be first).
6. Write in proper academic ${language || 'Uzbek'}.
7. Use straight apostrophes (') for o' and g' if in Uzbek.

Text to process:
${text}`;

    console.log(`Generating content with chosen model...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    if (!responseText) {
      return res.status(500).json({ error: 'AI bo\'sh javob qaytardi' });
    }

    // Parse HEMIS format
    const blocks = responseText.split('++++').filter(b => b.trim());
    const questions = [];
    for (const block of blocks) {
      const parts = block.split('====').map(p => p.trim()).filter(p => p);
      if (parts.length < 2) continue;
      
      const stem = parts[0];
      const options = parts.slice(1);
      
      const correctIndex = options.findIndex(o => o.startsWith('#'));
      if (correctIndex === -1) continue;
      
      const cleanedOptions = options.map(o => o.replace(/^#\s*/, ''));
      
      questions.push({
        text: stem,
        options: cleanedOptions.slice(0, 4),
        correctIndex: correctIndex < 4 ? correctIndex : 0,
        difficulty: difficulty || 'orta',
        bloomsLevel: 'Understand',
        topic: 'General'
      });
    }

    if (questions.length === 0) {
      return res.status(500).json({ error: 'AI javobini o\'qishda xatolik yuz berdi.' });
    }

    return res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error('Gemini error:', error);
    return res.status(500).json({ error: error.message });
  }
}
