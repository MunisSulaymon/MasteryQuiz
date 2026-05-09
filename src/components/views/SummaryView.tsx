import { useRef, memo } from 'react';
import { User } from 'firebase/auth';
import { 
  Trophy, 
  Clock, 
  RotateCcw, 
  XCircle, 
  Zap, 
  ArrowRight 
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
}

const SummaryView = memo(function SummaryView({ session, onRetry, onNextSet, onHome, user, onLogout, onDrill }: SummaryViewProps) {
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
});

export default SummaryView;
