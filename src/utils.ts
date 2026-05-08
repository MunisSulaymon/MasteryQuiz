/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, QuizSet } from './types';

export function parseSingleQuestion(block: string, id: string): Question | null {
  const lines = block.split(/====/).map(l => l.trim()).filter(Boolean);
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

  const rawBlocks = input.split(/\+\+\+\+/).map(block => block.trim()).filter(Boolean);
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
