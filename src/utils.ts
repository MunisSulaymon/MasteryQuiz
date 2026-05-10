/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, QuizSet } from './types';

export function normalizeUzbekText(text: string): string {
  if (!text) return '';
  
  // Repair common mojibake and encoding issues specifically for Uzbek characters
  let repaired = text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove invisible characters
    .replace(/\r\n/g, '\n') // Standardize line endings
    .replace(/\r/g, '\n')
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
    .replace(/ʻ/g, "'") 
    .replace(/ʼ/g, "'")
    .replace(/‘/g, "'")
    .replace(/’/g, "'")
    .replace(/`/g, "'");

  // Standardize Uzbek specific Latin characters
  repaired = repaired
    .replace(/o[''']/g, "o'")
    .replace(/O[''']/g, "O'")
    .replace(/g[''']/g, "g'")
    .replace(/G[''']/g, "G'");

  return repaired
    .replace(/[\u2018\u2019\u201B\u02BB\u02BC\u0027\u0060\u00B4]/g, "'") 
    .replace(/[\u201C\u201D\u201F\u00AB\u00BB]/g, '"')
    .trim();
}

export function parseSingleQuestion(block: string, id: string): Question | null {
  const separatorRegex = /\s*={2,}\s*/;
  const lines = block.split(separatorRegex).map(l => normalizeUzbekText(l.trim())).filter(l => l.length > 0);
  if (lines.length < 2) return null;

  const stem = lines[0];
  const optionsRaw = lines.slice(1);
  
  let correctAnswer = '';
  const options: string[] = [];
  
  for (let j = 0; j < optionsRaw.length; j++) {
    let opt = optionsRaw[j];
    // Some formats use [X] or {X} or just starting with # to mark the correct answer
    const isExplicitCorrect = opt.startsWith('#') || opt.startsWith('*') || (opt.length > 3 && opt.substring(0, 4).includes('[x]'));
    
    let clean = opt;
    if (isExplicitCorrect) {
       clean = opt.replace(/^[#*]|\[x\]/i, '').trim();
       correctAnswer = clean;
    }
    
    // De-duplicate options
    if (clean && !options.includes(clean)) {
      options.push(clean);
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

  // Split by 2 or more plus signs, or by double newlines if no plus signs are found
  let rawBlocks = input.split(/\s*\+{2,}\s*/).map(block => block.trim()).filter(Boolean);
  
  if (rawBlocks.length <= 1) {
    // If we only got one block, try splitting by double line breaks as a common fallback
    rawBlocks = input.split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  }

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
