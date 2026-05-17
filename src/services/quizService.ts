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
  const packId = pack.id || Math.random().toString(36).substring(2, 11);
  const userId = auth?.currentUser?.uid || 'guest';
  const newPack = {
    ...pack,
    id: packId,
    createdAt: Date.now(),
    lastStudied: Date.now(),
    questionCount: pack.questionCount || 0,
  };

  // Update local cache FIRST for immediate UI feedback
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  saveToLocal(userId, 'packs', [newPack, ...cachedPacks]);

  if (db && auth?.currentUser) {
    const path = `users/${userId}/packs/${packId}`;
    try {
      await setDoc(doc(db, path), {
        ...newPack,
        createdAt: serverTimestamp(),
        lastStudied: serverTimestamp(),
      });
    } catch (error) {
      console.error("Firestore creation failed, kept in local storage", error);
      // We don't re-throw here to allow app to continue in "offline" mode
    }
  }
  
  return packId;
}

export async function updatePack(packId: string, updates: Partial<QuizPack>) {
  const userId = auth?.currentUser?.uid || 'guest';
  
  // Update local cache first
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  const updated = cachedPacks.map((p: QuizPack) => p.id === packId ? { ...p, ...updates } : p);
  saveToLocal(userId, 'packs', updated);

  if (db && auth?.currentUser) {
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
  const userId = auth?.currentUser?.uid || 'guest';
  
  // Update local cache first
  const cachedPacks = loadFromLocal(userId, 'packs') || [];
  saveToLocal(userId, 'packs', cachedPacks.filter((p: QuizPack) => p.id !== packId));
  localStorage.removeItem(getCacheKey(userId, `pack_${packId}_data`));

  if (db && auth?.currentUser) {
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
  const userId = auth?.currentUser?.uid || 'guest';
  
  // Update local cache first
  const packData = {
    questionsState: new Map(questions.map(q => [q.id, { box: q.box, wrongCount: q.wrongCount }])),
    setsMastery: setsMastery
  };
  saveToLocal(userId, `pack_${packId}_data`, { 
    ...packData, 
    questionsState: Array.from(packData.questionsState.entries()),
    setsMastery: Array.from(packData.setsMastery.entries())
  });

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
      console.error("Sync to cloud failed, progress saved locally", error);
      throw error; // keep throwing for sync UI status
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
  const userId = auth?.currentUser?.uid || 'guest';
  
  // Always fetch from Firestore if user is present to ensure multi-device sync
  if (!auth?.currentUser || !db) {
    const cached = loadFromLocal(userId, 'packs');
    if (cached) return { packs: cached };
    return { packs: [] };
  }

  // Try migration first but don't let it block
  try {
    await migrateUserData(userId);
  } catch (e) {
    console.warn("Migration failed or not needed", e);
  }

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
    if (cached) return { packs: cached };
    return { packs: [] };
  }
}

export async function loadPackData(packId: string, forceRefresh = false) {
  const userId = auth?.currentUser?.uid || 'guest';

  const cached = loadFromLocal(userId, `pack_${packId}_data`);
  
  // If guest or no DB, use local only
  if (!auth?.currentUser || !db) {
    if (cached) {
      return {
        questionsState: new Map(cached.questionsState),
        setsMastery: new Map(cached.setsMastery)
      };
    }
    return null;
  }

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
    } else if (cached) {
       // use cached if exists and cloud fail
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
    
    // Save to local
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
  const guestPacks = loadFromLocal('guest', 'packs');
  
  if (!guestPacks || guestPacks.length === 0) return false;

  try {
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
  } catch (e) {
    console.error("Guest sync failed", e);
    return false;
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
