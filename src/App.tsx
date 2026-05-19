/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2,
} from 'lucide-react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Question, QuizSet, AppView, QuizSession, QuizPack, SyncStatus } from './types';
import { parseQuestions, splitIntoSets, parseSingleQuestion } from './utils';
import { auth } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { dataService } from './services/dataService';
import { RefreshCcw, Check, Cloud, CloudOff, Info, X } from 'lucide-react';

// Import views
const PortalPage = lazy(() => import('./components/views/PortalPage'));
const ExamDashboard = lazy(() => import('./components/views/ExamDashboard'));
const ExamScreen = lazy(() => import('./components/views/ExamScreen'));
const ExamResults = lazy(() => import('./components/views/ExamResults'));
import LandingView from './components/views/LandingView';
import SelectionView from './components/views/SelectionView';
import QuizView from './components/views/QuizView';
import SummaryView from './components/views/SummaryView';
import VictoryView from './components/views/VictoryView';
import PacksView from './components/views/PacksView';
import PackModal from './components/modals/PackModal';
import ConfirmModal from './components/modals/ConfirmModal';
import MigrationModal from './components/modals/MigrationModal';
import { localStore } from './utils/localStore';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [guestStats, setGuestStats] = useState({ packCount: 0, questionCount: 0 });

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
      const packs = await dataService.getPacks();
      setPacks(packs);
      if (view === 'landing' || (view === 'packs' && packs.length > 0)) {
         setView('packs');
      }
      setSyncStatus(user ? 'synced' : 'offline');
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
      // Get state and questions
      const [allLoadedQuestions, data] = await Promise.all([
        dataService.loadAllQuestionsForStudy(pack.id),
        dataService.getStudyState(pack.id)
      ]);
      
      setInputText(pack.inputText || '');
      setSetSize(pack.setSize || 20);
      
      const parsedFromText = parseQuestions(pack.inputText || '');
      
      // Merge: unique by stem or ID
      const questionMap = new Map<string, Question>();
      
      // Add discrete questions first (usually higher quality/stable)
      allLoadedQuestions.forEach(q => questionMap.set(q.id, q));
      
      // Add parsed questions (only if same stem doesn't exist to avoid duplicates)
      parsedFromText.forEach(pq => {
        const fingerPrint = pq.stem.trim().toLowerCase();
        const exists = Array.from(questionMap.values()).some(v => v.stem.trim().toLowerCase() === fingerPrint);
        if (!exists) {
          questionMap.set(pq.id, pq);
        }
      });

      const mergedQuestions = Array.from(questionMap.values());
      const stateMap = data?.questionsState ? new Map<string, { box: number, wrongCount: number }>(data.questionsState as any) : null;

      const questionsWithState = mergedQuestions.map(q => {
        const state = stateMap?.get(q.id);
        if (state) {
          return { ...q, box: state.box as 1 | 2 | 3, wrongCount: state.wrongCount };
        }
        return q;
      });

      setAllQuestions(questionsWithState);
      if (data?.setsMastery) {
        setSetsMastery(new Map(data.setsMastery));
      }

      setSyncStatus(user ? 'synced' : 'offline');
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
  }, [user]);

  const handleCreateOrUpdatePack = async (packData: Partial<QuizPack>) => {
    setSyncStatus('syncing');
    try {
      const packId = editingPack ? editingPack.id : (packData.id || Math.random().toString(36).substring(2, 11));
      const fullPack: QuizPack = {
        ...packData,
        id: packId,
        name: packData.name || 'New Pack',
        color: packData.color || 'indigo',
        createdAt: editingPack ? editingPack.createdAt : Date.now(),
        lastStudied: Date.now(),
        questionCount: editingPack ? editingPack.questionCount : 0,
        setSize: packData.setSize || 20,
        inputText: packData.inputText || ''
      } as QuizPack;

      await dataService.savePack(fullPack);
      
      if (editingPack) {
        setPacks(prev => prev.map(p => p.id === editingPack.id ? fullPack : p));
      } else {
        setPacks(prev => [fullPack, ...prev]);
      }
      
      setSyncStatus(user ? 'synced' : 'offline');
      setShowPackModal(false);
      setEditingPack(null);
    } catch (err: any) {
      console.error("Save pack failed:", err);
      setSyncStatus('offline');
      alert(`Failed to save pack: ${err.message}`);
    }
  };

  const handleDeletePack = async () => {
    if (!deletingPack) return;
    const packToDelete = deletingPack;
    setDeletingPack(null);
    setIsDataLoading(true);
    setSyncStatus('syncing');
    
    try {
      await dataService.deletePack(packToDelete.id);
      setPacks(prev => prev.filter(p => p.id !== packToDelete.id));
      if (activePack?.id === packToDelete.id) {
         setActivePack(null);
         setView('packs');
      }
      setSyncStatus(user ? 'synced' : 'offline');
    } catch (err: any) {
      console.error("Delete pack failed:", err);
      setSyncStatus('offline');
      alert(`Deletion failed: ${err.message}`);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleExtendPack = async (pack: QuizPack) => {
    const newDeleteAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    const updated = { ...pack, deleteAt: newDeleteAt };
    await dataService.savePack(updated);
    setPacks(prev => prev.map(p => p.id === pack.id ? updated : p));
  };

  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      loadInitialData();
      return;
    }
    setIsAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const prevUser = user;
      setUser(u);
      setIsAuthLoading(false);
      
      if (u && !prevUser) {
        // Just signed in, offer sync
        const currentPacks = await dataService.getPacks();
        if (currentPacks.length > 0) {
          const totalQs = currentPacks.reduce((acc, p) => acc + (p.questionCount || 0), 0);
          setGuestStats({ packCount: currentPacks.length, questionCount: totalQs });
          setShowMigrationModal(true);
        }
      }
      loadInitialData();
    });
    return unsubscribe;
  }, [loadInitialData, user]);

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const success = await dataService.syncToCloud();
      if (success) {
        setShowSyncSuccess(true);
        setTimeout(() => setShowSyncSuccess(false), 3000);
        await loadInitialData();
      }
    } catch (e) {
      console.error("Migration failed", e);
    } finally {
      setIsMigrating(false);
      setShowMigrationModal(false);
    }
  };

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

      const studyData = {
        questionsState: questionsToSync.map(q => [q.id, { box: q.box, wrongCount: q.wrongCount }]),
        setsMastery: Array.from(currentMastery.entries()),
      };

      await dataService.saveStudyState(activePack.id, studyData);
      
      // Update active pack question count if needed
      if (activePack.questionCount !== questionsToSync.length) {
         const updatedPack = { ...activePack, questionCount: questionsToSync.length };
         await dataService.savePack(updatedPack);
         setPacks(prev => prev.map(p => p.id === activePack.id ? updatedPack : p));
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
      const studyData = {
        questionsState: questions.map(q => [q.id, { box: q.box, wrongCount: q.wrongCount }]),
        setsMastery: Array.from(setsMastery.entries()),
      };
      await dataService.saveStudyState(activePack.id, studyData);
      
      // Update pack's inputText and questionCount
      const updatedPack = { ...activePack, inputText, setSize, questionCount: questions.length, lastStudied: Date.now() };
      await dataService.savePack(updatedPack);
      
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

  const handleRefresh = useCallback(async () => {
    setIsDataLoading(true);
    setSyncStatus('syncing');
    try {
      await loadInitialData(true);
      if (activePack) {
        await handleSelectPack(activePack);
      }
      setSyncStatus(user ? 'synced' : 'offline');
    } catch (err) {
      console.error("Refresh error:", err);
      setSyncStatus('offline');
    } finally {
      setIsDataLoading(false);
    }
  }, [loadInitialData, activePack, handleSelectPack, user]);

  // Refresh when returning to tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        handleRefresh();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, handleRefresh]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const weakPackId = params.get('weak');
    if (weakPackId && packs.length > 0) {
      const pack = packs.find(p => p.id === weakPackId);
      if (pack) {
        handleSelectPack(pack);
        // Clear param after handling to avoid re-triggering?
        // Actually it's fine if we stay in that view.
      }
    }
  }, [location.search, packs.length]);

  const WelcomeSyncBanner = () => {
    if (user || bannerDismissed) return null;
    return (
      <motion.div 
        initial={{ y: -100 }} animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600 text-white p-3 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-3 ml-4">
          <Cloud className="w-5 h-5 text-emerald-200" />
          <p className="text-sm font-bold tracking-tight">
            ☁️ Kirish qiling va progressizni bulutga saqlang
          </p>
        </div>
        <div className="flex items-center gap-3 mr-4">
          <button 
            onClick={() => setShowBenefitsModal(true)}
            className="px-4 py-1.5 bg-white text-emerald-600 rounded-full text-xs font-black uppercase hover:bg-emerald-50 transition-colors"
          >
            Kirish
          </button>
          <button onClick={() => setBannerDismissed(true)} className="p-1 hover:text-emerald-200">
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
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-2">
            <Cloud className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-black tracking-tight leading-none text-gray-900">Synchronize</h2>
          <p className="text-gray-500 font-medium">Progressingizni saqlang va barcha qurilmalarda ko'ring.</p>
          
          <div className="w-full space-y-4 text-left">
            {[
              { icon: Check, text: "Telefon va noutbuk o'rtasida sinxronizatsiya" },
              { icon: Check, text: "Ma'lumotlar hech qachon yo'qolmaydi" },
              { icon: Check, text: "Oflayn o'rganish va keyin sinxronlash" }
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
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center justify-center gap-3"
          >
            Google bilan kirish
          </button>
        </div>
      </motion.div>
    </div>
  );

  const SyncIndicator = () => (
    <div 
      onClick={() => { if (user) handleRefresh(); }}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-2xl border border-gray-100 ring-4 ring-gray-900/5 select-none transition-all active:scale-95 ${user ? 'cursor-pointer hover:bg-gray-50' : ''}`}
    >
      {syncStatus === 'syncing' ? (
        <>
          <RefreshCcw className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 animate-spin" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-indigo-500 italic">Syncing...</span>
        </>
      ) : syncStatus === 'offline' ? (
        <>
          <CloudOff className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-orange-500">{user ? 'Offline - Saved Locally' : 'Guest - Local Storage only'}</span>
        </>
      ) : (
        <>
          <Cloud className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-500">Synced</span>
        </>
      )}
      {user && (
        <div className="ml-1 pl-2 border-l border-gray-100">
           <RefreshCcw className={`w-4 h-4 text-gray-400 ${syncStatus === 'syncing' ? 'opacity-0' : 'opacity-100'}`} />
        </div>
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
        {showMigrationModal && (
          <MigrationModal 
            packCount={guestStats.packCount}
            questionCount={guestStats.questionCount}
            onConfirm={handleMigrate}
            onCancel={() => setShowMigrationModal(false)}
            isMigrating={isMigrating}
          />
        )}
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

      <Suspense fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
          <p className="text-gray-500 font-bold animate-pulse">Loading Platform...</p>
        </div>
      }>
        <Routes location={location}>
          <Route path="/" element={
            <PortalPage 
              user={user} 
              packs={packs} 
              onLogin={handleLogin} 
              onLogout={handleLogout} 
              isAuthLoading={isAuthLoading}
            />
          } />
          
          <Route path="/exam" element={<ExamDashboard user={user} onLogin={handleLogin} />} />
          <Route path="/exam/start" element={<ExamScreen user={user} />} />
          <Route path="/exam/results/:historyId" element={<ExamResults />} />
          
          <Route path="/study" element={
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
                      isWeakPack={activePack?.isWeakPack}
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
          } />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
