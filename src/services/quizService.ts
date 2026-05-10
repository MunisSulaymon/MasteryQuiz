import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Question, QuizSet } from '../types';

export async function saveOverallProgress(inputText: string, currentSetId: number, activeSetId: number, setSize: number) {
  if (!auth.currentUser) return;
  const path = `users/${auth.currentUser.uid}/config/progress`;
  try {
    await setDoc(doc(db, path), {
      inputText,
      currentSetId,
      activeSetId,
      setSize,
      lastUpdated: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveQuestionState(q: Question) {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const path = `users/${userId}/questions/${q.id}`;
  try {
    await setDoc(doc(db, path), {
      id: q.id,
      box: q.box,
      wrongCount: q.wrongCount,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAllQuestionStates(questions: Question[]) {
  if (!auth.currentUser || questions.length === 0) return;
  const userId = auth.currentUser.uid;
  const batch = writeBatch(db);
  
  questions.forEach(q => {
    const path = `users/${userId}/questions/${q.id}`;
    batch.set(doc(db, path), {
      id: q.id,
      box: q.box,
      wrongCount: q.wrongCount,
      lastUpdated: serverTimestamp(),
    });
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/questions/*`);
  }
}

export async function saveSetMastery(setId: number, rounds: number) {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;
  const path = `users/${userId}/sets/${setId}`;
  try {
    const setDocRef = doc(db, path);
    const setSnap = await getDoc(setDocRef);
    let bestRounds = rounds;
    if (setSnap.exists()) {
      const data = setSnap.data();
      if (data.bestRounds && data.bestRounds < rounds) {
        bestRounds = data.bestRounds;
      }
    }
    
    await setDoc(setDocRef, {
      setId,
      bestRounds,
      lastMastered: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function loadUserData() {
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;
  
  const progressPath = `users/${userId}/config/progress`;
  const questionsPath = `users/${userId}/questions`;
  const setsPath = `users/${userId}/sets`;
  
  try {
    const progressDoc = await getDoc(doc(db, progressPath));
    const questionsSnap = await getDocs(collection(db, questionsPath));
    const setsSnap = await getDocs(collection(db, setsPath));
    
    const questionsStateMap = new Map();
    questionsSnap.docs.forEach(doc => {
      const data = doc.data();
      questionsStateMap.set(data.id, { box: data.box, wrongCount: data.wrongCount });
    });

    const setsMasteryMap = new Map();
    setsSnap.docs.forEach(doc => {
      const data = doc.data();
      setsMasteryMap.set(Number(doc.id), { 
        bestRounds: data.bestRounds, 
        lastMastered: data.lastMastered?.toMillis() || Date.now() 
      });
    });

    return {
      progress: progressDoc.exists() ? progressDoc.data() : null,
      questionsState: questionsStateMap,
      setsMastery: setsMasteryMap
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/...`);
    return null;
  }
}

export async function ensureUserRecord(email: string) {
  if (!auth.currentUser) return;
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
