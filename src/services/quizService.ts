import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  serverTimestamp,
  writeBatch,
  deleteDoc
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Question, QuizSet, QuizPack } from '../types';

// Local Storage Helpers
const CACHE_KEY_PREFIX = 'mastery_quiz_';

function getCacheKey(userId: string, suffix: string) {
  return `${CACHE_KEY_PREFIX}${userId}_${suffix}`;
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
  const packId = pack.id || Math.random().toString(36).substring(2, 11);
  const userId = auth?.currentUser?.uid || 'guest';
  const newPack = {
    ...pack,
    id: packId,
    createdAt: Date.now(),
    lastStudied: Date.now(),
    questionCount: pack.questionCount || 0,
  };

  if (db && auth?.currentUser) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      await setDoc(doc(db, path), {
        ...newPack,
        createdAt: serverTimestamp(),
        lastStudied: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Update local cache
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  saveToLocal(userId, 'packs', [newPack, ...cachedPacks]);
  
  return packId;
}

export async function updatePack(packId: string, updates: Partial<QuizPack>) {
  const userId = auth?.currentUser?.uid || 'guest';
  
  if (db && auth?.currentUser) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      await setDoc(doc(db, path), {
        ...updates,
        lastUpdated: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
  
  // Update local cache
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  const updated = cachedPacks.map((p: QuizPack) => p.id === packId ? { ...p, ...updates } : p);
  saveToLocal(userId, 'packs', updated);
}

export async function deletePack(packId: string) {
  const userId = auth?.currentUser?.uid || 'guest';
  
  if (db && auth?.currentUser) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, `${path}/data/questions`));
      batch.delete(doc(db, `${path}/data/sets`));
      batch.delete(doc(db, path));
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Update local cache
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  saveToLocal(userId, 'packs', cachedPacks.filter((p: QuizPack) => p.id !== packId));
  localStorage.removeItem(getCacheKey(userId, `pack_${packId}_data`));
}

export async function syncSessionData(packId: string, questions: Question[], setsMastery: Map<number, any>, inputText: string, setSize: number) {
  const userId = auth?.currentUser?.uid || 'guest';
  
  if (db && auth?.currentUser) {
    const packPath = `users/${userId}/packs/${packId}`;
    try {
      const batch = writeBatch(db);
      
      batch.set(doc(db, packPath), {
        inputText,
        setSize,
        questionCount: questions.length,
        lastStudied: serverTimestamp(),
      }, { merge: true });

      const questionsState = questions.map(q => ({ id: q.id, box: q.box, wrongCount: q.wrongCount }));
      batch.set(doc(db, `${packPath}/data/questions`), { 
        states: questionsState,
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
      handleFirestoreError(error, OperationType.WRITE, packPath);
    }
  }
  
  // Update local cache
  const packData = {
    questionsState: new Map(questions.map(q => [q.id, { box: q.box, wrongCount: q.wrongCount }])),
    setsMastery: setsMastery
  };
  saveToLocal(userId, `pack_${packId}_data`, { 
    ...packData, 
    questionsState: Array.from(packData.questionsState.entries()),
    setsMastery: Array.from(packData.setsMastery.entries())
  });
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
  const userId = auth?.currentUser?.uid || 'guest';
  
  if (!forceRefresh || !auth?.currentUser || !db) {
    const cached = loadFromLocal(userId, 'packs');
    if (cached) return { packs: cached };
  }

  if (!auth?.currentUser || !db) return { packs: [] };

  // Try migration first
  await migrateUserData(userId);

  const packsPath = `users/${userId}/packs`;
  try {
    const packsSnap = await getDocs(collection(db, packsPath));
    const packs: QuizPack[] = packsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        lastStudied: data.lastStudied?.toMillis() || Date.now(),
        deleteAt: data.deleteAt?.toMillis() || null,
      } as QuizPack;
    });

    saveToLocal(userId, 'packs', packs);
    return { packs };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/packs`);
    return null;
  }
}

export async function loadPackData(packId: string, forceRefresh = false) {
  const userId = auth?.currentUser?.uid || 'guest';

  if (!forceRefresh || !auth?.currentUser || !db) {
    const cached = loadFromLocal(userId, `pack_${packId}_data`);
    if (cached) {
      return {
        questionsState: new Map(cached.questionsState),
        setsMastery: new Map(cached.setsMastery)
      };
    }
  }

  if (!auth?.currentUser || !db) return null;

  const dataPath = `users/${userId}/packs/${packId}/data`;
  try {
    // Read optimized documents
    const [qSnap, sSnap] = await Promise.all([
      getDoc(doc(db, `${dataPath}/questions`)),
      getDoc(doc(db, `${dataPath}/sets`))
    ]);

    const questionsStateMap = new Map();
    if (qSnap.exists()) {
      const states = qSnap.data().states || [];
      states.forEach((s: any) => questionsStateMap.set(s.id, { box: s.box, wrongCount: s.wrongCount }));
    } else {
      // Fallback for old structure migration on the fly
      const oldQs = await getDocs(collection(db, `users/${userId}/packs/${packId}/questions`));
      oldQs.forEach(d => {
        const data = d.data();
        questionsStateMap.set(data.id, { box: data.box, wrongCount: data.wrongCount });
      });
    }

    const setsMasteryMap = new Map();
    if (sSnap.exists()) {
      const mastery = sSnap.data().mastery || {};
      Object.entries(mastery).forEach(([key, val]: [string, any]) => {
         setsMasteryMap.set(Number(key), val);
      });
    } else {
      // Fallback for old structure
      const oldSets = await getDocs(collection(db, `users/${userId}/packs/${packId}/sets`));
      oldSets.forEach(d => {
        const data = d.data();
        setsMasteryMap.set(Number(d.id), { 
          bestRounds: data.bestRounds, 
          lastMastered: data.lastMastered?.toMillis() || Date.now() 
        });
      });
    }

    const result = {
      questionsState: questionsStateMap,
      setsMastery: setsMasteryMap
    };
    
    // Save to local
    saveToLocal(userId, `pack_${packId}_data`, {
      questionsState: Array.from(questionsStateMap.entries()),
      setsMastery: Array.from(setsMasteryMap.entries())
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, dataPath);
    return null;
  }
}

export async function syncGuestDataToFirestore() {
  if (!auth?.currentUser || !db) return false;
  const userId = auth.currentUser.uid;
  const guestPacks = loadFromLocal('guest', 'packs');
  
  if (!guestPacks || guestPacks.length === 0) return false;

  const batch = writeBatch(db);
  
  for (const pack of guestPacks) {
    const packPath = `users/${userId}/packs/${pack.id}`;
    batch.set(doc(db, packPath), {
      ...pack,
      createdAt: serverTimestamp(),
      lastStudied: serverTimestamp(),
    });

    // Sync pack data (questions and sets)
    const guestData = loadFromLocal('guest', `pack_${pack.id}_data`);
    if (guestData) {
      const dataPath = `users/${userId}/packs/${pack.id}/data`;
      
      const questionsState = guestData.questionsState.map(([id, state]: [string, any]) => ({ id, ...state }));
      batch.set(doc(db, `${dataPath}/questions`), {
        states: questionsState,
        lastUpdated: serverTimestamp()
      });

      const setsMasteryObj: Record<string, any> = {};
      guestData.setsMastery.forEach(([key, val]: [number, any]) => {
        setsMasteryObj[key] = val;
      });
      batch.set(doc(db, `${dataPath}/sets`), {
        mastery: setsMasteryObj,
        lastUpdated: serverTimestamp()
      });

      // Update local storage for the user as well
      saveToLocal(userId, `pack_${pack.id}_data`, guestData);
    }
  }

  await batch.commit();
  
  // Update packs in user local storage
  saveToLocal(userId, 'packs', guestPacks);
  
  // Clear guest data
  localStorage.removeItem(getCacheKey('guest', 'packs'));
  guestPacks.forEach((p: QuizPack) => {
    localStorage.removeItem(getCacheKey('guest', `pack_${p.id}_data`));
  });

  return true;
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
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
