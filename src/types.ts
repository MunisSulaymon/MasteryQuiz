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

export type AppView = 'landing' | 'packs' | 'selection' | 'quiz' | 'summary' | 'drill' | 'victory';

export type SyncStatus = 'synced' | 'syncing' | 'offline';

export interface QuizPack {
  id: string;
  name: string;
  color: string;
  createdAt: number;
  deleteAt: number | null;
  questionCount: number;
  lastStudied: number;
  inputText?: string;
  setSize: number;
}

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

export interface ExamQuestion {
  id?: string;
  text: string;
  options: string[];
  correctIndex: number;
  hemisRaw: string;
  difficulty: 'oson' | 'orta' | 'qiyin';
  topic: string | null;
  source_platform: 'exam';
  createdAt: any;
  createdBy: string;
  timesUsed: number;
  timesCorrect: number;
  timesIncorrect: number;
}

export interface ExamSession {
  examType: 'joriy' | 'oraliq' | 'yakuniy' | 'custom';
  questions: ExamQuestion[];
  answers: (number | null)[]; // index of selected option
  flags: boolean[];
  startTime: number;
  totalTime: number; // in seconds
  packId: string;
}

export interface ExamHistory {
  id?: string;
  packId: string;
  examType: string;
  totalQuestions: number;
  correctCount: number;
  score: number;
  grade: string;
  ects: string;
  timeUsed: number;
  timeTotal: number;
  topicBreakdown: { 
    [topic: string]: { 
      correct: number; 
      total: number; 
    } 
  };
  failedQuestionIds: string[];
  createdAt: any;
}
