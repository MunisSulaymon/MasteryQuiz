import { QuizPack, ExamQuestion, ExamHistory, Question } from '../types';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';

const STORAGE_KEY = 'masteryquiz_data';

interface AppData {
  packs: QuizPack[];
  questions: { [packId: string]: ExamQuestion[] };
  examHistory: ExamHistory[];
  packData: { [packId: string]: any };
  settings: {
    lastSynced?: number;
    dismissedBanners: string[];
  };
}

const DEFAULT_DATA: AppData = {
  packs: [],
  questions: {},
  examHistory: [],
  packData: {},
  settings: {
    dismissedBanners: []
  }
};

class DataService {
  private memoryData: AppData = { ...DEFAULT_DATA };

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        this.memoryData = { ...DEFAULT_DATA, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to load from localStorage', e);
    }
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memoryData));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  // --- Packs ---

  async getPacks(): Promise<QuizPack[]> {
    const user = auth?.currentUser;
    if (user && db) {
      try {
        const packsSnap = await getDocs(collection(db, `users/${user.uid}/packs`));
        const cloudPacks = packsSnap.docs.map(d => ({
          ...d.data(),
          id: d.id,
          createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || Date.now(),
          lastStudied: d.data().lastStudied?.toMillis?.() || d.data().lastStudied || Date.now(),
        } as QuizPack));
        
        // Merge with local (prefer cloud for same IDs, but keep local-only)
        const localPacks = this.memoryData.packs;
        const merged = [...cloudPacks];
        localPacks.forEach(lp => {
          if (!merged.find(cp => cp.id === lp.id)) {
            merged.push(lp);
          }
        });
        
        this.memoryData.packs = merged;
        this.saveToLocalStorage();
        return merged;
      } catch (e) {
        console.warn('Failed to fetch packs from cloud, using local', e);
      }
    }
    return this.memoryData.packs;
  }

  async savePack(pack: QuizPack) {
    // Save locally first
    const index = this.memoryData.packs.findIndex(p => p.id === pack.id);
    if (index !== -1) {
      this.memoryData.packs[index] = pack;
    } else {
      this.memoryData.packs.unshift(pack);
    }
    this.saveToLocalStorage();

    // Sync to cloud if possible
    const user = auth?.currentUser;
    if (user && db) {
      try {
        await setDoc(doc(db, `users/${user.uid}/packs/${pack.id}`), {
          ...pack,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (e) {
        console.error('Cloud save failed', e);
      }
    }
  }

  async deletePack(packId: string) {
    this.memoryData.packs = this.memoryData.packs.filter(p => p.id !== packId);
    delete this.memoryData.questions[packId];
    delete this.memoryData.packData[packId];
    this.saveToLocalStorage();

    const user = auth?.currentUser;
    if (user && db) {
      try {
        const batch = writeBatch(db);
        const packPath = `users/${user.uid}/packs/${packId}`;
        batch.delete(doc(db, packPath));
        // Note: Recursive delete for questions would need more logic or Cloud Function,
        // but for now we delete the main pack record.
        await batch.commit();
      } catch (e) {
        console.error('Cloud delete failed', e);
      }
    }
  }

  // --- Questions (Exam Mode) ---

  async getQuestions(packId: string): Promise<ExamQuestion[]> {
    const user = auth?.currentUser;
    if (user && db) {
      try {
        const qSnap = await getDocs(collection(db, `users/${user.uid}/packs/${packId}/questions`));
        const cloudQs = qSnap.docs.map(d => ({ ...d.data(), id: d.id } as ExamQuestion));
        if (cloudQs.length > 0) {
          this.memoryData.questions[packId] = cloudQs;
          this.saveToLocalStorage();
          return cloudQs;
        }
      } catch (e) {}
    }
    return this.memoryData.questions[packId] || [];
  }

  async addQuestionsToPack(packId: string, questions: ExamQuestion[]) {
    if (!this.memoryData.questions[packId]) this.memoryData.questions[packId] = [];
    
    // Add only new questions or ensure we don't have duplicates by ID if they happen to have them
    const existingIds = new Set(this.memoryData.questions[packId].map(q => q.id));
    const newQuestions = questions.filter(q => !existingIds.has(q.id));
    
    this.memoryData.questions[packId].push(...newQuestions);
    
    const pack = this.memoryData.packs.find(p => p.id === packId);
    if (pack) pack.questionCount = this.memoryData.questions[packId].length;
    
    this.saveToLocalStorage();

    const user = auth?.currentUser;
    if (user && db) {
      try {
        const batch = writeBatch(db);
        newQuestions.forEach(q => {
          const qId = q.id || doc(collection(db, 'dummy')).id;
          const qRef = doc(db, `users/${user.uid}/packs/${packId}/questions/${qId}`);
          batch.set(qRef, { ...q, id: qId, createdAt: serverTimestamp() });
        });
        if (pack) {
          batch.set(doc(db, `users/${user.uid}/packs/${packId}`), { 
            questionCount: pack.questionCount,
            lastUpdated: serverTimestamp() 
          }, { merge: true });
        }
        await batch.commit();
      } catch (e) {
        console.error("Cloud add questions failed", e);
      }
    }
  }

  async updateQuestion(packId: string, question: ExamQuestion) {
    if (!question.id) return;
    
    const qs = this.memoryData.questions[packId] || [];
    const index = qs.findIndex(q => q.id === question.id);
    if (index !== -1) {
      qs[index] = { ...qs[index], ...question };
    }
    this.saveToLocalStorage();

    const user = auth?.currentUser;
    if (user && db) {
      try {
        await setDoc(doc(db, `users/${user.uid}/packs/${packId}/questions/${question.id}`), {
          ...question,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }
  }

  async saveQuestions(packId: string, questions: ExamQuestion[]) {
    return this.addQuestionsToPack(packId, questions);
  }

  // --- Study Progress (Leitner) ---

  async saveStudyState(packId: string, studyData: any) {
    this.memoryData.packData[packId] = studyData;
    this.saveToLocalStorage();

    const user = auth?.currentUser;
    if (user && db) {
      try {
        const dataPath = `users/${user.uid}/packs/${packId}/data`;
        const batch = writeBatch(db);
        
        batch.set(doc(db, `${dataPath}/questions`), {
          states: studyData.questionsState.map(([id, state]: [string, any]) => ({ id, ...state })),
          lastUpdated: serverTimestamp()
        });

        const setsMasteryObj: Record<string, any> = {};
        studyData.setsMastery.forEach(([key, val]: [number, any]) => {
          setsMasteryObj[key] = val;
        });
        batch.set(doc(db, `${dataPath}/sets`), {
          mastery: setsMasteryObj,
          lastUpdated: serverTimestamp()
        });
        
        await batch.commit();
      } catch (e) {}
    }
  }

  async getStudyState(packId: string) {
    const user = auth?.currentUser;
    if (user && db) {
      try {
        const dataPath = `users/${user.uid}/packs/${packId}/data`;
        const [qSnap, sSnap] = await Promise.all([
          getDoc(doc(db, `${dataPath}/questions`)),
          getDoc(doc(db, `${dataPath}/sets`))
        ]);

        if (qSnap.exists() && sSnap.exists()) {
          const qStates = qSnap.data().states || [];
          const sMastery = sSnap.data().mastery || {};
          
          const state = {
            questionsState: qStates.map((s: any) => [s.id, { box: s.box, wrongCount: s.wrongCount }]),
            setsMastery: Object.entries(sMastery).map(([k, v]) => [Number(k), v])
          };
          
          this.memoryData.packData[packId] = state;
          this.saveToLocalStorage();
          return state;
        }
      } catch (e) {}
    }
    return this.memoryData.packData[packId] || null;
  }

  // --- Exam History ---

  async getExamHistory(): Promise<ExamHistory[]> {
    const user = auth?.currentUser;
    if (user && db) {
      try {
        const qSnap = await getDocs(query(collection(db, `users/${user.uid}/examHistory`), orderBy('createdAt', 'desc')));
        const cloudHistory = qSnap.docs.map(d => ({
          ...d.data(),
          id: d.id,
          createdAt: d.data().createdAt?.toMillis?.() || d.data().createdAt || Date.now()
        } as unknown as ExamHistory));
        
        if (cloudHistory.length > 0) {
          // Merge logic if needed, or just replace
          this.memoryData.examHistory = cloudHistory;
          this.saveToLocalStorage();
          return cloudHistory;
        }
      } catch (e) {}
    }
    return this.memoryData.examHistory || [];
  }

  async getExamHistoryItem(id: string): Promise<ExamHistory | null> {
    const history = await this.getExamHistory();
    return history.find(h => h.id === id) || null;
  }

  async saveExamResult(result: ExamHistory) {
    const history = this.memoryData.examHistory;
    const index = history.findIndex(h => h.id === result.id);
    if (index > -1) history[index] = result;
    else history.unshift(result);
    
    this.saveToLocalStorage();

    const user = auth?.currentUser;
    if (user && db) {
      try {
        await setDoc(doc(db, `users/${user.uid}/examHistory/${result.id}`), {
          ...result,
          createdAt: serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }
  }

  async deleteQuestion(packId: string, qId: string): Promise<void> {
    if (this.memoryData.questions[packId]) {
      this.memoryData.questions[packId] = this.memoryData.questions[packId].filter(q => q.id !== qId);
      this.saveToLocalStorage();
    }

    const user = auth?.currentUser;
    if (user && db) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/packs/${packId}/questions/${qId}`));
      } catch (e) {}
    }
  }

  async findWeakPackByExamId(examId: string): Promise<QuizPack | null> {
    const packs = await this.getPacks();
    return packs.find(p => (p as any).examId === examId) || null;
  }

  // --- Sync & Auth ---

  async syncToCloud() {
    if (!auth?.currentUser || !db) return false;
    const user = auth.currentUser;
    const data = this.memoryData;

    try {
      const batch = writeBatch(db);
      
      // Sync packs & questions & progress
      for (const pack of data.packs) {
        const packPath = `users/${user.uid}/packs/${pack.id}`;
        batch.set(doc(db, packPath), { ...pack, lastUpdated: serverTimestamp() }, { merge: true });
        
        const qs = data.questions[pack.id] || [];
        qs.forEach(q => {
          const qRef = doc(collection(db, `${packPath}/questions`));
          batch.set(qRef, { ...q, createdAt: serverTimestamp() });
        });

        const study = data.packData[pack.id];
        if (study) {
          const dataPath = `${packPath}/data`;
          batch.set(doc(db, `${dataPath}/questions`), {
            states: study.questionsState.map(([id, state]: [string, any]) => ({ id, ...state })),
            lastUpdated: serverTimestamp()
          });
          const setsMasteryObj: Record<string, any> = {};
          study.setsMastery.forEach(([key, val]: [number, any]) => {
            setsMasteryObj[key] = val;
          });
          batch.set(doc(db, `${dataPath}/sets`), { mastery: setsMasteryObj, lastUpdated: serverTimestamp() });
        }
      }

      // Sync exam history
      for (const history of data.examHistory) {
        const hRef = doc(collection(db, `users/${user.uid}/examHistory`));
        batch.set(hRef, { ...history, createdAt: serverTimestamp() });
      }

      await batch.commit();
      this.memoryData.settings.lastSynced = Date.now();
      this.saveToLocalStorage();
      return true;
    } catch (e) {
      console.error('Sync failed', e);
      return false;
    }
  }

  // --- Settings ---
  getSettings() {
    return this.memoryData.settings;
  }

  updateSettings(updates: Partial<AppData['settings']>) {
    this.memoryData.settings = { ...this.memoryData.settings, ...updates };
    this.saveToLocalStorage();
  }
}

export const dataService = new DataService();
