/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, QuizSet } from './types';

export function normalizeUzbekText(text: string): string {
  if (!text) return '';
  
  // Repair common mojibake and encoding issues specifically for Uzbek characters
  // This handles the "Ð¾â€˜" type issues specifically for Uzbek characters (Cyrillic o + smart quote)
  let repaired = text
    .replace(/\u00D0\u00BE\u00E2\u20AC\u2018/g, "o'") 
    .replace(/\u00D0\u00BE\u00E2\u20AC\u2122/g, "o'") 
    .replace(/\u00D0\u00B3\u00E2\u20AC\u2018/g, "g'") 
    .replace(/\u00D0\u00B3\u00E2\u20AC\u2122/g, "g'") 
    .replace(/\u00D0\u00BE/g, "o") 
    .replace(/\u00D0\u00B3/g, "g")
    .replace(/\u00E2\u20AC\u2018/g, "'")
    .replace(/\u00E2\u20AC\u2122/g, "'")
    .replace(/\u00E2\u20AC\u0153/g, '"')
    .replace(/\u00E2\u20AC\u009D/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€[“”]/g, '"')
    .replace(/ʻ/g, "'") // Handle specific Uzbek/Cyrillic apostrophe
    .replace(/ʼ/g, "'")
    .replace(/‘/g, "'")
    .replace(/’/g, "'")
    .replace(/`/g, "'");

  // Standardize Uzbek specific Latin characters that often get mixed up
  // o' and g' standardization
  repaired = repaired
    .replace(/o[''']/g, "o'")
    .replace(/O[''']/g, "O'")
    .replace(/g[''']/g, "g'")
    .replace(/G[''']/g, "G'");

  // Standardize all other variants of quotes
  return repaired
    .replace(/[\u2018\u2019\u201B\u02BB\u02BC\u0027\u0060\u00B4]/g, "'") 
    .replace(/[\u201C\u201D\u201F\u00AB\u00BB]/g, '"')
    .trim();
}

export function parseSingleQuestion(block: string, id: string): Question | null {
  const lines = block.split(/====/).map(l => normalizeUzbekText(l)).filter(Boolean);
  if (lines.length < 2) return null;

  const stem = lines[0];
  const optionsRaw = lines.slice(1);
  
  let correctAnswer = '';
  const options: string[] = [];
  
  for (let j = 0; j < optionsRaw.length; j++) {
    let opt = optionsRaw[j];
    if (opt.startsWith('#')) {
      const clean = opt.substring(1).trim();
      correctAnswer = clean;
      options.push(clean);
    } else {
      options.push(opt);
    }
  }

  if (!correctAnswer) return null;

  return {
    id,
    stem,
    options,
    correctAnswer,
    wrongCount: 0,
    box: 1,
  };
}

export function parseQuestions(input: string): Question[] {
  if (!input || !input.trim()) return [];

  const normalizedInput = normalizeUzbekText(input);
  const rawBlocks = normalizedInput.split(/\+\+\+\+/).map(block => block.trim()).filter(Boolean);
  const now = Date.now();
  const questions: Question[] = [];
  
  for (let i = 0; i < rawBlocks.length; i++) {
    const q = parseSingleQuestion(rawBlocks[i], `q-${i}-${now}`);
    if (q) questions.push(q);
  }
  
  return questions;
}

export function splitIntoSets(questions: Question[], size: number = 40): QuizSet[] {
  const sets: QuizSet[] = [];
  for (let i = 0; i < questions.length; i += size) {
    sets.push({
      id: Math.floor(i / size) + 1,
      questions: questions.slice(i, i + size),
    });
  }
  return sets;
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}
