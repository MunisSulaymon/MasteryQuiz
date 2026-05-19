import { useMemo } from 'react';
import { EditorQuestion } from '../hooks/useManualEditor';

export interface ValidationError {
  questionIndex: number;
  field: 'stem' | 'options' | 'correct' | 'duplicates';
  message: string;
}

export const useValidation = (questions: EditorQuestion[]) => {
  const errors = useMemo(() => {
    const list: ValidationError[] = [];

    questions.forEach((q, idx) => {
      // Stem
      if (!q.text) {
        list.push({ questionIndex: idx, field: 'stem', message: "Savol matni bo'sh bo'lishi mumkin emas" });
      } else if (q.text.length < 10) {
        list.push({ questionIndex: idx, field: 'stem', message: "Savol matni kamida 10 ta belgidan iborat bo'lishi kerak" });
      }

      // Options
      if (!q.options || q.options.length !== 4) {
        list.push({ questionIndex: idx, field: 'options', message: "Variantlar soni 4 ta bo'lishi kerak" });
      } else {
        q.options.forEach((opt, optIdx) => {
          if (!opt.trim()) {
            list.push({ questionIndex: idx, field: 'options', message: `${String.fromCharCode(65 + optIdx)} varianti bo'sh` });
          }
        });

        // Duplicates
        const unique = new Set(q.options.map(o => o.toLowerCase().trim()));
        if (unique.size !== q.options.length) {
          list.push({ questionIndex: idx, field: 'duplicates', message: "Bir xil variantlar aniqlandi" });
        }
      }

      // Correct Index
      if (q.correctIndex < 0 || q.correctIndex > 3) {
        list.push({ questionIndex: idx, field: 'correct', message: "To'g'ri javob belgilanmagan" });
      }
    });

    return list;
  }, [questions]);

  return errors;
};
