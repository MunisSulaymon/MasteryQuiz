/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2,
} from 'lucide-react';
import { Question, QuizSet, AppView, QuizSession } from './types';
import { parseQuestions, splitIntoSets, parseSingleQuestion } from './utils';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ensureUserRecord, saveOverallProgress, saveQuestionState, saveAllQuestionStates, loadUserData } from './services/quizService';

// Import views directly to avoid lazy loading issues
import LandingView from './components/views/LandingView';
import SelectionView from './components/views/SelectionView';
import QuizView from './components/views/QuizView';
import SummaryView from './components/views/SummaryView';
import VictoryView from './components/views/VictoryView';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [inputText, setInputText] = useState('');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [setSize, setSetSize] = useState(20);
  const [activeSet, setActiveSet] = useState<QuizSet | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [drillSession, setDrillSession] = useState<QuizSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  // Derived Sets (Memoized)
  const sets = useMemo(() => splitIntoSets(allQuestions, setSize), [allQuestions, setSize]);

  // Load Stored Data from Firestore
  const loadStoredData = useCallback(async () => {
    setIsDataLoading(true);
    try {
      const data = await loadUserData();
      if (data && data.progress) {
        const { inputText: savedText, currentSetId, activeSetId, setSize: savedSize } = data.progress;
        if (savedSize) setSetSize(savedSize);
        setInputText(savedText);
        const parsed = parseQuestions(savedText);
        
        const questionsWithState = parsed.map(q => {
          const state = data.questionsState.get(q.id);
          if (state) {
            return { ...q, box: state.box, wrongCount: state.wrongCount };
          }
          return q;
        });

        setAllQuestions(questionsWithState);
        
        if (currentSetId) setView('selection');
        if (activeSetId) {
          const currentSets = splitIntoSets(questionsWithState, savedSize || 20);
          const set = currentSets.find(s => s.id === activeSetId);
          if (set) setActiveSet(set);
        }
      }
    } catch (err) {
      console.error("Load data error:", err);
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (u) {
        await ensureUserRecord(u.email || '');
        await loadStoredData();
      }
    });
    return unsubscribe;
  }, [loadStoredData]);

  // Sync Progress to Firestore
  useEffect(() => {
    if (user && inputText) {
      saveOverallProgress(inputText, sets.length > 0 ? 1 : 0, activeSet?.id || 0, setSize);
    }
  }, [user, inputText, activeSet, setSize, sets.length]);

  const handleLogin = useCallback(async () => {
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login error:", error);
      let message = "Failed to sign in with Google.";
      if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        message = "Login was cancelled.";
      }
      setAuthError(message);
      setIsAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    setInputText('');
    setAllQuestions([]);
    setActiveSet(null);
    setSession(null);
    setView('landing');
  }, []);

  const handleParse = useCallback(async () => {
    if (!inputText.trim()) return;
    
    setIsParsing(true);
    setParseProgress(0);
    setParseError(null);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const rawBlocks = inputText.split('++++');
      if (rawBlocks.length === 0) {
        setParseError("No valid question blocks found. Use '++++' to separate questions.");
        setIsParsing(false);
        return;
      }

      const questions: Question[] = [];
      const chunkSize = 20; 
      const now = Date.now();

      for (let i = 0; i < rawBlocks.length; i += chunkSize) {
        const chunk = rawBlocks.slice(i, i + chunkSize);
        for (let j = 0; j < chunk.length; j++) {
          const block = chunk[j].trim();
          if (!block) continue;
          const q = parseSingleQuestion(block, `q-${i + j}-${now}`);
          if (q) questions.push(q);
        }
        setParseProgress(Math.floor(((i + chunk.length) / rawBlocks.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (questions.length === 0) {
        setParseError("No valid questions found! Please ensure your input follows the '====' and '++++' format.");
        setIsParsing(false);
        return;
      }

      setAllQuestions(questions);
      setView('selection');
    } catch (err) {
      console.error("Parse error:", err);
      setParseError("An unexpected error occurred while parsing.");
    } finally {
      setIsParsing(false);
      setParseProgress(0);
    }
  }, [inputText]);

  const startSet = useCallback((set: QuizSet) => {
    setActiveSet(set);
    setSession({
      setId: set.id,
      questions: set.questions,
      startTime: Date.now(),
      rounds: 1
    });
    setView('quiz');
  }, []);

  const startDrill = useCallback((questions: Question[]) => {
    const initializedDrill = questions.map(q => ({
      ...q,
      box: 1 as 1 | 2 | 3,
    }));
    setDrillSession({
      setId: activeSet?.id || 0,
      questions: initializedDrill,
      startTime: Date.now(),
      rounds: 1
    });
    setView('drill');
  }, [activeSet?.id]);

  const handleUpdateQuestion = useCallback((q: Question) => {
    saveQuestionState(q);
    setAllQuestions(prev => prev.map(aq => aq.id === q.id ? q : aq));
  }, []);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Initializing Secure Connection...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#1A1A1A] font-sans">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LandingView 
                inputText={inputText} 
                setInputText={setInputText} 
                onParse={handleParse}
                user={user}
                onLogin={handleLogin}
                onLogout={handleLogout}
                isDataLoading={isDataLoading}
                sets={sets}
                isParsing={isParsing}
                parseProgress={parseProgress}
                parseError={parseError}
                authError={authError}
              />
            </motion.div>
          )}
          {view === 'selection' && (
            <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SelectionView 
                sets={sets} 
                onSelect={startSet} 
                onBack={() => setView('landing')}
                onLogout={handleLogout}
                user={user}
                setSize={setSize}
                setSetSize={setSetSize}
              />
            </motion.div>
          )}
          {(view === 'quiz' || view === 'drill') && (
            <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuizView 
                session={(view === 'quiz' ? session : drillSession)!} 
                onComplete={(finalSession) => {
                  if (view === 'quiz') {
                    setSession(finalSession);
                    setView('summary');
                  } else {
                    setView('victory');
                  }
                  saveAllQuestionStates(finalSession.questions);
                }}
                onBack={() => setView(view === 'quiz' ? 'selection' : 'summary')}
                onUpdateQuestion={handleUpdateQuestion}
                title={view === 'drill' ? "Weakness Drill" : undefined}
              />
            </motion.div>
          )}
          {view === 'victory' && (
            <motion.div key="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VictoryView onHome={() => setView('selection')} />
            </motion.div>
          )}
          {view === 'summary' && session && (
            <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SummaryView 
                session={session} 
                onRetry={() => startSet(activeSet!)}
                onNextSet={() => {
                  const next = sets.find(s => s.id === session.setId + 1);
                  if (next) startSet(next);
                  else setView('selection');
                }}
                onHome={() => setView('selection')}
                onLogout={handleLogout}
                user={user}
                onDrill={startDrill}
              />
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
