import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getAuthInstance, getDb, handleFirestoreError, OperationType } from '../lib/firebase';
import { Question, QuizSet } from '../types';

export async function saveOverallProgress(inputText: string, currentSetId: number, activeSetId: number, setSize: number) {
  const auth = getAuthInstance();
  const db = getDb();
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
  const auth = getAuthInstance();
  const db = getDb();
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
  const auth = getAuthInstance();
  const db = getDb();
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

export async function loadUserData() {
  const auth = getAuthInstance();
  const db = getDb();
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;
  
  const progressPath = `users/${userId}/config/progress`;
  const questionsPath = `users/${userId}/questions`;
  
  try {
    const progressDoc = await getDoc(doc(db, progressPath));
    const questionsSnap = await getDocs(collection(db, questionsPath));
    
    const questionsStateMap = new Map();
    questionsSnap.docs.forEach(doc => {
      const data = doc.data();
      questionsStateMap.set(data.id, { box: data.box, wrongCount: data.wrongCount });
    });

    return {
      progress: progressDoc.exists() ? progressDoc.data() : null,
      questionsState: questionsStateMap
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/...`);
    return null;
  }
}

export async function ensureUserRecord(email: string) {
  const auth = getAuthInstance();
  const db = getDb();
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
