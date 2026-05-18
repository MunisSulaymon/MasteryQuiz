import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Flag, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Timer, 
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from 'firebase/auth';
import { ExamQuestion, ExamSession, ExamHistory } from '../../types';
import { loadExamQuestions, saveExamHistory } from '../../services/quizService';
import { prepareExamQuestions } from '../../utils/examUtils';

interface ExamScreenProps {
  user: User | null;
}

export default function ExamScreen({ user }: ExamScreenProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const packId = searchParams.get('packId');
    const count = Number(searchParams.get('count') || 30);
    const time = Number(searchParams.get('time') || 60) * 60; // to seconds
    const type = searchParams.get('type') as any || 'yakuniy';
    const dist = {
      oson: Number(searchParams.get('oson') || 15),
      orta: Number(searchParams.get('orta') || 55),
      qiyin: Number(searchParams.get('qiyin') || 30)
    };

    if (!packId) {
      navigate('/exam');
      return;
    }

    initExam(packId, count, time, type, dist);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const initExam = async (packId: string, count: number, time: number, type: any, dist: any) => {
    setIsLoading(true);
    try {
      const allQs = await loadExamQuestions(packId);
      const prepared = prepareExamQuestions(allQs, count, dist);
      
      setSession({
        examType: type,
        questions: prepared,
        answers: new Array(prepared.length).fill(null),
        flags: new Array(prepared.length).fill(false),
        startTime: Date.now(),
        totalTime: time,
        packId
      });
      setTimeLeft(time);
      setIsLoading(false);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
             if (timerRef.current) clearInterval(timerRef.current);
             handleAutoSubmit();
             return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err) {
      console.error(err);
      navigate('/exam');
    }
  };

  const handleAutoSubmit = () => {
    // Auto submit logic
    handleSubmit(true);
  };

  const handleSelectOption = (optIndex: number) => {
    if (!session) return;
    const newAnswers = [...session.answers];
    newAnswers[currentIndex] = optIndex;
    setSession({ ...session, answers: newAnswers });
  };

  const toggleFlag = () => {
    if (!session) return;
    const newFlags = [...session.flags];
    newFlags[currentIndex] = !newFlags[currentIndex];
    setSession({ ...session, flags: newFlags });
  };

  const handleSubmit = async (isAuto = false) => {
    if (!session || !user) return;
    setIsSubmitting(true);

    const timeUsed = session.totalTime - timeLeft;
    let correctCount = 0;
    const topicBreakdown: { [topic: string]: { correct: number; total: number } } = {};
    const failedQuestionIds: string[] = [];

    session.questions.forEach((q, idx) => {
      const isCorrect = session.answers[idx] === q.correctIndex;
      const topic = q.topic || 'Boshqa';
      
      if (!topicBreakdown[topic]) {
        topicBreakdown[topic] = { correct: 0, total: 0 };
      }
      topicBreakdown[topic].total++;
      
      if (isCorrect) {
        correctCount++;
        topicBreakdown[topic].correct++;
      } else {
        if (q.id) failedQuestionIds.push(q.id);
      }
    });

    const score = Math.round((correctCount / session.questions.length) * 100);
    let grade = 'A\'lo';
    let ects = 'A';

    if (score >= 90) { grade = 'A\'lo'; ects = 'A'; }
    else if (score >= 70) { grade = 'Yaxshi'; ects = 'B'; }
    else if (score >= 55) { grade = 'Qoniqarli'; ects = 'C'; }
    else { grade = 'Qoniqarsiz'; ects = 'F'; }

    const config = {
      questionCount: session.questions.length,
      timeLimit: session.totalTime / 60,
      difficulties: { oson: 0, orta: 0, qiyin: 0 } // Ideally we'd store the original search params
    };

    // Try to recover original difficulties from URL if possible, or just use what we have
    const searchParams = new URLSearchParams(location.search);
    config.difficulties = {
      oson: Number(searchParams.get('oson') || 15),
      orta: Number(searchParams.get('orta') || 55),
      qiyin: Number(searchParams.get('qiyin') || 30)
    };

    const history: ExamHistory = {
      packId: session.packId,
      examType: session.examType,
      totalQuestions: session.questions.length,
      correctCount,
      score,
      grade,
      ects,
      timeUsed,
      timeTotal: session.totalTime,
      topicBreakdown,
      failedQuestionIds,
      createdAt: null,
      config
    };

    try {
      const historyId = await saveExamHistory(history);
      navigate(`/exam/results/${historyId}`, { 
        replace: true, 
        state: { 
          ...history,
          correctCount, 
          total: session.questions.length, 
          timeUsed, 
          timeTotal: session.totalTime, 
          topicBreakdown 
        } 
      });
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Imtihon tayyorlanmoqda...</p>
      </div>
    );
  }

  const currentQuestion = session.questions[currentIndex];
  const timerWarning = timeLeft < 300; // less than 5 min
  const timerCritical = timeLeft < 60; // less than 1 min

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <button 
          onClick={() => {
            if (window.confirm("Imtihonni tark etmoqchimisiz? Barcha javoblaringiz yo'qoladi.")) {
              navigate('/exam');
            }
          }}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-rose-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Chiqish</span>
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 italic">
            {session.examType} nazorat
          </span>
          <span className="text-xs font-bold text-gray-900">Savol {currentIndex + 1} / {session.questions.length}</span>
        </div>

        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
           timerCritical ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' :
           timerWarning ? 'bg-amber-50 border-amber-200 text-amber-600' :
           'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          <Timer className="w-4 h-4" />
          <span className="font-mono font-black text-sm">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
               <h2 className="text-lg font-bold text-gray-900 leading-relaxed text-center">
                 {currentQuestion.text}
               </h2>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectOption(i)}
                  className={`w-full p-6 rounded-3xl text-left transition-all border-2 flex items-center gap-4 ${
                    session.answers[currentIndex] === i 
                    ? 'border-emerald-500 bg-emerald-50/50 shadow-lg shadow-emerald-100' 
                    : 'border-white bg-white hover:border-gray-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 transition-colors ${
                     session.answers[currentIndex] === i ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className={`text-sm font-bold ${session.answers[currentIndex] === i ? 'text-emerald-900' : 'text-gray-600'}`}>
                    {opt}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation & Actions */}
      <footer className="bg-white border-t border-gray-100 p-6 sticky bottom-0">
         <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
                Oldingi
              </button>
              <button 
                onClick={toggleFlag}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border transition-all ${
                  session.flags[currentIndex] ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-200 text-gray-400'
                }`}
              >
                <Flag className={`w-4 h-4 ${session.flags[currentIndex] ? 'fill-white' : ''}`} />
                Belgilash
              </button>
              <button 
                onClick={() => setCurrentIndex(prev => Math.min(session.questions.length - 1, prev + 1))}
                disabled={currentIndex === session.questions.length - 1}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 disabled:opacity-30"
              >
                Keyingi
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {session.questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[10px] font-black transition-all border-2 ${
                    currentIndex === i ? 'border-emerald-500 scale-110 shadow-lg shadow-emerald-100 bg-white' :
                    session.flags[i] ? 'bg-amber-500 border-amber-500 text-white' :
                    session.answers[i] !== null ? 'bg-emerald-600 border-emerald-600 text-white' :
                    'bg-gray-50 border-transparent text-gray-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
               <button 
                 onClick={() => setShowConfirmSubmit(true)}
                 className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-lg shadow-rose-100 hover:bg-rose-700 transition-colors"
               >
                 <Send className="w-4 h-4" />
                 Yakunlash
               </button>
            </div>
         </div>
      </footer>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-4 italic">Imtihonni yakunlash</h2>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Javob berildi
                  </span>
                  <span className="font-black text-gray-900">{session.answers.filter(a => a !== null).length} ta</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Flag className="w-4 h-4 text-amber-500" />
                    Belgilangan
                  </span>
                  <span className="font-black text-gray-900">{session.flags.filter(f => f).length} ta</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                    Javobsiz
                  </span>
                  <span className="font-black text-rose-600">{session.answers.filter(a => a === null).length} ta</span>
                </div>
              </div>

              <p className="text-sm font-bold text-gray-400 mb-8 text-center italic">Ishonchingiz komilmi? Natijalarni keyin o'zgartirib bo'lmaydi.</p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmSubmit(false)}
                  className="flex-1 py-4 text-gray-400 font-black uppercase tracking-widest text-[10px]"
                >
                  Davom etish
                </button>
                <button 
                  onClick={() => handleSubmit()}
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yakunlash'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
