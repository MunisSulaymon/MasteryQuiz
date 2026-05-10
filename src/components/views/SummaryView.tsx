import { useRef, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { 
  Trophy, 
  Clock, 
  RotateCcw, 
  XCircle, 
  Zap, 
  ArrowRight,
  CloudOff,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Question, QuizSession } from '../../types';

interface SummaryViewProps {
  session: QuizSession;
  onRetry: () => void;
  onNextSet: () => void;
  onHome: () => void;
  user: User | null;
  onLogout: () => void;
  onDrill: (questions: Question[]) => void;
  onSave: (questions: Question[]) => Promise<void>;
  previousBest?: number;
}

export default function SummaryView({ session, onRetry, onNextSet, onHome, user, onLogout, onDrill, onSave, previousBest: propPreviousBest }: SummaryViewProps) {
  const [previousBest] = useState(propPreviousBest);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const duration = Math.floor((session.endTime! - session.startTime) / 1000);
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  const isQuickTest = session.mode === 'quick-test';
  const improvement = previousBest ? previousBest - session.rounds : 0;
  
  const troublesome = useRef(session.questions
    .filter(q => q.wrongCount >= 3)
    .sort((a, b) => b.wrongCount - a.wrongCount)).current;

  // Auto-save on mount
  useEffect(() => {
    const performSave = async () => {
      if (!user) return;
      setSaveStatus('saving');
      try {
        await onSave(session.questions);
        setSaveStatus('saved');
      } catch (err) {
        console.error("Summary save failed:", err);
        setSaveStatus('error');
      }
    };
    performSave();
  }, [user, session.questions, onSave]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center">
      {/* Save Status Banner */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60]">
        {saveStatus === 'saving' && (
          <div className="bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving Progress...
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4" />
            Progress Saved
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold">
            <CloudOff className="w-4 h-4" />
            Progress Not Saved (Offline/Permissions)
          </div>
        )}
      </div>

      <div className="inline-flex bg-emerald-100 p-6 rounded-full mb-8">
        <Trophy className="w-16 h-16 text-emerald-600" />
      </div>
      <h2 className="text-5xl font-black mb-4">
        {isQuickTest ? 'Test Complete!' : 'Set Mastered!'}
      </h2>
      <p className="text-xl text-gray-500 mb-12">
        {isQuickTest 
          ? "You've completed a quick memory check." 
          : "You've reached 100% mastery on this set."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-left">
          <Clock className="w-8 h-8 text-indigo-600 mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Time Spent</p>
          <p className="text-3xl font-black">{minutes}m {seconds}s</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 text-left">
          <RotateCcw className="w-8 h-8 text-indigo-600 mb-4" />
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">
                {isQuickTest ? 'Questions' : 'Total Rounds'}
              </p>
              <p className="text-3xl font-black">
                {isQuickTest ? session.questions.length : session.rounds} {isQuickTest ? '' : 'Rounds'}
              </p>
            </div>
            {previousBest && !isQuickTest && (
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Comparison</p>
                <div className={`text-sm font-bold flex items-center gap-1 ${improvement > 0 ? 'text-emerald-500' : improvement < 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                  {improvement > 0 ? `-${improvement} rounds 🎉` : improvement < 0 ? `+${Math.abs(improvement)} rounds` : 'Same as last time'}
                </div>
                <p className="text-[9px] text-gray-400 mt-1 font-medium">Last time: {previousBest} rds</p>
              </div>
            )}
          </div>
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
