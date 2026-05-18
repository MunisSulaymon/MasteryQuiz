import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  serverTimestamp,
  writeBatch,
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Question, QuizSet, QuizPack, ExamQuestion, ExamHistory } from '../types';
import { localStore } from '../utils/localStore';

// Local Storage Helpers
const CACHE_KEY_PREFIX = 'mastery_quiz_';

function getCacheKey(userId: string, suffix: string) {
  return `${CACHE_KEY_PREFIX}${userId}_${suffix}`;
}

function toMillis(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val instanceof Date) return val.getTime();
  return null;
}

export function saveToLocal(userId: string, suffix: string, data: any) {
  try {
    localStorage.setItem(getCacheKey(userId, suffix), JSON.stringify(data));
  } catch (e) {
    console.warn('LocalStorage save failed', e);
  }
}

export function loadFromLocal(userId: string, suffix: string) {
  try {
    const cached = localStorage.getItem(getCacheKey(userId, suffix));
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    return null;
  }
}

export async function createPack(pack: Partial<QuizPack>) {
  const userId = auth?.currentUser?.uid;
  if (db && userId) {
    const packsPath = `users/${userId}/packs`;
    try {
      const qSnap = await getDocs(query(collection(db, packsPath), where('name', '==', pack.name)));
      if (!qSnap.empty) {
        // Return existing pack ID if name matches (for weak packs)
        return qSnap.docs[0].id;
      }
    } catch (e) {}
  }

  const packId = pack.id || Math.random().toString(36).substring(2, 11);
  const newPack = {
    ...pack,
    id: packId,
    createdAt: Date.now(),
    lastStudied: Date.now(),
    questionCount: pack.questionCount || 0,
  } as QuizPack;

  if (!userId) {
    localStore.savePack(newPack);
    return packId;
  }

  // Update local cache for authenticated users
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  saveToLocal(userId, 'packs', [newPack, ...cachedPacks]);

  if (db) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      await setDoc(doc(db, path), {
        ...newPack,
        createdAt: serverTimestamp(),
        lastStudied: serverTimestamp(),
      });
    } catch (error) {
      console.error("Firestore creation failed, kept in local storage", error);
    }
  }
  
  return packId;
}

export async function updatePack(packId: string, updates: Partial<QuizPack>) {
  const userId = auth?.currentUser?.uid;
  
  if (!userId) {
    const packs = localStore.getPacks();
    const pack = packs.find(p => p.id === packId);
    if (pack) {
      localStore.savePack({ ...pack, ...updates });
    }
    return;
  }

  // Update local cache first
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  const updated = cachedPacks.map((p: QuizPack) => p.id === packId ? { ...p, ...updates } : p);
  saveToLocal(userId, 'packs', updated);

  if (db) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      await setDoc(doc(db, path), {
        ...updates,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Firestore update failed, kept in local storage", error);
    }
  }
}

export async function deletePack(packId: string) {
  const userId = auth?.currentUser?.uid;
  
  if (!userId) {
    localStore.deletePack(packId);
    return;
  }

  // Update local cache first
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  saveToLocal(userId, 'packs', cachedPacks.filter((p: QuizPack) => p.id !== packId));
  localStorage.removeItem(getCacheKey(userId, `pack_${packId}_data`));

  if (db) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, `${path}/data/questions`));
      batch.delete(doc(db, `${path}/data/sets`));
      batch.delete(doc(db, path));
      await batch.commit();
    } catch (error) {
       console.error("Firestore delete failed, removed from local", error);
    }
  }
}

export async function syncSessionData(packId: string, questions: Question[], setsMastery: Map<number, any>, inputText: string, setSize: number) {
  const userId = auth?.currentUser?.uid;
  
  // Update local cache first
  const packData = {
    questionsState: Array.from(new Map(questions.map(q => [q.id, { box: q.box, wrongCount: q.wrongCount }])).entries()),
    setsMastery: Array.from(setsMastery.entries()),
    inputText,
    setSize,
    questionCount: questions.length
  };

  if (!userId) {
    localStore.savePackData(packId, packData);
    // Also update the pack itself in the list
    const packs = localStore.getPacks();
    const pack = packs.find(p => p.id === packId);
    if (pack) {
      localStore.savePack({ 
        ...pack, 
        inputText, 
        setSize, 
        questionCount: questions.length, 
        lastStudied: Date.now() 
      });
    }
    return;
  }

  saveToLocal(userId, `pack_${packId}_data`, packData);

  if (db) {
    const packPath = `users/${userId}/packs/${packId}`;
    try {
      const batch = writeBatch(db);
      
      batch.set(doc(db, packPath), {
        inputText,
        setSize,
        questionCount: questions.length,
        lastStudied: serverTimestamp(),
      }, { merge: true });

      const qStates = questions.map(q => ({ id: q.id, box: q.box, wrongCount: q.wrongCount }));
      batch.set(doc(db, `${packPath}/data/questions`), { 
        states: qStates,
        lastUpdated: serverTimestamp() 
      });

      const setsMasteryObj: Record<string, any> = {};
      setsMastery.forEach((val, key) => {
        setsMasteryObj[key] = val;
      });
      batch.set(doc(db, `${packPath}/data/sets`), {
         mastery: setsMasteryObj,
         lastUpdated: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      console.error("Sync to cloud failed, progress saved locally", error);
      throw error;
    }
  }
}

async function migrateUserData(userId: string) {
  if (!db) return;
  // Check if old data exists
  const oldProgressPath = `users/${userId}/config/progress`;
  const oldQuestionsPath = `users/${userId}/questions`;
  const oldSetsPath = `users/${userId}/sets`;
  
  const oldProgressSnap = await getDoc(doc(db, oldProgressPath));
  if (!oldProgressSnap.exists()) return;

  // Create default pack
  const packId = 'default-pack';
  const packPath = `users/${userId}/packs/${packId}`;
  
  const oldProgress = oldProgressSnap.data();
  
  const newPackData = {
    id: packId,
    name: 'My First Pack',
    color: 'indigo',
    createdAt: serverTimestamp(),
    lastStudied: serverTimestamp(),
    deleteAt: null,
    inputText: oldProgress.inputText || '',
    setSize: oldProgress.setSize || 20,
    questionCount: 0
  };

  const oldQuestionsSnap = await getDocs(collection(db, oldQuestionsPath));
  const oldSetsSnap = await getDocs(collection(db, oldSetsPath));

  newPackData.questionCount = oldQuestionsSnap.size;

  const batch = writeBatch(db);
  batch.set(doc(db, packPath), newPackData);

  oldQuestionsSnap.docs.forEach(d => {
    batch.set(doc(db, `${packPath}/questions/${d.id}`), d.data());
    batch.delete(d.ref);
  });

  oldSetsSnap.docs.forEach(d => {
    batch.set(doc(db, `${packPath}/sets/${d.id}`), d.data());
    batch.delete(d.ref);
  });

  batch.delete(doc(db, oldProgressPath));
  await batch.commit();
}

export async function loadUserData(forceRefresh = false) {
  const userId = auth?.currentUser?.uid;
  
  // If guest, use local store
  if (!userId || !db) {
    return { packs: localStore.getPacks() };
  }

  // try migration for old structure if needed
  try {
    await migrateUserData(userId);
  } catch (e) {}

  const packsPath = `users/${userId}/packs`;
  try {
    const packsSnap = await getDocs(collection(db, packsPath));
    const packs: QuizPack[] = packsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: toMillis(data.createdAt) || Date.now(),
        lastStudied: toMillis(data.lastStudied) || Date.now(),
        deleteAt: toMillis(data.deleteAt),
      } as QuizPack;
    });

    saveToLocal(userId, 'packs', packs);
    return { packs };
  } catch (error: any) {
    console.error("Load from cloud failed, using local", error);
    const cached = loadFromLocal(userId, 'packs');
    return { packs: cached || [] };
  }
}

export async function loadPackData(packId: string, forceRefresh = false) {
  const userId = auth?.currentUser?.uid;

  if (!userId || !db) {
    const cached = localStore.getPackData(packId);
    if (cached) {
      return {
        questionsState: new Map(cached.questionsState),
        setsMastery: new Map(cached.setsMastery)
      };
    }
    return null;
  }

  const cached = loadFromLocal(userId, `pack_${packId}_data`);
  const dataPath = `users/${userId}/packs/${packId}/data`;
  
  try {
    const [qSnap, sSnap] = await Promise.all([
      getDoc(doc(db, `${dataPath}/questions`)),
      getDoc(doc(db, `${dataPath}/sets`))
    ]);

    const questionsStateMap = new Map();
    if (qSnap.exists()) {
      const states = qSnap.data().states || [];
      states.forEach((s: any) => questionsStateMap.set(s.id, { box: s.box, wrongCount: s.wrongCount }));
    } else if (cached) {
       cached.questionsState.forEach(([id, s]: [string, any]) => questionsStateMap.set(id, s));
    }

    const setsMasteryMap = new Map();
    if (sSnap.exists()) {
      const mastery = sSnap.data().mastery || {};
      Object.entries(mastery).forEach(([key, val]: [string, any]) => {
         setsMasteryMap.set(Number(key), val);
      });
    } else if (cached) {
       cached.setsMastery.forEach(([k, v]: [number, any]) => setsMasteryMap.set(k, v));
    }

    const result = {
      questionsState: questionsStateMap,
      setsMastery: setsMasteryMap
    };
    
    saveToLocal(userId, `pack_${packId}_data`, {
      questionsState: Array.from(questionsStateMap.entries()),
      setsMastery: Array.from(setsMasteryMap.entries())
    });

    return result;
  } catch (error) {
    console.warn("Load pack data from cloud failed, using local", error);
    if (cached) {
      return {
        questionsState: new Map(cached.questionsState),
        setsMastery: new Map(cached.setsMastery)
      };
    }
    return null;
  }
}

export async function syncGuestDataToFirestore() {
  if (!auth?.currentUser || !db) return false;
  const userId = auth.currentUser.uid;
  const guestData = localStore.getAllGuestData();
  
  if (!guestData.packs || guestData.packs.length === 0) return false;

  try {
    const batch = writeBatch(db);
    
    for (const pack of guestData.packs) {
      const packPath = `users/${userId}/packs/${pack.id}`;
      batch.set(doc(db, packPath), {
        ...pack,
        createdAt: serverTimestamp(),
        lastStudied: serverTimestamp(),
      });

      // Sync Exam Questions
      const questions = guestData.questions[pack.id] || [];
      questions.forEach(q => {
        const qRef = doc(collection(db, `${packPath}/questions`));
        batch.set(qRef, {
          ...q,
          createdAt: serverTimestamp(),
          createdBy: userId
        });
      });

      // Sync study study state
      const studyData = guestData.packData[pack.id];
      if (studyData) {
        const dataPath = `${packPath}/data`;
        
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
      }
    }

    // Sync Exam History
    for (const history of guestData.examHistory) {
      const hRef = doc(collection(db, `users/${userId}/examHistory`));
      batch.set(hRef, {
        ...history,
        createdAt: serverTimestamp()
      });
    }

    await batch.commit();
    localStore.clearGuestData();
    return true;
  } catch (e) {
    console.error("Guest sync failed", e);
    return false;
  }
}

export async function createWeakPack(examId: string, name: string, questions: any[]) {
  const userId = auth?.currentUser?.uid;
  
  // Create the pack structure
  const packData: Partial<QuizPack> = {
    name,
    color: 'amber',
    isWeakPack: true,
    originalExamId: examId,
    questionCount: questions.length,
    setSize: Math.min(20, questions.length || 20),
    lastStudied: Date.now(),
    createdAt: Date.now(),
    deleteAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // Auto-delete in 7 days
    inputText: questions.map(q => `${q.text}\n====\n${q.options.map((opt: string, i: number) => i === q.correctIndex ? '#' + opt : opt).join('\n====\n')}`).join('\n++++\n')
  };

  const packId = await createPack(packData);
  
  // Convert ExamQuestion format to Question format for study mode if needed
  // However, createPack already handles the inputText. 
  // We should also sync the session data to ensure they start in Box 1
  const studyQuestions = questions.map(q => ({
    id: Math.random().toString(36).substring(2, 9),
    stem: q.text,
    options: q.options,
    correctAnswer: q.options[q.correctIndex],
    box: 1 as 1,
    wrongCount: 0
  }));

  // Not strictly needed as Study Mode will parse the inputText on first load,
  // but good for immediate state.
  
  return packId;
}

export async function saveExamQuestions(packId: string, questions: ExamQuestion[]) {
  const userId = auth?.currentUser?.uid;
  
  if (!userId || !db) {
    localStore.saveQuestions(packId, questions);
    return;
  }

  try {
    const batch = writeBatch(db);
    questions.forEach(q => {
      const qRef = doc(collection(db, `users/${userId}/packs/${packId}/questions`));
      batch.set(qRef, {
        ...q,
        createdAt: serverTimestamp(),
        createdBy: userId
      });
    });
    
    // Update question count in pack
    const packRef = doc(db, `users/${userId}/packs/${packId}`);
    const packDoc = await getDoc(packRef);
    if (packDoc.exists()) {
      const currentCount = packDoc.data().questionCount || 0;
      batch.update(packRef, {
        questionCount: currentCount + questions.length,
        lastUpdated: serverTimestamp()
      });
    }

    await batch.commit();
  } catch (error) {
    console.error("Failed to save exam questions:", error);
    throw error;
  }
}

export async function loadExamQuestions(packId: string): Promise<ExamQuestion[]> {
  const userId = auth?.currentUser?.uid;
  
  if (!userId || !db) {
    return localStore.getQuestions(packId);
  }

  try {
    const qSnap = await getDocs(collection(db, `users/${userId}/packs/${packId}/questions`));
    return qSnap.docs.map(d => ({
      ...d.data(),
      id: d.id,
      createdAt: toMillis(d.data().createdAt)
    } as ExamQuestion));
  } catch (error) {
    console.error("Failed to load exam questions:", error);
    return [];
  }
}

export async function saveExamHistory(history: ExamHistory) {
  const userId = auth?.currentUser?.uid;
  const historyWithId = {
    ...history,
    id: history.id || Math.random().toString(36).substring(2, 11),
    createdAt: history.createdAt || Date.now()
  };

  if (!userId || !db) {
    localStore.saveExamResult(historyWithId);
    return historyWithId.id;
  }

  try {
    const historyRef = doc(collection(db, `users/${userId}/examHistory`));
    await setDoc(historyRef, {
      ...historyWithId,
      createdAt: serverTimestamp()
    });
    return historyRef.id;
  } catch (error) {
    console.error("Failed to save exam history:", error);
    throw error;
  }
}

export async function loadExamHistory(): Promise<ExamHistory[]> {
  const userId = auth?.currentUser?.uid;
  
  if (!userId || !db) {
    return localStore.getExamHistory();
  }

  try {
    const qSnap = await getDocs(query(collection(db, `users/${userId}/examHistory`), orderBy('createdAt', 'desc')));
    return qSnap.docs.map(d => ({
      ...d.data(),
      id: d.id,
      createdAt: toMillis(d.data().createdAt)
    } as unknown as ExamHistory));
  } catch (error) {
    console.error("Failed to load exam history:", error);
    return [];
  }
}

export async function loadHistoryItem(id: string): Promise<ExamHistory | null> {
  const userId = auth?.currentUser?.uid;
  
  if (!userId || !db) {
    return localStore.getHistoryItem(id);
  }

  try {
    const dSnap = await getDoc(doc(db, `users/${userId}/examHistory`, id));
    if (!dSnap.exists()) return null;
    return {
      ...dSnap.data(),
      id: dSnap.id,
      createdAt: toMillis(dSnap.data().createdAt)
    } as unknown as ExamHistory;
  } catch (error) {
    console.error("Failed to load history item:", error);
    return null;
  }
}

export async function getQuestionsByIds(packId: string, ids: string[]): Promise<ExamQuestion[]> {
  const userId = auth?.currentUser?.uid;
  if (!userId || !db) {
    const all = localStore.getQuestions(packId);
    return all.filter(q => q.id && ids.includes(q.id));
  }

  try {
    const qSnap = await getDocs(collection(db, `users/${userId}/packs/${packId}/questions`));
    return qSnap.docs
      .map(d => ({ ...d.data(), id: d.id } as ExamQuestion))
      .filter(q => ids.includes(q.id!));
  } catch (e) {
    return [];
  }
}

export async function findWeakPackByExamId(examId: string): Promise<QuizPack | null> {
  const userId = auth?.currentUser?.uid;
  if (!userId || !db) {
    const packs = localStore.getPacks();
    return packs.find(p => p.originalExamId === examId) || null;
  }

  try {
    const q = query(collection(db, `users/${userId}/packs`), where('originalExamId', '==', examId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { ...snap.docs[0].data(), id: snap.docs[0].id } as QuizPack;
  } catch (e) {
    return null;
  }
}

export async function ensureUserRecord(email: string) {
  if (!auth?.currentUser || !db) return;
  const path = `users/${auth.currentUser.uid}`;
  try {
    await setDoc(doc(db, path), {
      email,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("User record creation failed:", error);
  }
}
