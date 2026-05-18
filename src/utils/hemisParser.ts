/**
 * Utility to parse HEMIS format questions
 * 
 * Format:
 * Question text here
 * ====
 * Option A
 * ====
 * #Correct Option
 * ====
 * Option C
 * ====
 * Option D
 * ++++
 */

export interface HemisParsedQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  hemisRaw: string;
  difficulty: 'oson' | 'orta' | 'qiyin';
  topic: string | null;
  warning?: string;
}

export interface ParseResult {
  questions: HemisParsedQuestion[];
  warnings: string[];
  errors: { block: string; reason: string }[];
}

export function parseHemisFormat(rawText: string): ParseResult {
  const result: ParseResult = {
    questions: [],
    warnings: [],
    errors: []
  };

  if (!rawText || !rawText.trim()) {
    return result;
  }

  // Normalize Uzbek apostrophes
  // straight quote (') -> modifier letter (ʻ) for o' and g'
  // But we want to be careful not to break everything. 
  // Standardizing helps with search/matching.
  const normalizedText = rawText.replace(/([og])'/gi, '$1ʻ');

  // Split by "++++" on its own line
  const blocks = normalizedText.split(/\n\s*\+\+\+\+\s*\n|\n\+\+\+\+$/);

  blocks.forEach((block, blockIndex) => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;

    // Split by "====" on its own line
    const parts = trimmedBlock.split(/\n\s*====\s*\n/);
    
    if (parts.length < 2) {
      result.errors.push({
        block: trimmedBlock.substring(0, 50) + "...",
        reason: "Savol va javoblar ajratilmagan (==== tushib qolgan bo'lishi mumkin)"
      });
      return;
    }

    const questionText = parts[0].trim();
    const optionsParts = parts.slice(1).map(p => p.trim()).filter(p => p.length > 0);

    if (!questionText) {
      result.errors.push({
        block: trimmedBlock.substring(0, 50) + "...",
        reason: "Savol matni bo'sh"
      });
      return;
    }

    if (optionsParts.length < 2) {
      result.errors.push({
        block: questionText,
        reason: "Javoblar soni kamida 2 ta bo'lishi kerak"
      });
      return;
    }

    let correctIndex = -1;
    const cleanOptions: string[] = [];
    let blockWarning: string | undefined;

    optionsParts.forEach((opt, idx) => {
      if (opt.startsWith('#')) {
        if (correctIndex !== -1) {
          blockWarning = "Bir nechta to'g'ri javob (#) topildi. Birinchisi olindi.";
          result.warnings.push(`Savol ${blockIndex + 1}: ${blockWarning}`);
        } else {
          correctIndex = idx;
        }
        cleanOptions.push(opt.substring(1).trim());
      } else {
        cleanOptions.push(opt);
      }
    });

    if (correctIndex === -1) {
      result.errors.push({
        block: questionText,
        reason: "To'g'ri javob (#) topilmadi"
      });
      return;
    }

    if (cleanOptions.length !== 4) {
      const w = `Javoblar soni ${cleanOptions.length} ta (odatda 4 ta bo'ladi)`;
      result.warnings.push(`Savol ${blockIndex + 1}: ${w}`);
      if (!blockWarning) blockWarning = w;
    }

    result.questions.push({
      text: questionText,
      options: cleanOptions,
      correctIndex,
      hemisRaw: trimmedBlock,
      difficulty: 'orta',
      topic: null,
      warning: blockWarning
    });
  });

  return result;
}
