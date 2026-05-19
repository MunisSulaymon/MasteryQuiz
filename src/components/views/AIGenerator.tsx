import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Trash2, 
  RotateCcw,
  Plus,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  X,
  Edit2,
  Check
} from 'lucide-react';
import { ExamQuestion } from '../../types';

interface AIGeneratorProps {
  onSave: (questions: ExamQuestion[]) => Promise<void>;
  isLoading: boolean;
}

interface MetaSummary {
  total: number;
  difficultyCounts: {
    oson: number;
    orta: number;
    qiyin: number;
  };
}

const getHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

export default function AIGenerator({ onSave, isLoading: globalLoading }: AIGeneratorProps) {
  const [sourceText, setSourceText] = useState('');
  const [questionCount, setQuestionCount] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ questions: ExamQuestion[], summary: MetaSummary, saved?: boolean } | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [cachedResult, setCachedResult] = useState<any>(null);

  const [selectedDifficulty, setSelectedDifficulty] = useState('orta');
  const [selectedLanguage, setSelectedLanguage] = useState('Uzbek');

  const handleGenerate = async (useCached = false) => {
    if (!useCached && (!sourceText || sourceText.length < 50)) {
      setError("Matn juda qisqa. Kamida 50 ta belgi kerak.");
      return;
    }

    if (useCached && cachedResult) {
       setGeneratedResult(cachedResult.data);
       setSelectedIndexes(new Set(cachedResult.data.questions.map((_: any, i: number) => i)));
       return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      console.log("Calling /api/generate-questions...");
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: sourceText, 
          numQuestions: questionCount,
          difficulty: selectedDifficulty,
          language: selectedLanguage
        })
      });

      const resText = await response.text();
      console.log("API Response status:", response.status);
      
      if (!response.ok) {
        console.error("API Error Response:", resText);
        let errorData;
        try {
          errorData = JSON.parse(resText);
        } catch (e) {
          throw new Error(`Server xatosi (${response.status}): ${resText.substring(0, 100) || 'Bo\'sh xabar'}`);
        }
        
        const internalError = errorData.error || "";
        if (internalError.toLowerCase().includes("api key") || internalError.toLowerCase().includes("kalit")) {
          throw new Error("API kaliti muammosi. Iltimos administrator bilan bog'laning yoki sozlamalardan kalitni tekshiring.");
        }
        
        throw new Error(errorData.error || `Sorov muvaffaqiyatsiz tugadi (${response.status})`);
      }

      let data;
      try {
        data = JSON.parse(resText);
      } catch (e) {
        console.error("Failed to parse JSON response:", resText);
        throw new Error("Serverdan noto'g'ri formatda javob keldi. Iltimos qaytadan urinib ko'ring.");
      }

      const enrichedQuestions = data.questions.map((q: any) => ({
        ...q,
        origin: 'ai-generated',
        sourceText: sourceText.substring(0, 500),
        createdAt: new Date().toISOString(),
        timesUsed: 0,
        timesCorrect: 0,
        timesIncorrect: 0,
        aiReviewed: false
      }));

      // Calculate summary if missing from API
      const summary = data.summary || {
        total: enrichedQuestions.length,
        difficultyCounts: {
          oson: enrichedQuestions.filter((q: any) => q.difficulty === 'oson').length,
          orta: enrichedQuestions.filter((q: any) => q.difficulty === 'orta').length || enrichedQuestions.length,
          qiyin: enrichedQuestions.filter((q: any) => q.difficulty === 'qiyin').length
        }
      };

      const finalResult = { questions: enrichedQuestions, summary };
      setGeneratedResult(finalResult);
      setSelectedIndexes(new Set(enrichedQuestions.map((_: any, i: number) => i)));

      const hash = getHash(sourceText);
      localStorage.setItem(`ai_cache_${hash}`, JSON.stringify({
        data: finalResult,
        timestamp: Date.now()
      }));
    } catch (err: any) {
      console.error("API call failed:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!generatedResult) return;
    const toSave = generatedResult.questions.filter((_, i) => selectedIndexes.has(i));
    await onSave(toSave);
    setGeneratedResult(prev => prev ? { ...prev, saved: true } : null);
  };

  const handleYanaSavollar = () => {
    setGeneratedResult(null);
    setSourceText('');
    setCachedResult(null);
  };

  // Cache check effect
  useEffect(() => {
    if (sourceText.length > 100 && !generatedResult) {
      const hash = getHash(sourceText);
      const cached = localStorage.getItem(`ai_cache_${hash}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const age = Date.now() - parsed.timestamp;
          if (age < 7 * 24 * 60 * 60 * 1000) {
            setCachedResult(parsed);
          } else {
            setCachedResult(null);
          }
        } catch(e) {
          setCachedResult(null);
        }
      } else {
        setCachedResult(null);
      }
    }
  }, [sourceText, generatedResult]);

  const toggleSelection = (idx: number) => {
    const next = new Set(selectedIndexes);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndexes(next);
  };

  const updateQuestion = (idx: number, updates: Partial<ExamQuestion>) => {
    if (!generatedResult) return;
    const nextQuestions = [...generatedResult.questions];
    nextQuestions[idx] = { ...nextQuestions[idx], ...updates };
    setGeneratedResult({ ...generatedResult, questions: nextQuestions });
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!generatedResult ? (
          <motion.div 
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 italic tracking-tighter">AI Savol Generatori</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Matndan avtomatik savol yaratish</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Ma'ruza matni, maqola yoki darslikdan parcha joylang..."
                    className="w-full h-80 bg-gray-50 border-none rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-300 resize-none transition-all"
                  />
                  <div className="absolute bottom-4 right-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    {sourceText.length} belgi
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Savollar soni</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="5" 
                        max="30" 
                        value={questionCount}
                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <span className="text-sm font-black text-indigo-600 w-8">{questionCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Qiyinchilik</label>
                      <select 
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="oson">Oson</option>
                        <option value="orta">O'rta</option>
                        <option value="qiyin">Qiyin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Til</label>
                      <select 
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="Uzbek">O'zbek</option>
                        <option value="English">English</option>
                        <option value="Russian">Русский</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {cachedResult && (
                       <button 
                         onClick={() => handleGenerate(true)}
                         className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all flex items-center gap-2"
                       >
                         <RotateCcw className="w-3.5 h-3.5" />
                         Tayyorni yuklash
                       </button>
                    )}
                    <button 
                      onClick={() => handleGenerate()}
                      disabled={isGenerating || sourceText.length < 50}
                      className="flex-1 sm:flex-none px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Yaratilmoqda...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Savollarni yaratish
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* AI Tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
                  <Info className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Sifatli matn</h4>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Kamida 200-300 so'zdan iborat aniq ma'lumotli matndan foydalaning.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Bloom taksonomiyasi</h4>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">AI savollarni xotira, tushunish va qo'llash darajalarida taqsimlaydi.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-2">Qayta yaratish</h4>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">Natija qoniqtirmasa, matnni tahrirlab qaytadan urinib ko'ring.</p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Summary Bar */}
            <div className={`p-6 rounded-3xl shadow-xl transition-all flex flex-col md:flex-row items-center justify-between gap-4 ${generatedResult.saved ? 'bg-emerald-600 shadow-emerald-100' : 'bg-indigo-600 shadow-indigo-100'}`}>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {generatedResult.saved ? 'Muvaffaqiyatli saqlandi' : 'Natija'}
                </h4>
                <p className="font-black text-lg">
                  {generatedResult.saved ? `${selectedIndexes.size} ta savol to'plamga qo'shildi` : `${generatedResult.summary.total} ta savol yaratildi`}
                </p>
              </div>
              {!generatedResult.saved && (
                <div className="flex gap-4">
                  <div className="text-center px-4 border-r border-white/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Oson</p>
                    <p className="font-black text-lg">{generatedResult.summary.difficultyCounts.oson}</p>
                  </div>
                  <div className="text-center px-4 border-r border-white/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">O'rta</p>
                    <p className="font-black text-lg">{generatedResult.summary.difficultyCounts.orta}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Qiyin</p>
                    <p className="font-black text-lg">{generatedResult.summary.difficultyCounts.qiyin}</p>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                {generatedResult.saved ? (
                  <button 
                    onClick={handleYanaSavollar}
                    className="px-6 py-3 bg-white text-emerald-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all hover:scale-105"
                  >
                    Yana savollar
                  </button>
                ) : (
                  <button 
                    onClick={() => setGeneratedResult(null)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Bekor qilish
                  </button>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              {generatedResult.questions.map((q, idx) => (
                <motion.div 
                  key={idx}
                  layout
                  className={`bg-white border-2 rounded-[2.5rem] overflow-hidden transition-all shadow-sm ${selectedIndexes.has(idx) ? 'border-indigo-100' : 'border-gray-50 opacity-60'}`}
                >
                  <div className="p-8">
                    <div className="flex items-start gap-4">
                      <button 
                        onClick={() => toggleSelection(idx)}
                        className={`mt-1 w-6 h-6 rounded-lg flex items-center justify-center transition-colors border-2 shrink-0 ${selectedIndexes.has(idx) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200 text-gray-200'}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Savol {idx + 1}</span>
                            <div className="flex gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                q.difficulty === 'oson' ? 'bg-blue-50 text-blue-600' :
                                q.difficulty === 'orta' ? 'bg-orange-50 text-orange-600' :
                                'bg-rose-50 text-rose-600'
                              }`}>
                                {q.difficulty}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-widest">
                                {q.bloomsLevel}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {editingIndex === idx ? (
                               <button 
                                 onClick={() => setEditingIndex(null)}
                                 className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                               >
                                 <Check className="w-4 h-4" />
                               </button>
                            ) : (
                               <button 
                                 onClick={() => setEditingIndex(idx)}
                                 className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                               >
                                 <Edit2 className="w-4 h-4" />
                               </button>
                            )}
                            <button 
                              onClick={() => {
                                const nextQuestions = generatedResult.questions.filter((_, i) => i !== idx);
                                setGeneratedResult({ ...generatedResult, questions: nextQuestions });
                                const nextSelected = new Set(selectedIndexes);
                                nextSelected.delete(idx);
                                setSelectedIndexes(nextSelected);
                              }}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {editingIndex === idx ? (
                          <textarea
                            value={q.text}
                            onChange={(e) => updateQuestion(idx, { text: e.target.value })}
                            className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 leading-relaxed"
                            rows={3}
                          />
                        ) : (
                          <h3 className="font-bold text-gray-800 leading-relaxed text-lg">{q.text}</h3>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {q.options.map((opt, i) => (
                            <div key={i} className={`group relative p-4 rounded-2xl text-xs flex items-center gap-3 transition-all ${i === q.correctIndex ? 'bg-emerald-50 text-emerald-700 font-bold border border-emerald-100' : 'bg-gray-50 text-gray-500 border border-transparent'}`}>
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] shrink-0 ${i === q.correctIndex ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-gray-200 text-gray-400'}`}>
                                {String.fromCharCode(65 + i)}
                              </div>
                              {editingIndex === idx ? (
                                <input 
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOptions = [...q.options];
                                    nextOptions[i] = e.target.value;
                                    updateQuestion(idx, { options: nextOptions });
                                  }}
                                  className="w-full bg-white/50 border-none rounded-lg p-1 focus:ring-1 focus:ring-indigo-200"
                                />
                              ) : (
                                <span className="flex-1">{opt}</span>
                              )}
                              {editingIndex === idx && (
                                <button 
                                  onClick={() => updateQuestion(idx, { correctIndex: i })}
                                  className={`p-1.5 rounded-lg transition-all ${i === q.correctIndex ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-400 hover:bg-gray-300'}`}
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                              {i === q.correctIndex && <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-4" />}
                            </div>
                          ))}
                        </div>

                        {/* Trust Signals */}
                        <div className="pt-6 border-t border-gray-50 flex items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                 <Brain className="w-3 h-3" />
                                 <span className="text-[9px] font-black uppercase tracking-widest">AI Generated</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                 <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500" 
                                      style={{ width: `${q.confidenceScore || 85}%` }}
                                    />
                                 </div>
                                 <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">İshonch: {q.confidenceScore || 85}%</span>
                              </div>
                           </div>
                           {q.sourceReference && (
                             <button className="flex items-center gap-1.5 text-[9px] font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                <Info className="w-3 h-3" />
                                Manba parcha
                                <ChevronDown className="w-2.5 h-2.5" />
                             </button>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom Actions Overlay */}
            <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F0F2F5] via-[#F0F2F5]/90 to-transparent z-30 pointer-events-none">
              <div className="max-w-4xl mx-auto flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                       if (selectedIndexes.size === generatedResult.questions.length) setSelectedIndexes(new Set());
                       else setSelectedIndexes(new Set(generatedResult.questions.map((_, i) => i)));
                     }}
                     className="px-6 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-colors shadow-xl"
                   >
                     {selectedIndexes.size === generatedResult.questions.length ? 'Hammasini bekor qilish' : 'Hammasini tanlash'}
                   </button>
                </div>
                <button 
                  onClick={handleSaveSelected}
                  disabled={globalLoading || selectedIndexes.size === 0}
                  className="flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-3xl font-black uppercase tracking-widest text-sm shadow-2xl shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {globalLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Tanlanganlarni saqlash ({selectedIndexes.size})
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
