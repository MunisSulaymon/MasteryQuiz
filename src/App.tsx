/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2,
} from 'lucide-react';
import { Question, QuizSet, AppView, QuizSession, QuizPack, SyncStatus } from './types';
import { parseQuestions, splitIntoSets, parseSingleQuestion } from './utils';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { 
  ensureUserRecord, 
  loadUserData, 
  createPack,
  updatePack,
  deletePack,
  loadPackData,
  syncSessionData,
  syncGuestDataToFirestore
} from './services/quizService';
import { RefreshCcw, Check, Cloud, CloudOff, Info, X } from 'lucide-react';

// Import views
import LandingView from './components/views/LandingView';
import SelectionView from './components/views/SelectionView';
import QuizView from './components/views/QuizView';
import SummaryView from './components/views/SummaryView';
import VictoryView from './components/views/VictoryView';
import PacksView from './components/views/PacksView';
import PackModal from './components/modals/PackModal';
import ConfirmModal from './components/modals/ConfirmModal';

export default function App() {
  const [view, setView] = useState<AppView>('landing');
  const [packs, setPacks] = useState<QuizPack[]>([]);
  const [activePack, setActivePack] = useState<QuizPack | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  
  const [inputText, setInputText] = useState('');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [setSize, setSetSize] = useState(20);
  const [activeSet, setActiveSet] = useState<QuizSet | null>(null);
  const [session, setSession] = useState<QuizSession | null>(null);
  const [drillSession, setDrillSession] = useState<QuizSession | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [showBenefitsModal, setShowBenefitsModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);

  const [setsMastery, setSetsMastery] = useState<Map<number, { bestRounds: number, lastMastered: number }>>(new Map());
  
  const [showPackModal, setShowPackModal] = useState(false);
  const [editingPack, setEditingPack] = useState<QuizPack | null>(null);
  const [deletingPack, setDeletingPack] = useState<QuizPack | null>(null);

  // Derived Sets (Memoized)
  const sets = useMemo(() => {
    const rawSets = splitIntoSets(allQuestions, setSize);
    return rawSets.map(s => ({
      ...s,
      mastery: setsMastery.get(s.id)
    }));
  }, [allQuestions, setSize, setsMastery]);

  const loadInitialData = useCallback(async (force = false) => {
    setIsDataLoading(true);
    setSyncStatus('syncing');
    try {
      const data = await loadUserData(force);
      if (data && data.packs) {
        setPacks(data.packs);
        setView('packs');
        setSyncStatus(user ? 'synced' : 'offline');
      }
    } catch (err) {
      console.error("Load initial data error:", err);
      setSyncStatus('offline');
    } finally {
      setIsDataLoading(false);
    }
  }, [user]);

  const handleSelectPack = useCallback(async (pack: QuizPack) => {
    setActivePack(pack);
    setIsDataLoading(true);
    setSyncStatus('syncing');
    try {
      const data = await loadPackData(pack.id);
      setInputText(pack.inputText || '');
      setSetSize(pack.setSize || 20);
      
      const parsed = parseQuestions(pack.inputText || '');
      const questionsWithState = parsed.map(q => {
        const state = data?.questionsState.get(q.id);
        if (state) {
          return { ...q, box: state.box, wrongCount: state.wrongCount };
        }
        return q;
      });

      setAllQuestions(questionsWithState);
      if (data?.setsMastery) {
        setSetsMastery(data.setsMastery);
      }

      setSyncStatus('synced');
      if (questionsWithState.length > 0) {
        setView('selection');
      } else {
        setView('landing');
      }
    } catch (err) {
      console.error("Load pack data error:", err);
      setSyncStatus('offline');
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const handleCreateOrUpdatePack = async (packData: Partial<QuizPack>) => {
    if (editingPack) {
      await updatePack(editingPack.id, packData);
      setPacks(prev => prev.map(p => p.id === editingPack.id ? { ...p, ...packData } : p));
    } else {
      const newId = await createPack(packData);
      if (newId) {
        setPacks(prev => [{ ...packData, id: newId, createdAt: Date.now(), lastStudied: Date.now(), questionCount: 0 } as QuizPack, ...prev]);
      }
    }
    setShowPackModal(false);
    setEditingPack(null);
  };

  const handleDeletePack = async () => {
    if (!deletingPack) return;
    setIsDataLoading(true);
    setSyncStatus('syncing');
    try {
      await deletePack(deletingPack.id);
      setPacks(prev => prev.filter(p => p.id !== deletingPack.id));
      if (activePack?.id === deletingPack.id) {
         setActivePack(null);
         setView('packs');
      }
      setSyncStatus(user ? 'synced' : 'offline');
    } catch (err) {
      console.error("Delete pack failed:", err);
      setSyncStatus('offline');
      // If it fails on server, still update local if we can or tell user
      alert("Note: Cloud deletion failed, but pack removed from view. Sync might resolve later.");
      setPacks(prev => prev.filter(p => p.id !== deletingPack.id));
    } finally {
      setDeletingPack(null);
      setIsDataLoading(false);
    }
  };

  const handleExtendPack = async (pack: QuizPack) => {
    const newDeleteAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    await updatePack(pack.id, { deleteAt: newDeleteAt });
    setPacks(prev => prev.map(p => p.id === pack.id ? { ...p, deleteAt: newDeleteAt } : p));
  };

  // Auth Listener
  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      loadInitialData();
      return;
    }
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setIsAuthLoading(false);
      if (u) {
        try {
          await ensureUserRecord(u.email || '');
          const synced = await syncGuestDataToFirestore();
          if (synced) {
            setShowSyncSuccess(true);
            setTimeout(() => setShowSyncSuccess(false), 3000);
          }
        } catch (e) {
          console.error("User record sync failed", e);
        }
      }
      loadInitialData();
    });
    return unsubscribe;
  }, [loadInitialData]);

  const handleSaveProgress = useCallback(async (finalQuestions?: Question[]) => {
    if (!activePack) return;
    setSyncStatus('syncing');
    
    try {
      const questionsToSync = finalQuestions || allQuestions;
      
      // Update local mastery if needed
      let currentMastery = setsMastery;
      if (activeSet && session && session.mode === 'leitner') {
         const setIds = new Set(activeSet.questions.map(sq => sq.id));
         const relevantQuestions = questionsToSync.filter(q => setIds.has(q.id));
         
         if (relevantQuestions.length > 0 && relevantQuestions.every(q => q.box === 3)) {
            setSetsMastery(prev => {
              const next = new Map(prev);
              const current = prev.get(activeSet.id!);
              const bestRounds = current ? Math.min(current.bestRounds, session.rounds) : session.rounds;
              next.set(activeSet.id!, { bestRounds, lastMastered: Date.now() });
              currentMastery = next;
              return next;
            });
         }
      }

      // Sync everything in one batched call
      await syncSessionData(activePack.id, questionsToSync, currentMastery, inputText, setSize);
      
      // Update active pack question count
      if (activePack.questionCount !== questionsToSync.length) {
         setPacks(prev => prev.map(p => p.id === activePack.id ? { ...p, questionCount: questionsToSync.length } : p));
      }

      setSyncStatus(user ? 'synced' : 'offline');
    } catch (err) {
      console.error("Delayed save error:", err);
      setSyncStatus('offline');
    }
  }, [user, activePack, inputText, setSize, activeSet, session, allQuestions, setsMastery]);

  const handleLogin = useCallback(async () => {
    if (!auth) {
      setAuthError("Firebase is not configured. Please add your API keys in the Settings menu.");
      return;
    }
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login error:", error);
      let message = `Failed to sign in: ${error.message || 'Unknown error'}`;
      if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
      }
      setAuthError(message);
      alert(message); // Force visibility
      setIsAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    if (auth) await signOut(auth);
    setInputText('');
    setAllQuestions([]);
    setActiveSet(null);
    setSession(null);
    setPacks([]);
    setActivePack(null);
    setView('landing');
  }, []);

  const handleParse = useCallback(async () => {
    if (!inputText.trim() || !activePack) return;
    
    setIsParsing(true);
    setParseProgress(0);
    setParseError(null);
    
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const questions = parseQuestions(inputText);
      console.log("Parsed questions count:", questions.length);
      
      if (questions.length === 0) {
        setParseError(`Found no valid questions. Make sure questions start for the first line and use ==== for options and ++++ between questions.`);
        setIsParsing(false);
        return;
      }

      setAllQuestions(questions);
      
      // Sync initial pack info
      await syncSessionData(activePack.id, questions, setsMastery, inputText, setSize);
      
      setView('selection');
    } catch (err) {
      console.error("Parse error:", err);
      setParseError("An unexpected error occurred while parsing.");
    } finally {
      setIsParsing(false);
      setParseProgress(0);
    }
  }, [inputText, activePack, setSize, setsMastery]);

  const startSet = useCallback((set: QuizSet, mode: 'leitner' | 'quick-test' = 'leitner') => {
    setActiveSet(set);
    setSession({
      setId: set.id,
      questions: set.questions,
      startTime: Date.now(),
      rounds: 1,
      mode
    });
    setView('quiz');
  }, []);

  const resetSetAndStart = useCallback((set: QuizSet) => {
    const updatedQuestions = set.questions.map(q => ({ ...q, box: 1 as 1 | 2 | 3 }));
    const qIds = new Set(updatedQuestions.map(q => q.id));
    setAllQuestions(prev => prev.map(q => qIds.has(q.id) ? { ...q, box: 1 as 1 | 2 | 3 } : q));
    startSet({ ...set, questions: updatedQuestions }, 'leitner');
  }, [startSet]);

  const startDrill = useCallback((questions: Question[]) => {
    const initializedDrill = questions.map(q => ({ ...q, box: 1 as 1 | 2 | 3 }));
    setDrillSession({
      setId: activeSet?.id || 0,
      questions: initializedDrill,
      startTime: Date.now(),
      rounds: 1,
      mode: 'leitner'
    });
    setView('drill');
  }, [activeSet?.id]);

  const handleUpdateQuestion = useCallback((q: Question) => {
    setAllQuestions(prev => prev.map(aq => aq.id === q.id ? q : aq));
  }, []);

  const handleComplete = useCallback((finalSession: QuizSession) => {
    if (view === 'quiz') {
      setSession(finalSession);
      setView('summary');
    } else {
      setView('victory');
      handleSaveProgress(finalSession.questions);
    }
  }, [view, handleSaveProgress]);

  const handleRefresh = useCallback(() => {
    loadInitialData(true);
  }, [loadInitialData]);

  const WelcomeSyncBanner = () => {
    if (user || bannerDismissed) return null;
    return (
      <motion.div 
        initial={{ y: -100 }} animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-[60] bg-indigo-600 text-white p-3 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-3 ml-4">
          <Cloud className="w-5 h-5 text-indigo-200" />
          <p className="text-sm font-bold tracking-tight">
            Want to study on multiple devices? <span className="hidden sm:inline">Sign in to sync your packs.</span>
          </p>
        </div>
        <div className="flex items-center gap-3 mr-4">
          <button 
            onClick={() => setShowBenefitsModal(true)}
            className="px-4 py-1.5 bg-white text-indigo-600 rounded-full text-xs font-black uppercase hover:bg-indigo-50 transition-colors"
          >
            Sign In
          </button>
          <button onClick={() => setBannerDismissed(true)} className="p-1 hover:text-indigo-200">
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    );
  };

  const BenefitsModal = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setShowBenefitsModal(false)}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-6">
          <button onClick={() => setShowBenefitsModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-2">
            <Cloud className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-none text-gray-900">Sync Your Progress</h2>
          <p className="text-gray-500 font-medium">Keep your study data safe and accessible everywhere.</p>
          
          <div className="w-full space-y-4 text-left">
            {[
              { icon: Check, text: "Seamlessly sync between phone and laptop" },
              { icon: Check, text: "Never lose your data, even if you clear browser" },
              { icon: Check, text: "Study offline and sync when reconnected" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>

          <button 
            onClick={() => { setShowBenefitsModal(false); handleLogin(); }}
            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-100 active:scale-95 flex items-center justify-center gap-3"
          >
            Sign In with Google
          </button>
        </div>
      </motion.div>
    </div>
  );

  const SyncIndicator = () => (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-2xl border border-gray-100 ring-4 ring-gray-900/5 select-none">
      {syncStatus === 'syncing' ? (
        <>
          <RefreshCcw className="w-4 h-4 text-indigo-500 animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 italic">Syncing...</span>
        </>
      ) : syncStatus === 'offline' ? (
        <>
          <CloudOff className="w-4 h-4 text-orange-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">{user ? 'Offline - Saved Locally' : 'Guest - Local Storage only'}</span>
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Synced</span>
        </>
      )}
      {user && (
        <button 
          onClick={handleRefresh}
          title="Sync now"
          className="ml-2 hover:scale-110 transition-transform active:rotate-180 duration-500"
        >
          <RefreshCcw className="w-3 h-3 text-gray-400" />
        </button>
      )}
    </div>
  );

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
        <p className="text-gray-500 font-bold animate-pulse">Loading App...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-[#1A1A1A] font-sans">
      <WelcomeSyncBanner />
      <SyncIndicator />
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {showSyncSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-black text-sm uppercase tracking-widest flex items-center gap-3"
          >
            <Check className="w-5 h-5" />
            Progress synced!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showBenefitsModal && <BenefitsModal />}
        {showPackModal && (
          <PackModal 
            onClose={() => { setShowPackModal(false); setEditingPack(null); }}
            onSave={handleCreateOrUpdatePack}
            initialPack={editingPack || undefined}
          />
        )}
        {deletingPack && (
          <ConfirmModal 
            title="Delete Pack"
            message={`Are you sure? This will delete all sets and ${deletingPack.questionCount} questions permanently.`}
            confirmLabel="Delete Permanently"
            onConfirm={handleDeletePack}
            onCancel={() => setDeletingPack(null)}
          />
        )}
      </AnimatePresence>

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
                onClearAuthError={() => setAuthError(null)}
                onBack={() => setView('packs')}
              />
            </motion.div>
          )}
          {view === 'packs' && (
            <motion.div key="packs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PacksView 
                packs={packs}
                onSelect={handleSelectPack}
                onCreate={() => setShowPackModal(true)}
                onEdit={(p) => { setEditingPack(p); setShowPackModal(true); }}
                onDelete={(p) => setDeletingPack(p)}
                onLogout={handleLogout}
                user={user}
                onExtend={handleExtendPack}
              />
            </motion.div>
          )}
          {view === 'selection' && (
            <motion.div key="selection" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SelectionView 
                sets={sets} 
                onSelect={(s) => startSet(s, 'leitner')}
                onQuickTest={(s) => startSet(s, 'quick-test')}
                onResetSet={resetSetAndStart}
                onBack={() => setView('packs')}
                onLogout={handleLogout}
                user={user}
                setSize={setSize}
                setSetSize={setSetSize}
                onEditPack={() => setView('landing')}
              />
            </motion.div>
          )}
          {(view === 'quiz' || view === 'drill') && (
            <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <QuizView 
                session={(view === 'quiz' ? session : drillSession)!} 
                onComplete={handleComplete}
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
                onRetry={() => {
                  const isMastered = activeSet!.questions.every(q => q.box === 3);
                  if (isMastered) resetSetAndStart(activeSet!);
                  else startSet(activeSet!, 'leitner');
                }}
                onNextSet={() => {
                  const next = sets.find(s => s.id === session.setId + 1);
                  if (next) startSet(next, 'leitner');
                  else setView('selection');
                }}
                onHome={() => setView('selection')}
                onLogout={handleLogout}
                user={user}
                onDrill={startDrill}
                onSave={handleSaveProgress}
                previousBest={setsMastery.get(session.setId)?.bestRounds}
              />
            </motion.div>
          )}
        </AnimatePresence>
    </div>
  );
}
