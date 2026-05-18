import { ExamQuestion } from '../types';

/**
 * Fisher-Yates shuffle
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Prepares questions for an exam session
 * 1. Filters by difficulty
 * 2. Samples according to requested distribution
 * 3. Shuffles options for each question
 * 4. Shuffles final question order
 */
export function prepareExamQuestions(
  allQuestions: ExamQuestion[], 
  count: number,
  dist: { oson: number; orta: number; qiyin: number }
): ExamQuestion[] {
  const osonPool = allQuestions.filter(q => q.difficulty === 'oson');
  const ortaPool = allQuestions.filter(q => q.difficulty === 'orta');
  const qiyinPool = allQuestions.filter(q => q.difficulty === 'qiyin');

  const osonCount = Math.floor((dist.oson / 100) * count);
  const qiyinCount = Math.floor((dist.qiyin / 100) * count);
  const ortaCount = count - osonCount - qiyinCount;

  const sampledOson = shuffle(osonPool).slice(0, osonCount);
  const sampledOrta = shuffle(ortaPool).slice(0, ortaCount);
  const sampledQiyin = shuffle(qiyinPool).slice(0, qiyinCount);

  let finalPool = [...sampledOson, ...sampledOrta, ...sampledQiyin];
  
  // If we don't have enough in pools, fill from anywhere
  if (finalPool.length < count) {
    const remainingNeeded = count - finalPool.length;
    const usedIds = new Set(finalPool.map(q => q.id));
    const leftovers = allQuestions.filter(q => !usedIds.has(q.id));
    finalPool = [...finalPool, ...shuffle(leftovers).slice(0, remainingNeeded)];
  }

  // Shuffle options for each question
  return shuffle(finalPool).map(q => {
    const optionIndices = q.options.map((_, i) => i);
    const shuffledIndices = shuffle(optionIndices);
    
    const newOptions = shuffledIndices.map(i => q.options[i]);
    const newCorrectIndex = shuffledIndices.indexOf(q.correctIndex);
    
    return {
      ...q,
      options: newOptions,
      correctIndex: newCorrectIndex
    };
  });
}
