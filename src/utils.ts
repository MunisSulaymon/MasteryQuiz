/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Question, QuizSet } from './types';

export function parseQuestions(input: string): Question[] {
  const rawBlocks = input.split('++++').map(block => block.trim()).filter(Boolean);
  
  return rawBlocks.map((block, index) => {
    const lines = block.split('====').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return null as any;

    const stem = lines[0];
    const optionsRaw = lines.slice(1);
    
    let correctAnswer = '';
    const options = optionsRaw.map(opt => {
      if (opt.startsWith('#')) {
        const clean = opt.substring(1).trim();
        correctAnswer = clean;
        return clean;
      }
      return opt;
    });

    return {
      id: `q-${index}-${Date.now()}`,
      stem,
      options,
      correctAnswer,
      wrongCount: 0,
      box: 1,
    };
  }).filter(q => q && q.correctAnswer);
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
