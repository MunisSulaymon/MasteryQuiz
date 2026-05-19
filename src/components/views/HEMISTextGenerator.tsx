import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  RotateCcw, 
  Brain, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { formatPackToHemis } from '../../utils/hemisFormatter';
import { ExamQuestion } from '../../types';

export default function HEMISTextGenerator() {
  const [sourceText, setSourceText] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('orta');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!sourceText || sourceText.length < 50) {
      setError("Matn juda qisqa. Kamida 50 ta belgi kerak.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedText('');
    
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: sourceText, 
          numQuestions: questionCount,
          difficulty: difficulty,
          language: 'Uzbek'
        })
      });

      if (!response.ok) {
        const resText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(resText);
        } catch (e) {
          throw new Error(`Server xatosi (${response.status})`);
        }
        throw new Error(errorData.error || "Savollarni yaratishda xatolik yuz berdi.");
      }

      const data = await response.json();
      const questions = data.questions as ExamQuestion[];
      
      // Convert questions to HEMIS raw format
      const hemisText = formatPackToHemis(questions);
      setGeneratedText(hemisText);
    } catch (err: any) {
      console.error("HEMIS Generation failed:", err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSourceText('');
    setGeneratedText('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 italic tracking-tighter">HEMIS Matn Generator</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Matndan HEMIS formatidagi xom matn yaratish</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!generatedText ? (
            <motion.div
              key="input-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="relative">
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Darslik, ma'ruza matni yoki qaydlarni shu yerga joylang..."
                  className="w-full h-80 bg-gray-50 border-none rounded-3xl p-6 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-300 resize-none transition-all"
                />
                <div className="absolute bottom-4 right-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
                  {sourceText.length} belgi
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Savollar soni</label>
                  <div className="flex items-center gap-4">
                    {[5, 10, 15, 20].map(count => (
                      <button
                        key={count}
                        onClick={() => setQuestionCount(count)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${questionCount === count ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-1">Qiyinchilik</label>
                  <div className="flex gap-2">
                    {['oson', 'orta', 'qiyin'].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setDifficulty(lvl)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${difficulty === lvl ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                      >
                        {lvl === 'orta' ? "O'rta" : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isGenerating || sourceText.length < 50}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 h-12"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Yaratilmoqda...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Yaratish
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="flex gap-2 text-xs font-bold text-rose-600 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result-area"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">HEMIS Formatidagi Matn</span>
                <button 
                  onClick={() => setGeneratedText('')}
                  className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Qaytadan tahrirlash
                </button>
              </div>
              
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedText}
                  className="w-full h-96 bg-gray-900 text-emerald-400 font-mono text-sm p-8 rounded-[2rem] border-none focus:ring-0 leading-relaxed resize-none shadow-inner"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                   <div className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black text-white/50 uppercase tracking-widest backdrop-blur-sm">
                      Read Only
                   </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={handleReset}
                  className="flex-1 px-8 py-5 bg-gray-100 text-gray-600 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Yangi yaratish
                </button>
                <button 
                  onClick={handleCopy}
                  className={`flex-[2] py-5 rounded-3xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-xl ${copied ? 'bg-emerald-600 text-white shadow-emerald-100' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'}`}
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      Nusxalandi!
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      Nusxalash (Clipboard)
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
             <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">Bu nima?</h4>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Bu vosita HEMIS tizimi uchun tayyor savol matnini generatsiya qiladi. Siz savollarni saqlab o'tirmasdan, to'g'ridan-to'g'ri nusxalab HEMISga yuklashingiz mumkin.
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 flex gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
             <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 mb-1">Muhim</h4>
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
              Generatsiya qilingan matn formatini o'zgartirmang (<code className="text-rose-500 font-black">====</code> va <code className="text-rose-500 font-black">++++</code> belgilari muhim).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
