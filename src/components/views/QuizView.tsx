import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  ClipboardList, 
  Play, 
  Timer, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { Question, QuizSession } from '../../types';
import { shuffleArray } from '../../utils';

interface QuizViewProps {
  session: QuizSession;
  onComplete: (s: QuizSession) => void;
  onBack: () => void;
  onUpdateQuestion: (q: Question) => void;
  title?: string;
}

export default function QuizView({ session, onComplete, onBack, onUpdateQuestion, title }: QuizViewProps) {
  const [questions, setQuestions] = useState<Question[]>(() => [...session.questions]);
  const [currentQueue, setCurrentQueue] = useState<Question[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [timer, setTimer] = useState(20);
  const [rounds, setRounds] = useState(session.rounds || 1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const masteredCount = useMemo(() => questions.filter(q => q.box === 3).length, [questions]);
  const total = questions.length;

  const startTimer = useCallback(() => {
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
  }, [questions, activeQuestion, feedback]); // We need these to call handleAnswer correctly

  // We need to re-define handleAnswer to be used in startTimer
  // But wait, handleAnswer depends on activeQuestion.
  // To avoid circular or complex dependencies, let's use a ref for the latest state if needed
  // or just accept that startTimer might re-create.
  
  const handleAnswer = useCallback((answer: string | null) => {
    if (feedback || !activeQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = answer === activeQuestion.correctAnswer;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    let updatedQ: Question | null = null;
    setQuestions(prev => {
      const updated = prev.map(q => {
        if (q.id === activeQuestion.id) {
          // In quick-test mode, we don't change the box level, just track errors
          const newBox = session.mode === 'quick-test' ? q.box : (isCorrect ? (Math.min(3, q.box + 1) as 1 | 2 | 3) : (1 as 1 | 2 | 3));
          
          updatedQ = {
            ...q,
            box: newBox,
            wrongCount: isCorrect ? q.wrongCount : q.wrongCount + 1,
          } as Question;
          return updatedQ;
        }
        return q;
      });
      
      if (updatedQ) {
        onUpdateQuestion(updatedQ);
      }
      return updated;
    });

    setTimeout(() => {
      setCurrentQueue(prev => {
        if (prev.length === 0) {
          if (session.mode === 'quick-test') {
            onComplete({ ...session, questions, rounds: 1, endTime: Date.now() });
            return [];
          }
          setRounds(r => r + 1);
          return [];
        }
        const next = prev[0];
        const rest = prev.slice(1);
        
        setActiveQuestion(next);
        setShuffledOptions(shuffleArray(next.options));
        setFeedback(null);
        setTimer(20);
        
        return rest;
      });
    }, 2000);
  }, [feedback, activeQuestion, onUpdateQuestion, session, questions, onComplete]);

  const initQueue = useCallback(() => {
    if (session.mode === 'quick-test') {
      const queue = shuffleArray<Question>([...questions]);
      if (queue.length === 0) {
        onComplete({ ...session, questions, rounds: 1, endTime: Date.now() });
        return;
      }
      const next = queue[0];
      const rest = queue.slice(1);
      setActiveQuestion(next);
      setCurrentQueue(rest);
      setShuffledOptions(shuffleArray(next.options));
      setFeedback(null);
      setTimer(20);
      return;
    }

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

    const next = queue[0];
    const rest = queue.slice(1);
    
    setActiveQuestion(next);
    setCurrentQueue(rest);
    setShuffledOptions(shuffleArray(next.options));
    setFeedback(null);
    setTimer(20);
  }, [questions, rounds, onComplete, session]);

  useEffect(() => {
    initQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, session.setId]); 

  useEffect(() => {
    if (activeQuestion && !feedback) {
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
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeQuestion, feedback, handleAnswer]);

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

      <div className="flex-1 flex flex-col items-center overflow-y-auto p-4 md:p-6 pb-20">
        <div className="max-w-4xl w-full">
           <AnimatePresence mode="wait">
              <motion.div 
                key={activeQuestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 md:mb-10 pt-4"
              >
                <div className="flex items-center gap-3 mb-2 md:mb-6 font-bold uppercase tracking-widest text-[9px] md:text-sm text-left">
                  <span className="px-2 py-0.5 border border-indigo-400/30 rounded text-indigo-400">Box {activeQuestion.box}</span>
                  <span className="text-slate-400">Question</span>
                </div>
                <h2 className={`font-black leading-tight text-center sm:text-left drop-shadow-sm break-words ${
                  activeQuestion.stem.length > 200 ? 'text-lg md:text-2xl' : activeQuestion.stem.length > 100 ? 'text-xl md:text-3xl' : 'text-2xl md:text-4xl'
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
                    className={`group relative p-3 md:p-5 text-left rounded-xl md:rounded-2xl border-2 transition-all flex items-center gap-3 md:gap-5 ${btnClass} active:scale-[0.98]`}
                  >
                    <span className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-white/10 rounded-lg md:rounded-xl font-black text-xs md:text-lg group-hover:bg-white/20 transition-colors">
                      {letters[idx]}
                    </span>
                    <span className="text-sm md:text-xl font-bold leading-tight break-words flex-1 pr-6">{opt}</span>
                    
                    {feedback && isCorrect && <CheckCircle2 className="flex-shrink-0 w-5 h-5 md:w-8 md:h-8 text-emerald-500" />}
                    {feedback === 'wrong' && !isCorrect && <XCircle className="flex-shrink-0 w-5 h-5 md:w-8 md:h-8 text-red-500 opacity-30" />}
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
                       <p className="text-xs md:text-sm font-medium opacity-90 text-left">Moving to Box {Math.min(3, activeQuestion.box + 1)}</p>
                     </div>
                   </>
                 ) : (
                   <>
                     <XCircle className="w-6 h-6 md:w-8 md:h-8 text-red-400" />
                     <div>
                       <p className="font-black text-lg md:text-xl mb-0.5 md:mb-1 text-white text-left">WRONG!</p>
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
