import { QuizPack, ExamQuestion, ExamHistory } from '../types';

const STORAGE_KEY = 'masteryquiz_guest_data';

interface GuestData {
  packs: QuizPack[];
  questions: { [packId: string]: ExamQuestion[] };
  examHistory: ExamHistory[];
  packData: { [packId: string]: any }; // Study state (box, etc)
}

function getRawData(): GuestData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { packs: [], questions: {}, examHistory: [], packData: {} };
  } catch (e) {
    return { packs: [], questions: {}, examHistory: [], packData: {} };
  }
}

function saveRawData(data: GuestData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save guest data to localStorage', e);
    // You might want to warn the user about the 5MB limit here in a real app
  }
}

export const localStore = {
  getPacks(): QuizPack[] {
    return getRawData().packs;
  },

  savePack(pack: QuizPack) {
    const data = getRawData();
    const index = data.packs.findIndex(p => p.id === pack.id);
    if (index !== -1) {
      data.packs[index] = pack;
    } else {
      data.packs.unshift(pack);
    }
    saveRawData(data);
  },

  deletePack(packId: string) {
    const data = getRawData();
    data.packs = data.packs.filter(p => p.id !== packId);
    delete data.questions[packId];
    delete data.packData[packId];
    saveRawData(data);
  },

  getQuestions(packId: string): ExamQuestion[] {
    return getRawData().questions[packId] || [];
  },

  saveQuestions(packId: string, newQuestions: ExamQuestion[]) {
    const data = getRawData();
    if (!data.questions[packId]) {
      data.questions[packId] = [];
    }
    data.questions[packId].push(...newQuestions);
    
    // Update questionCount in the pack itself
    const pack = data.packs.find(p => p.id === packId);
    if (pack) {
      pack.questionCount = data.questions[packId].length;
    }
    
    saveRawData(data);
  },

  getExamHistory(): ExamHistory[] {
    return getRawData().examHistory;
  },

  saveExamResult(result: ExamHistory) {
    const data = getRawData();
    data.examHistory.unshift(result);
    saveRawData(data);
  },

  getHistoryItem(id: string): ExamHistory | null {
    return getRawData().examHistory.find(h => h.id === id) || null;
  },

  getPackData(packId: string) {
    return getRawData().packData[packId] || null;
  },

  savePackData(packId: string, studyData: any) {
    const data = getRawData();
    data.packData[packId] = studyData;
    saveRawData(data);
  },

  getAllGuestData() {
    return getRawData();
  },

  clearGuestData() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
