import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Save, 
  BarChart3,
  Search,
  Brain,
  Layers,
  Clock,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { QuizPack, ExamQuestion } from '../../types';
import { parseHemisFormat, HemisParsedQuestion } from '../../utils/hemisParser';
import { createPack, loadUserData, saveExamQuestions, loadExamQuestions } from '../../services/quizService';

interface ExamDashboardProps {
  user: User | null;
  onLogin: () => void;
}

export default function ExamDashboard({ user, onLogin }: ExamDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'questions' | 'import'>('questions');
  const [packs, setPacks] = useState<QuizPack[]>([]);
  const [selectedPackId, setSelectedPackId] = useState<string>('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPacksLoading, setIsPacksLoading] = useState(true);

  // Import states
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<any>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [showInstructions, setShowInstructions] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // New Pack Modal
  const [showNewPackModal, setShowNewPackModal] = useState(false);
  const [newPackName, setNewPackName] = useState('');
  const [newPackColor, setNewPackColor] = useState('emerald');

  const COLORS = ['indigo', 'emerald', 'blue', 'violet', 'rose'];

  useEffect(() => {
    fetchPacks();
  }, [user]);

  useEffect(() => {
    if (selectedPackId && activeTab === 'questions') {
      fetchQuestions();
    }
  }, [selectedPackId, activeTab]);

  const fetchPacks = async () => {
    setIsPacksLoading(true);
    try {
      const data = await loadUserData(true);
      if (data && data.packs) {
        setPacks(data.packs);
        if (data.packs.length > 0 && !selectedPackId) {
          setSelectedPackId(data.packs[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPacksLoading(false);
    }
  };

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const qs = await loadExamQuestions(selectedPackId);
      setQuestions(qs);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    // Simulate slight delay for parser lazy-load feeling
    await new Promise(r => setTimeout(r, 400));
    const result = parseHemisFormat(rawText);
    setParseResult(result);
    setSelectedIndexes(new Set(result.questions.map((_: any, i: number) => i)));
    setIsParsing(false);
  };

  const handleCreatePack = async () => {
    if (!newPackName.trim()) return;
    const id = await createPack({
      name: newPackName,
      color: newPackColor,
      questionCount: 0,
      setSize: 20
    });
    await fetchPacks();
    setSelectedPackId(id);
    setShowNewPackModal(false);
    setNewPackName('');
  };

  const handleSaveImport = async () => {
    if (!selectedPackId || !parseResult) return;
    setIsSaving(true);
    
    const questionsToSave: ExamQuestion[] = parseResult.questions
      .filter((_: any, idx: number) => selectedIndexes.has(idx))
      .map((q: HemisParsedQuestion) => ({
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        hemisRaw: q.hemisRaw,
        difficulty: q.difficulty,
        topic: q.topic,
        source_platform: 'exam',
        createdAt: null, // set by service
        createdBy: user?.uid || 'guest',
        timesUsed: 0,
        timesCorrect: 0,
        timesIncorrect: 0
      }));

    try {
      // Small progress simulation
      for(let i=0; i<=100; i+=20) {
        setSaveProgress(i);
        await new Promise(r => setTimeout(r, 100));
      }
      await saveExamQuestions(selectedPackId, questionsToSave);
      setRawText('');
      setParseResult(null);
      setActiveTab('questions');
      await fetchPacks(); // refresh counts
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
      setSaveProgress(0);
    }
  };

  const toggleSelection = (idx: number) => {
    const next = new Set(selectedIndexes);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndexes(next);
  };

  const updateQuestionData = (idx: number, updates: Partial<HemisParsedQuestion>) => {
    setParseResult((prev: any) => ({
      ...prev,
      questions: prev.questions.map((q: any, i: number) => i === idx ? { ...q, ...updates } : q)
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mb-6">
          <BookOpen className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Imtihon platformasi</h1>
        <p className="text-gray-500 mb-8 max-w-xs">Savollarni boshqarish va import qilish uchun tizimga kiring.</p>
        <button 
          onClick={onLogin}
          className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200"
        >
          Google orqali kirish
        </button>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 text-emerald-600 font-bold text-sm"
        >
          Portalga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-black uppercase tracking-tighter text-emerald-600">Imtihon Banki</h1>
              {selectedPackId && (
                <div className="flex items-center gap-1 group cursor-pointer" onClick={() => fetchPacks()}>
                  <span className="text-xs font-bold text-gray-700">
                    {packs.find(p => p.id === selectedPackId)?.name || 'To\'plam'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select 
              value={selectedPackId}
              onChange={(e) => setSelectedPackId(e.target.value)}
              className="bg-gray-50 border-none rounded-xl text-xs font-bold px-4 py-2 focus:ring-2 focus:ring-emerald-500/20"
            >
              {packs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button 
              onClick={() => setShowNewPackModal(true)}
              className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-6 mt-6">
        <div className="flex bg-white/50 backdrop-blur p-1 rounded-2xl border border-gray-200">
          <button 
            onClick={() => setActiveTab('questions')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'questions' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Savollar
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'import' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Import
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 mt-6">
        {activeTab === 'questions' ? (
          <div className="space-y-4">
            {isLoading ? (
               <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Yuklanmoqda...</p>
               </div>
            ) : questions.length > 0 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{questions.length} TA SAVOL</span>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-300" />
                    <input type="text" placeholder="Qidiruv..." className="bg-transparent border-none text-xs font-bold focus:ring-0 p-0 w-24" />
                  </div>
                </div>
                {questions.map((q) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={q.id} 
                    className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:border-emerald-200 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                       <h3 className="font-bold text-gray-800 leading-relaxed">{q.text}</h3>
                       <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${
                         q.difficulty === 'oson' ? 'bg-blue-50 text-blue-600' :
                         q.difficulty === 'orta' ? 'bg-orange-50 text-orange-600' :
                         'bg-rose-50 text-rose-600'
                       }`}>
                         {q.difficulty}
                       </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`p-3 rounded-xl text-xs flex items-center gap-3 ${i === q.correctIndex ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' : 'bg-gray-50 text-gray-500 border border-transparent'}`}>
                          <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${i === q.correctIndex ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          {opt}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                          <BarChart3 className="w-3 h-3" />
                          To'gri: {Math.round((q.timesCorrect / (q.timesUsed || 1)) * 100)}%
                        </div>
                        {q.topic && (
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            #{q.topic}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(q.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            ) : (
              <div className="bg-white border-2 border-dashed border-gray-200 rounded-[2.5rem] py-20 flex flex-col items-center text-center px-8">
                <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300 mb-6">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-2">Hozircha savollar yo'q</h3>
                <p className="text-gray-400 text-sm max-w-xs mb-8 font-medium">Bu to'plamga savollar qo'shing yoki HEMIS formatida import qiling.</p>
                <button 
                  onClick={() => setActiveTab('import')}
                  className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                >
                  Import qilish
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Instruction Card */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full px-6 py-4 flex items-center justify-between text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-widest">HEMIS formatida import qilish yo'riqnomasi</span>
                </div>
                {showInstructions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              <AnimatePresence>
                {showInstructions && (
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden bg-gray-50/50"
                  >
                    <div className="p-6 border-t border-gray-100">
                       <p className="text-xs font-medium text-gray-500 mb-4 leading-relaxed">
                         Savollarni quyidagi formatda joylang. Har bir savol blokini <span className="text-emerald-600 font-bold">++++</span> belgisi bilan ajrating. Variantlarni <span className="text-emerald-600 font-bold">====</span> bilan ajrating va to'g'ri javobni <span className="text-emerald-600 font-bold">#</span> belgisi bilan belgilang.
                       </p>
                       <div className="bg-gray-900 rounded-2xl p-5 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
{`O'zbekistonning poytaxti qaysi shahar?
====
Samarqand
====
#Toshkent
====
Buxoro
====
Xiva
++++`}
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-6 shadow-xl shadow-gray-200/50">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Savollarni shu yerga joylang...&#10;Har bir savol ++++ bilan ajratilgan.&#10;To'g'ri javob # bilan belgilangan."
                className="w-full h-80 bg-gray-50/50 border-none rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 placeholder:text-gray-300 resize-none"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{rawText.length} BELGI</span>
                <button 
                  onClick={handleParse}
                  disabled={isParsing || !rawText.trim()}
                  className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isParsing && <Loader2 className="w-4 h-4 animate-spin" />}
                  Savollarni tekshirish
                </button>
              </div>
            </div>

            {/* Parse Results */}
            {parseResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Summary & Warnings */}
                <div className="flex flex-col gap-4">
                  <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-lg shadow-emerald-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">Tekshiruv natijasi</h4>
                      <p className="font-black text-lg">{parseResult.questions.length} ta savol topildi</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Belgilangan</p>
                      <p className="font-black text-lg">{selectedIndexes.size} ta</p>
                    </div>
                  </div>

                  {(parseResult.warnings.length > 0 || parseResult.errors.length > 0) && (
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl space-y-2">
                       {parseResult.errors.map((err: any, i: number) => (
                         <div key={i} className="flex gap-2 text-[11px] font-bold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">
                           <AlertTriangle className="w-4 h-4 shrink-0" />
                           <p><span className="font-black uppercase">XATO:</span> {err.reason}</p>
                         </div>
                       ))}
                       {parseResult.warnings.map((warn: any, i: number) => (
                         <div key={i} className="flex gap-2 text-[11px] font-bold text-amber-700 bg-white/50 p-3 rounded-xl">
                           <AlertTriangle className="w-4 h-4 shrink-0" />
                           <p><span className="font-black uppercase">OGOHLANTIRISH:</span> {warn}</p>
                         </div>
                       ))}
                    </div>
                  )}
                </div>

                {/* Question Preview Cards */}
                <div className="space-y-4">
                   {parseResult.questions.map((q: HemisParsedQuestion, idx: number) => (
                     <div 
                       key={idx} 
                       className={`bg-white border p-6 rounded-3xl transition-all shadow-sm ${selectedIndexes.has(idx) ? 'border-emerald-200' : 'border-gray-100 opacity-60'}`}
                     >
                       <div className="flex items-start gap-4">
                         <button 
                           onClick={() => toggleSelection(idx)}
                           className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors border-2 ${selectedIndexes.has(idx) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-200 text-gray-200'}`}
                         >
                           <CheckCircle2 className="w-4 h-4" />
                         </button>
                         <div className="flex-1 space-y-4">
                           <div className="flex items-start justify-between gap-4">
                             <p className="font-bold text-gray-800 leading-relaxed">{q.text}</p>
                             {q.warning && (
                               <div className="p-2 bg-amber-50 text-amber-500 rounded-lg shrink-0" title={q.warning}>
                                 <AlertTriangle className="w-4 h-4" />
                               </div>
                             )}
                           </div>
                           
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {q.options.map((opt, i) => (
                                <div key={i} className={`p-3 rounded-xl text-[11px] flex items-center gap-2 ${i === q.correctIndex ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' : 'bg-gray-50 text-gray-500 border border-transparent'}`}>
                                   <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[9px] ${i === q.correctIndex ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                    {String.fromCharCode(65 + i)}
                                  </div>
                                  {opt}
                                </div>
                              ))}
                           </div>

                           <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-50">
                              <div className="flex bg-gray-100 p-0.5 rounded-xl">
                                {(['oson', 'orta', 'qiyin'] as const).map((d) => (
                                  <button
                                    key={d}
                                    onClick={() => updateQuestionData(idx, { difficulty: d })}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${q.difficulty === d ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-500'}`}
                                  >
                                    {d}
                                  </button>
                                ))}
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <input 
                                  type="text" 
                                  placeholder="Mavzu qo'shing..."
                                  value={q.topic || ''}
                                  onChange={(e) => updateQuestionData(idx, { topic: e.target.value })}
                                  className="w-full bg-gray-50 border-none rounded-xl text-[11px] font-bold px-3 py-1.5 focus:ring-2 focus:ring-emerald-500/20"
                                />
                              </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))}
                </div>

                {/* Save Button Overlay */}
                <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F0F2F5] via-[#F0F2F5]/90 to-transparent z-30 pointer-events-none">
                  <div className="max-w-4xl mx-auto flex justify-end pointer-events-auto">
                    <button 
                      onClick={handleSaveImport}
                      disabled={isSaving || selectedIndexes.size === 0}
                      className="group flex items-center gap-3 px-8 py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-emerald-200 transition-all active:scale-95 disabled:opacity-50 overflow-hidden relative"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Saqlanmoqda {saveProgress}%
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          Tanlanganlarni saqlash ({selectedIndexes.size})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </main>

      {/* New Pack Modal */}
      <AnimatePresence>
        {showNewPackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-gray-900 italic tracking-tighter mb-6">Yangi to'plam</h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-2">To'plam nomi</label>
                  <input 
                    type="text" 
                    autoFocus
                    value={newPackName}
                    onChange={(e) => setNewPackName(e.target.value)}
                    placeholder="Masalan: Tarix imtihoni"
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2 px-2">Rangi</label>
                   <div className="flex gap-3 px-2">
                     {COLORS.map(c => (
                       <button
                         key={c}
                         onClick={() => setNewPackColor(c)}
                         className={`w-10 h-10 rounded-xl transition-all ${newPackColor === c ? 'ring-4 ring-offset-2 ring-emerald-500 scale-110' : ''}`}
                         style={{ backgroundColor: c === 'indigo' ? '#4f46e5' : c === 'emerald' ? '#10b981' : c === 'blue' ? '#3b82f6' : c === 'violet' ? '#8b5cf6' : '#f43f5e' }}
                       />
                     ))}
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowNewPackModal(false)}
                    className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-xs"
                  >
                    Bekor qilish
                  </button>
                  <button 
                    onClick={handleCreatePack}
                    disabled={!newPackName.trim()}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100 disabled:opacity-50"
                  >
                    Yaratish
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
