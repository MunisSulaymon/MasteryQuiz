/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trophy, 
  RotateCcw, 
  ArrowRight,
  ArrowLeft,
  ClipboardList,
  ChevronRight,
  Timer,
  LogIn,
  LogOut,
  Loader2,
  Zap,
  PartyPopper
} from 'lucide-react';
import { Question, QuizSet, AppView, QuizSession } from './types';
import { parseQuestions, splitIntoSets, shuffleArray, parseSingleQuestion } from './utils';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ensureUserRecord, saveOverallProgress, saveQuestionState, saveAllQuestionStates, loadUserData } from './services/quizService';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [inputText, setInputText] = useState('');
  const [sets, setSets] = useState<QuizSet[]>([]);
  const [activeSet, setActiveSet] = useState<QuizSet | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [drillSession, setDrillSession] = useState<QuizSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (u) {
        await ensureUserRecord(u.email || '');
        await loadStoredData();
      }
    });
    return unsubscribe;
  }, []);

  const loadStoredData = async () => {
    setIsDataLoading(true);
    const data = await loadUserData();
    if (data && data.progress) {
      const { inputText: savedText, currentSetId, activeSetId } = data.progress;
      setInputText(savedText);
      const parsed = parseQuestions(savedText);
      
      // Apply question states (box, wrongCount) from Firestore
      const questionsWithState = parsed.map(q => {
        const state = data.questionsState.get(q.id);
        if (state) {
          return { ...q, box: state.box, wrongCount: state.wrongCount };
        }
        return q;
      });

      const newSets = splitIntoSets(questionsWithState);
      setSets(newSets);
      
      if (currentSetId) {
        setView('selection');
      }
      if (activeSetId) {
        const set = newSets.find(s => s.id === activeSetId);
        if (set) {
          setActiveSet(set);
          // Don't auto-start quiz, let them see selection or just pick set
          // but we could auto-start if we wanted.
        }
      }
    }
    setIsDataLoading(false);
  };

  // Sync Progress to Firestore
  useEffect(() => {
    if (user && inputText) {
      saveOverallProgress(inputText, sets.length > 0 ? 1 : 0, activeSet?.id || 0);
    }
  }, [user, inputText, activeSet]);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setInputText('');
    setSets([]);
    setActiveSet(null);
    setSession(null);
    setView('landing');
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    
    setIsParsing(true);
    setParseProgress(0);
    setParseError(null);
    
    // Tiny delay to show the skeleton/loader
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const rawBlocks = inputText.split('++++');
      if (rawBlocks.length === 0) {
        setParseError("No valid question blocks found. Use '++++' to separate questions.");
        setIsParsing(false);
        return;
      }

      const questions: Question[] = [];
      const chunkSize = 20; // Small chunks for weak hardware
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
        
        // Yield to main thread
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (questions.length === 0) {
        setParseError("No valid questions found! Please ensure your input follows the '====' and '++++' format.");
        setIsParsing(false);
        return;
      }

      const newSets = splitIntoSets(questions);
      setSets(newSets);
      setView('selection');
    } catch (err) {
      console.error("Parse error:", err);
      setParseError("An unexpected error occurred while parsing. Please check your question format.");
    } finally {
      setIsParsing(false);
      setParseProgress(0);
    }
  };

  const startSet = (set: QuizSet) => {
    setActiveSet(set);
    setSession({
      setId: set.id,
      questions: set.questions, // already has states if loaded from DB
      startTime: Date.now(),
      rounds: 1
    });
    setView('quiz');
  };

  const startDrill = (questions: Question[]) => {
    const initializedDrill = questions.map(q => ({
      ...q,
      box: 1 as 1 | 2 | 3, // Reset box to 1 for the intense drill
      // wrongCount remains to track history if needed, but the drill focuses on current mastery
    }));
    setDrillSession({
      setId: activeSet?.id || 0,
      questions: initializedDrill,
      startTime: Date.now(),
      rounds: 1
    });
    setView('drill');
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
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
            />
          </motion.div>
        )}
        {view === 'quiz' && session && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuizView 
              session={session} 
              onComplete={(finalSession) => {
                setSession(finalSession);
                setView('summary');
                // Persist the final state
                saveAllQuestionStates(finalSession.questions);
              }}
              onBack={() => setView('selection')}
              onUpdateQuestion={(q, qs) => {
                saveQuestionState(q);
                // Also update sets to reflect box changes
                setSets(prev => prev.map(s => {
                  if (s.id === session.setId) {
                    return { ...s, questions: qs };
                  }
                  return s;
                }));
              }}
            />
          </motion.div>
        )}
        {view === 'drill' && drillSession && (
          <motion.div key="drill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <QuizView 
              session={drillSession} 
              onComplete={() => {
                setView('victory');
                saveAllQuestionStates(drillSession.questions);
              }}
              onBack={() => setView('summary')}
              onUpdateQuestion={(q) => {
                saveQuestionState(q);
              }}
              title="Weakness Drill"
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

// --- Component Views ---

interface LandingViewProps {
  inputText: string;
  setInputText: (v: string) => void;
  onParse: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isDataLoading: boolean;
  sets: QuizSet[];
  isParsing: boolean;
  parseProgress: number;
  parseError: string | null;
}
function LandingView({ inputText, setInputText, onParse, user, onLogin, onLogout, isDataLoading, sets, isParsing, parseProgress, parseError }: LandingViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">
      <div className="w-full flex justify-end mb-8">
        {user ? (
          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-full shadow-md border border-gray-100">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />}
            <span className="text-sm font-bold text-gray-600 hidden sm:inline">{user.email}</span>
            <button onClick={onLogout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-indigo-600 font-bold rounded-xl shadow-md border border-gray-100 transition-all"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In to Sync</span>
          </button>
        )}
      </div>

      <div className="bg-indigo-600 p-4 rounded-3xl mb-8 shadow-xl shadow-indigo-200">
        <ClipboardList className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-5xl font-black mb-6 tracking-tight">MasteryQuiz</h1>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl">
        Paste your questions below to start an adaptive mastery-based session. 
        We use the <span className="font-bold text-indigo-600">Leitner system</span> to ensure you 100% master every concept.
      </p>

      {isDataLoading && (
        <div className="flex items-center gap-2 text-indigo-600 font-bold mb-4 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Restoring your progress...</span>
        </div>
      )}

      {parseError && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 text-left">
          <XCircle className="w-6 h-6 flex-shrink-0" />
          <p className="font-medium">{parseError}</p>
        </div>
      )}

      <div className="w-full bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 mb-8 text-left">
        <textarea
          id="question-input"
          className="w-full h-80 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-all font-mono text-sm resize-none"
          placeholder="What is X?&#10;====&#10;Option A&#10;====&#10;#Option B (correct)&#10;====&#10;Option C&#10;====&#10;Option D&#10;++++&#10;..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      <button
        id="parse-btn"
        onClick={onParse}
        disabled={!inputText.trim() || isParsing}
        className="group relative px-12 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xl shadow-xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1 min-w-[280px]"
      >
        {isParsing ? (
          <>
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Parsing... {parseProgress}%</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full bg-white" 
                initial={{ width: 0 }}
                animate={{ width: `${parseProgress}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span>{sets.length > 0 ? 'Continue Quiz' : 'Build Your Quiz'}</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </button>
    </div>
  );
}

interface SelectionViewProps {
  sets: QuizSet[];
  onSelect: (s: QuizSet) => void;
  onBack: () => void;
  onLogout: () => void;
  user: User | null;
}
function SelectionView({ sets, onSelect, onBack, onLogout, user }: SelectionViewProps) {
  const totalQuestions = sets.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h2 className="text-4xl font-black mb-2">Select a Set</h2>
          <p className="text-gray-500">Found {totalQuestions} questions split into {sets.length} sets.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="px-6 py-3 bg-white hover:bg-gray-50 rounded-xl font-bold border border-gray-200 transition-all text-gray-600"
          >
            {user ? 'Edit Questions' : 'Paste Again'}
          </button>
          {user && (
            <button onClick={onLogout} className="p-3 bg-white hover:bg-red-50 text-red-500 rounded-xl border border-gray-200 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sets.map((set) => (
          <motion.button
            key={set.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(set)}
            className="group p-8 bg-white rounded-[2rem] border border-gray-100 shadow-lg hover:shadow-2xl transition-all flex flex-col items-start text-left relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 group-hover:bg-indigo-100 transition-colors" />
            <span className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-2">Set {set.id}</span>
            <h3 className="text-2xl font-bold mb-4">{set.questions.length} Questions</h3>
            <div className="flex gap-2 items-center text-gray-400 font-medium group-hover:text-indigo-600 transition-colors">
              <span>Start session</span>
              <Play className="w-4 h-4 fill-current" />
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

interface QuizViewProps {
  session: QuizSession;
  onComplete: (s: QuizSession) => void;
  onBack: () => void;
  onUpdateQuestion: (q: Question, allQuestions: Question[]) => void;
  title?: string;
}
function QuizView({ session, onComplete, onBack, onUpdateQuestion, title }: QuizViewProps) {
  const [questions, setQuestions] = useState<Question[]>([...session.questions]);
  const [currentQueue, setCurrentQueue] = useState<Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timer, setTimer] = useState(20);
  const [rounds, setRounds] = useState(session.rounds || 1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const masteredCount = questions.filter(q => q.box === 3).length;
  const total = questions.length;

  useEffect(() => {
    const box1 = questions.filter(q => q.box === 1);
    const box2 = questions.filter(q => q.box === 2);
    
    const queue: Question[] = [
      ...shuffleArray<Question>(box1),
      ...shuffleArray<Question>(box2)
    ];
    
    if (queue.length === 0) {
      onComplete({ ...session, questions, rounds, endTime: Date.now() });
      return;
    }

    setCurrentQueue(queue);
    nextInQueue(queue);
  }, [rounds]);

  const nextInQueue = (queue: Question[]) => {
    if (queue.length === 0) {
      setRounds(prev => prev + 1);
      return;
    }
    const next = queue[0];
    const newQueue = queue.slice(1);
    
    setActiveQuestion(next);
    setCurrentQueue(newQueue);
    setShuffledOptions(shuffleArray(next.options));
    setFeedback(null);
    setTimer(20);
    startTimer();
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          handleAnswer(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswer = (answer: string | null) => {
    if (feedback || !activeQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = answer === activeQuestion.correctAnswer;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    let updatedQ: Question | null = null;
    const updatedQuestions = questions.map(q => {
      if (q.id === activeQuestion.id) {
        updatedQ = {
          ...q,
          box: isCorrect ? (Math.min(3, q.box + 1) as 1 | 2 | 3) : (1 as 1 | 2 | 3),
          wrongCount: isCorrect ? q.wrongCount : q.wrongCount + 1,
        } as Question;
        return updatedQ;
      }
      return q;
    });
    
    setQuestions(updatedQuestions);
    if (updatedQ) {
      onUpdateQuestion(updatedQ, updatedQuestions);
    }

    setTimeout(() => {
      nextInQueue(currentQueue);
    }, 2000);
  };

  if (!activeQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white">
      <div className="bg-slate-800 p-2 md:p-4 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2 md:gap-4">
          <div className="flex items-center gap-2 md:gap-6">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Back to sets"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="flex items-center gap-1 md:gap-2 bg-indigo-500/20 px-2 md:px-3 py-1 rounded-lg border border-indigo-500/30">
              <ClipboardList className="w-3 h-3 md:w-4 md:h-4 text-indigo-400" />
              <span className="font-bold text-[10px] md:text-sm tracking-tight uppercase text-indigo-400 whitespace-nowrap">{title || `Set ${session.setId}`}</span>
            </div>
            <div className="flex items-center gap-1 md:gap-2 text-slate-400">
              <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />
              <span className="font-bold text-[10px] md:text-sm whitespace-nowrap">Round {rounds}</span>
            </div>
          </div>

          <div className="flex-1 min-w-[120px] md:max-w-sm order-3 md:order-2 w-full md:w-auto">
            <div className="flex justify-between text-[10px] md:text-xs font-bold mb-1 uppercase tracking-wider text-slate-400">
              <span className="hidden xs:inline">Progress</span>
              <span>{masteredCount} / {total} Mastered</span>
            </div>
            <div className="w-full h-1.5 md:h-3 bg-slate-700 rounded-full overflow-hidden">
              <motion.div 
                initial={false}
                animate={{ width: `${(masteredCount / total) * 100}%` }}
                className="h-full bg-emerald-500" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 order-2 md:order-3">
             <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl border md:border-2 transition-colors ${timer <= 5 ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-slate-700 border-slate-600 text-white'}`}>
               <Timer className={`w-4 h-4 md:w-5 md:h-5 ${timer <= 5 ? 'animate-pulse' : ''}`} />
               <span className="font-black text-sm md:text-xl tabular-nums">{timer}s</span>
             </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center overflow-y-auto p-3 md:p-6 bg-radial-gradient">
        <div className="max-w-4xl w-full py-2 md:py-8">
           <AnimatePresence mode="wait">
              <motion.div 
                key={activeQuestion.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="mb-4 md:mb-10"
              >
                <div className="flex items-center gap-3 mb-2 md:mb-6 font-bold uppercase tracking-widest text-[9px] md:text-sm">
                  <span className="px-2 py-0.5 border border-indigo-400/30 rounded text-indigo-400">Box {activeQuestion.box}</span>
                  <span className="text-slate-400">Question</span>
                </div>
                <h2 className={`font-black leading-tight text-center sm:text-left drop-shadow-sm ${
                  activeQuestion.stem.length > 200 ? 'text-sm md:text-2xl' : activeQuestion.stem.length > 100 ? 'text-base md:text-3xl' : 'text-xl md:text-4xl'
                }`}>
                  {activeQuestion.stem}
                </h2>
              </motion.div>
           </AnimatePresence>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              {shuffledOptions.map((opt, idx) => {
                const letters = ['A', 'B', 'C', 'D'];
                const isCorrect = opt === activeQuestion.correctAnswer;
                
                let btnClass = "bg-white/10 hover:bg-white/20 border-transparent text-white";
                if (feedback) {
                  if (isCorrect) btnClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
                  else if (feedback === 'wrong') btnClass = "bg-red-500/10 border-red-500/30 text-red-400 opacity-50";
                }

                return (
                  <motion.button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    disabled={!!feedback}
                    className={`group relative p-2.5 md:p-5 text-left rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-2.5 md:gap-5 ${btnClass}`}
                  >
                    <span className="flex-shrink-0 w-7 h-7 md:w-10 md:h-10 flex items-center justify-center bg-white/10 rounded-lg md:rounded-xl font-black text-xs md:text-lg group-hover:bg-white/20 transition-colors">
                      {letters[idx]}
                    </span>
                    <span className="text-sm md:text-xl font-bold leading-tight">{opt}</span>
                    
                    {feedback && isCorrect && <CheckCircle2 className="absolute right-3 md:right-6 w-5 h-5 md:w-8 md:h-8 text-emerald-500" />}
                    {feedback === 'wrong' && !isCorrect && <XCircle className="absolute right-3 md:right-6 w-5 h-5 md:w-8 md:h-8 text-red-500 opacity-30" />}
                  </motion.button>
                );
              })}
           </div>

           <AnimatePresence>
             {feedback && (
               <motion.div 
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className={`mt-6 p-4 md:p-6 rounded-xl md:rounded-2xl border flex items-center gap-3 md:gap-4 ${feedback === 'correct' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-100' : 'bg-red-500/10 border-red-500/50 text-red-100'}`}
               >
                 {feedback === 'correct' ? (
                   <>
                     <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
                     <div>
                       <p className="font-black text-lg md:text-xl mb-0.5 md:mb-1 text-white">CORRECT!</p>
                       <p className="text-xs md:text-sm font-medium opacity-90">Moving to Box {Math.min(3, activeQuestion.box + 1)}</p>
                     </div>
                   </>
                 ) : (
                   <>
                     <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-400" />
                     <div>
                       <p className="font-black text-lg md:text-xl mb-0.5 md:mb-1 text-white">WRONG!</p>
                       <p className="text-xs md:text-sm font-medium opacity-90 text-left">Correct answer was: <span className="font-black">{activeQuestion.correctAnswer}</span>. Returned to Box 1.</p>
                     </div>
                   </>
                 )}
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface SummaryViewProps {
  session: QuizSession;
  onRetry: () => void;
  onNextSet: () => void;
  onHome: () => void;
  user: User | null;
  onLogout: () => void;
  onDrill: (questions: Question[]) => void;
}
function SummaryView({ session, onRetry, onNextSet, onHome, user, onLogout, onDrill }: SummaryViewProps) {
  const duration = Math.floor((session.endTime! - session.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  
  const troublesome = useRef(session.questions
    .filter(q => q.wrongCount >= 3)
    .sort((a, b) => b.wrongCount - a.wrongCount)).current;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      <div className="inline-flex bg-emerald-100 p-6 rounded-full mb-8">
        <Trophy className="w-16 h-16 text-emerald-600" />
      </div>
      <h2 className="text-5xl font-black mb-4">Set Complete!</h2>
      <p className="text-xl text-gray-500 mb-12">You've reached 100% mastery on this set.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-left">
          <Clock className="w-8 h-8 text-indigo-600 mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Time Spent</p>
          <p className="text-3xl font-black">{minutes}m {seconds}s</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-left">
          <RotateCcw className="w-8 h-8 text-indigo-600 mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Total Rounds</p>
          <p className="text-3xl font-black">{session.rounds} Rounds</p>
        </div>
      </div>

      {troublesome.length > 0 && (
        <div className="bg-orange-50 p-8 rounded-3xl border border-orange-100 mb-16 mx-4">
          <div className="flex items-center gap-3 mb-6">
            <XCircle className="w-6 h-6 text-orange-600" />
            <h3 className="text-xl font-bold text-orange-900">Troublesome Questions</h3>
          </div>
          <div className="space-y-4 mb-8">
            {troublesome.map(q => (
              <div key={q.id} className="flex justify-between items-center py-2 border-b border-orange-200/50 last:border-0 text-left">
                <span className="text-orange-900 font-medium truncate pr-4">{q.stem}</span>
                <span className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-black shrink-0">{q.wrongCount} WRONG</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onDrill(troublesome)}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-lg shadow-lg transition-all flex items-center justify-center gap-3"
          >
            <Zap className="w-6 h-6 fill-current" />
            <span>Drill Weak Questions ({troublesome.length})</span>
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
        <button
          onClick={onNextSet}
          className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span>Next Set</span>
          <ArrowRight className="w-6 h-6" />
        </button>
        <button
          onClick={onRetry}
          className="w-full sm:w-auto px-10 py-5 bg-white text-gray-700 border-2 border-gray-100 rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all"
        >
          Retry This Set
        </button>
        <button
          onClick={onHome}
          className="w-full sm:w-auto px-10 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all"
        >
          Sets Menu
        </button>
      </div>
    </div>
  );
}

function VictoryView({ onHome }: { onHome: () => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center">
      <motion.div 
        initial={{ scale: 0, rotate: -45 }} 
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10 }}
        className="bg-yellow-400 p-10 rounded-full mb-12 shadow-2xl shadow-yellow-200"
      >
        <PartyPopper className="w-24 h-24 text-white" />
      </motion.div>
      <h1 className="text-6xl font-black mb-6 tracking-tight text-slate-900">Victory!</h1>
      <p className="text-2xl text-gray-600 mb-12 max-w-2xl">
        You conquered your weak spots! All difficult concepts have been mastered through intense repetition.
      </p>
      <div className="flex gap-4">
        <button
          onClick={onHome}
          className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
        >
          <RotateCcw className="w-6 h-6" />
          <span>Back to Menu</span>
        </button>
      </div>
    </div>
  );
}
