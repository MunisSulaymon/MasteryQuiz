/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Question {
  id: string;
  stem: string;
  options: string[];
  correctAnswer: string;
  wrongCount: number;
  box: 1 | 2 | 3;
}

export type AppView = 'landing' | 'selection' | 'quiz' | 'summary' | 'drill' | 'victory';

export interface QuizSet {
  id: number;
  questions: Question[];
  mastery?: {
    bestRounds: number;
    lastMastered: number;
  };
}

export interface QuizSession {
  setId: number;
  questions: Question[];
  startTime: number;
  rounds: number;
  endTime?: number;
  mode: 'leitner' | 'quick-test';
}
