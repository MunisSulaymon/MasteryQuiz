import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy, ArrowLeft, BookOpen, LayoutGrid, ChevronRight, Loader2, AlertTriangle, Clock, Target, RotateCcw, Brain, CheckCircle, RefreshCcw, XCircle } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { dataService } from '../../services/dataService';
import { ExamHistory, ExamQuestion, QuizPack } from '../../types';

export default function ExamResults() {
  const navigate = useNavigate();
  const { historyId } = useParams();
  const location = useLocation();
  const [history, setHistory] = useState<ExamHistory | null>(location.state || null);
  const [isLoading, setIsLoading] = useState(!location.state);
  const [isCreatingWeak, setIsCreatingWeak] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [showConfirmUpdate, setShowConfirmUpdate] = useState(false);

  useEffect(() => {
    if (!history && historyId) {
      fetchHistory();
    }
  }, [historyId]);

  const fetchHistory = async () => {
    if (!historyId) return;
    setIsLoading(true);
    try {
      const data = await dataService.getExamHistoryItem(historyId);
      if (data) setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStudyWeak = async (forceUpdate = false) => {
    if (!history || !historyId) return;
    
    // Check if already exists unless forcing update
    if (!forceUpdate) {
      const existing = await dataService.findWeakPackByExamId(historyId);
      if (existing) {
        setShowConfirmUpdate(true);
        return;
      }
    }

    setIsCreatingWeak(true);
    try {
      if (forceUpdate) {
        const existing = await dataService.findWeakPackByExamId(historyId);
        if (existing) {
          await dataService.deletePack(existing.id);
        }
      }

      const dateStr = new Date(history.createdAt || Date.now()).toLocaleDateString('uz-UZ');
      const packName = `Imtihon zaif savollari — ${dateStr}`;
      
      const allQuestions = await dataService.getQuestions(history.packId);
      const failedQuestions = allQuestions.filter(q => history.failedQuestionIds.includes(q.id!));
      
      if (failedQuestions.length === 0) {
        alert("Hamma savollarga to'g'ri javob berilgan! Zaif savollar yo'q.");
        setIsCreatingWeak(false);
        return;
      }

      const weakPackId = Math.random().toString(36).substring(2, 11);
      const weakPack: QuizPack = {
        id: weakPackId,
        name: packName,
        color: 'rose',
        questionCount: failedQuestions.length,
        createdAt: Date.now(),
        lastStudied: Date.now(),
        deleteAt: null,
        setSize: 20,
        inputText: '', // or some metadata
        examId: historyId // metadata
      } as any;

      await dataService.savePack(weakPack);
      await dataService.saveQuestions(weakPackId, failedQuestions);
      
      setShowToast(`✅ ${failedQuestions.length} ta zaif savol O'rganish platformasiga qo'shildi!`);
      setTimeout(() => {
        navigate(`/study?weak=${weakPackId}`);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi. Iltimos qaytadan urinib ko'ring.");
    } finally {
      setIsCreatingWeak(false);
      setShowConfirmUpdate(false);
    }
  };

  const handleRetry = () => {
    if (!history || !history.config) return;
    const params = new URLSearchParams({
      packId: history.packId,
      type: history.examType,
      count: history.config.questionCount.toString(),
      time: history.config.timeLimit.toString(),
      oson: history.config.difficulties.oson.toString(),
      orta: history.config.difficulties.orta.toString(),
      qiyin: history.config.difficulties.qiyin.toString()
    });
    navigate(`/exam/start?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!history) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-rose-500 mb-6" />
        <h1 className="text-2xl font-black text-gray-900 mb-2 italic">Xatolik yuz berdi</h1>
        <p className="text-gray-500 mb-8">Natijalarni yuklab bo'lmadi.</p>
        <button onClick={() => navigate('/exam')} className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-100">Dashbordga qaytish</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      <header className="bg-white border-b border-gray-100 px-6 py-8 text-center sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <h1 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-1">Imtihon natijasi</h1>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {new Date(history.createdAt || Date.now()).toLocaleString()}
        </p>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8 space-y-8">
        {/* Score Header */}
        <div className="bg-white rounded-[3rem] p-10 text-center shadow-xl shadow-gray-200/50 border border-gray-100 relative overflow-hidden">
          <div className="relative z-10">
             <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 text-emerald-600">
               <Trophy className="w-12 h-12" />
             </div>
             
             <div className="flex flex-col gap-1 mb-6">
                <span className="text-5xl font-black text-gray-900 italic tracking-tighter">
                  {history.score}%
                </span>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-600">
                  {history.correctCount} / {history.totalQuestions} to'g'ri
                </span>
             </div>

             <div className="inline-flex flex-col items-center gap-1 bg-gray-900 text-white px-8 py-3 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Baholash (ECTS)</span>
                <span className="text-xl font-black italic tracking-widest uppercase">
                  {history.grade} ({history.ects})
                </span>
             </div>
          </div>
          
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -ml-16 -mb-16 opacity-50" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
             <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
               <Clock className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sarflangan vaqt</p>
               <p className="font-black text-gray-900">{formatTime(history.timeUsed)}</p>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
               <Target className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">O'rtacha aniqlik</p>
               <p className="font-black text-gray-900">{history.score}%</p>
             </div>
          </div>
        </div>

        {/* Topic Breakdown */}
        <div className="space-y-4">
           <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 px-2">Mavzular bo'yicha tahlil</h3>
           <div className="space-y-2">
             {Object.entries(history.topicBreakdown).map(([topic, data]) => {
               const typedData = data as { correct: number; total: number };
               const percentage = Math.round((typedData.correct / typedData.total) * 100);
               return (
                 <div key={topic} className="bg-white p-6 rounded-3xl border border-gray-100 group hover:border-emerald-100 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                       <span className="font-black text-gray-900 text-sm italic">#{topic}</span>
                       <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                         percentage >= 70 ? 'bg-emerald-50 text-emerald-600' :
                         percentage >= 55 ? 'bg-amber-50 text-amber-600' :
                         'bg-rose-50 text-rose-600'
                       }`}>
                         {percentage}%
                       </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-50 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${percentage}%` }}
                         className={`h-full rounded-full ${
                           percentage >= 70 ? 'bg-emerald-500' :
                           percentage >= 55 ? 'bg-amber-500' :
                           'bg-rose-500'
                         }`}
                       />
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                       <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                         {typedData.correct} ta to'g'ri / {typedData.total} ta savol
                       </p>
                       {percentage < 70 && (
                         <button 
                           onClick={() => navigate(`/study/${history.packId}?topic=${encodeURIComponent(topic)}`)}
                           className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:underline"
                         >
                           Mavzuni o'rganish
                           <ChevronRight className="w-2.5 h-2.5" />
                         </button>
                       )}
                    </div>
                 </div>
               )
             })}
           </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-4">
           {history.failedQuestionIds.length > 0 && (
             <button 
               onClick={() => handleStudyWeak()}
               disabled={isCreatingWeak}
               className="w-full py-5 bg-amber-500 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-2xl shadow-amber-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
             >
               {isCreatingWeak ? (
                 <>
                   <Loader2 className="w-4 h-4 animate-spin" />
                   Zaif savollar to'plami yaratilmoqda...
                 </>
               ) : (
                 <>
                   <Brain className="w-4 h-4" />
                   Zaif tomonlarni o'rganish
                 </>
               )}
             </button>
           )}

           <button 
             onClick={handleRetry}
             className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-2xl shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all"
           >
             <RotateCcw className="w-4 h-4" />
             Qayta urinish
           </button>

           <button 
             onClick={() => navigate('/exam')}
             className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-2xl shadow-gray-300 hover:scale-[1.02] active:scale-95 transition-all"
           >
             <LayoutGrid className="w-4 h-4" />
             Dashbordga qaytish
           </button>
           
           <div className="grid grid-cols-2 gap-4">
             <button 
               onClick={() => navigate('/')}
               className="py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
             >
               <ArrowLeft className="w-4 h-4" />
               Asosiy menyu
             </button>
             <button 
               onClick={() => navigate(`/study/${history.packId}`)}
               className="py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
             >
               <BookOpen className="w-4 h-4" />
               O'rganish
             </button>
           </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmUpdate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 font-black text-2xl">
              !
            </div>
            <h2 className="text-xl font-black text-gray-900 mb-4 italic">To'plam mavjud</h2>
            <p className="text-sm font-bold text-gray-400 mb-8 italic">
              Sizda ushbu imtihon uchun zaif savollar to'plami allaqachon mavjud. Yangilashni xohlaysizmi?
            </p>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmUpdate(false)}
                className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-[10px]"
              >
                Bekor qilish
              </button>
              <button 
                onClick={() => handleStudyWeak(true)}
                className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
              >
                Yangilash
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 border border-white/10">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          {showToast}
        </div>
      )}
    </div>
  );
}
