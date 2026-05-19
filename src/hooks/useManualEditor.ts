import { useReducer, useCallback } from 'react';
import { ExamQuestion } from '../types';

export interface EditorQuestion extends ExamQuestion {
  isDirty?: boolean;
  hasErrors?: boolean;
}

export interface EditorState {
  packId: string | null;
  packTitle: string;
  questions: EditorQuestion[];
  activeQuestionIndex: number;
  lastSavedAt: number | null;
}

type EditorAction =
  | { type: 'LOAD_PACK'; packId: string; packTitle: string; questions: ExamQuestion[] }
  | { type: 'ADD_QUESTION' }
  | { type: 'UPDATE_STEM'; stem: string }
  | { type: 'UPDATE_OPTION'; index: number; text: string }
  | { type: 'SET_CORRECT'; index: number }
  | { type: 'DELETE_QUESTION'; index: number }
  | { type: 'REORDER_QUESTIONS'; from: number; to: number }
  | { type: 'SET_ACTIVE_QUESTION'; index: number }
  | { type: 'MARK_SAVED' }
  | { type: 'BULK_IMPORT'; questions: ExamQuestion[] }
  | { type: 'UPDATE_METADATA'; updates: Partial<ExamQuestion> }
  | { type: 'RESTORE_DRAFT'; state: EditorState };

const validateQuestion = (q: EditorQuestion) => {
  if (!q.text || q.text.length < 10) return true;
  if (q.options.length !== 4) return true;
  if (q.options.some(opt => !opt.trim())) return true;
  if (q.correctIndex < 0 || q.correctIndex > 3) return true;
  
  // Check for duplicates
  const uniqueOptions = new Set(q.options.map(o => o.toLowerCase().trim()));
  if (uniqueOptions.size !== q.options.length) return true;

  return false;
};

const reducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'LOAD_PACK':
      return {
        ...state,
        packId: action.packId,
        packTitle: action.packTitle,
        questions: action.questions.map(q => ({ ...q, hasErrors: validateQuestion(q as EditorQuestion) })),
        activeQuestionIndex: 0
      };

    case 'ADD_QUESTION': {
      const newQ: EditorQuestion = {
        id: Math.random().toString(36).substring(2, 11),
        text: '',
        options: ['', '', '', ''],
        correctIndex: -1,
        difficulty: 'orta',
        topic: '',
        source_platform: 'exam',
        createdAt: Date.now(),
        createdBy: '',
        timesUsed: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        isDirty: true,
        hasErrors: true
      };
      return {
        ...state,
        questions: [...state.questions, newQ],
        activeQuestionIndex: state.questions.length
      };
    }

    case 'UPDATE_STEM': {
      const newQuestions = [...state.questions];
      const q = { ...newQuestions[state.activeQuestionIndex], text: action.stem, isDirty: true };
      q.hasErrors = validateQuestion(q);
      newQuestions[state.activeQuestionIndex] = q;
      return { ...state, questions: newQuestions };
    }

    case 'UPDATE_OPTION': {
      const newQuestions = [...state.questions];
      const options = [...newQuestions[state.activeQuestionIndex].options];
      options[action.index] = action.text;
      const q = { ...newQuestions[state.activeQuestionIndex], options, isDirty: true };
      q.hasErrors = validateQuestion(q);
      newQuestions[state.activeQuestionIndex] = q;
      return { ...state, questions: newQuestions };
    }

    case 'SET_CORRECT': {
      const newQuestions = [...state.questions];
      const q = { ...newQuestions[state.activeQuestionIndex], correctIndex: action.index, isDirty: true };
      q.hasErrors = validateQuestion(q);
      newQuestions[state.activeQuestionIndex] = q;
      return { ...state, questions: newQuestions };
    }

    case 'DELETE_QUESTION': {
      const newQuestions = state.questions.filter((_, i) => i !== action.index);
      let newIdx = state.activeQuestionIndex;
      if (newIdx >= newQuestions.length) newIdx = Math.max(0, newQuestions.length - 1);
      return { ...state, questions: newQuestions, activeQuestionIndex: newIdx };
    }

    case 'REORDER_QUESTIONS': {
      const result = [...state.questions];
      const [removed] = result.splice(action.from, 1);
      result.splice(action.to, 0, removed);
      return { ...state, questions: result, activeQuestionIndex: action.to };
    }

    case 'SET_ACTIVE_QUESTION':
      return { ...state, activeQuestionIndex: action.index };

    case 'MARK_SAVED':
      return {
        ...state,
        questions: state.questions.map(q => ({ ...q, isDirty: false })),
        lastSavedAt: Date.now()
      };

    case 'BULK_IMPORT': {
      const imported = action.questions.map(q => ({
        ...q,
        id: q.id || Math.random().toString(36).substring(2, 11),
        isDirty: true,
        hasErrors: validateQuestion(q as EditorQuestion)
      }));
      return {
        ...state,
        questions: [...state.questions, ...imported]
      };
    }

    case 'UPDATE_METADATA': {
      const newQuestions = [...state.questions];
      const q = { ...newQuestions[state.activeQuestionIndex], ...action.updates, isDirty: true };
      q.hasErrors = validateQuestion(q);
      newQuestions[state.activeQuestionIndex] = q;
      return { ...state, questions: newQuestions };
    }

    case 'RESTORE_DRAFT':
      return action.state;

    default:
      return state;
  }
};

export const useManualEditor = (initialPackId: string | null = null, initialPackTitle: string = '') => {
  const [state, dispatch] = useReducer(reducer, {
    packId: initialPackId,
    packTitle: initialPackTitle,
    questions: [],
    activeQuestionIndex: 0,
    lastSavedAt: null
  });

  return { state, dispatch };
};
