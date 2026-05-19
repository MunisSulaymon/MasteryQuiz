import { ExamQuestion } from '../types';

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  questions: Partial<ExamQuestion>[];
  errors: ParseError[];
}

export const parseHemisText = (text: string): ParseResult => {
  const questions: Partial<ExamQuestion>[] = [];
  const errors: ParseError[] = [];
  
  if (!text.trim()) return { questions, errors };

  const questionChunks = text.split('++++');
  
  questionChunks.forEach((chunk, chunkIdx) => {
    const trimmedChunk = chunk.trim();
    if (!trimmedChunk) return;

    const parts = trimmedChunk.split('====').map(p => p.trim());
    
    // We expect 1 stem + at least some options
    if (parts.length < 2) {
      errors.push({
        line: text.substring(0, text.indexOf(chunk)).split('\n').length,
        message: `Savol ${chunkIdx + 1}: Noto'g'ri format yoki variantlar yetishmayapti.`
      });
      return;
    }

    const stem = parts[0];
    const optionsRaw = parts.slice(1);
    
    const options: string[] = [];
    let correctIndex = -1;

    optionsRaw.forEach((opt, optIdx) => {
      if (opt.startsWith('#')) {
        correctIndex = optIdx;
        options.push(opt.substring(1).trim());
      } else {
        options.push(opt);
      }
    });

    if (options.length !== 4) {
      errors.push({
        line: text.substring(0, text.indexOf(chunk)).split('\n').length,
        message: `Savol ${chunkIdx + 1}: Variantlar soni 4 ta bo'lishi kerak (hozir ${options.length} ta).`
      });
    }

    if (correctIndex === -1) {
      errors.push({
        line: text.substring(0, text.indexOf(chunk)).split('\n').length,
        message: `Savol ${chunkIdx + 1}: To'g'ri javob belgilanmagan (# bilan boshlang).`
      });
    }

    questions.push({
      text: stem,
      options: options.slice(0, 4), // Take up to 4
      correctIndex: correctIndex,
      difficulty: 'orta',
      topic: null,
      source_platform: 'exam',
      origin: 'hemis-import'
    });
  });

  return { questions, errors };
};
