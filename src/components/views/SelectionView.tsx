import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogOut, Play, Info, CheckCircle2, RotateCcw, Zap } from 'lucide-react';
import { QuizSet } from '../../types';

interface SelectionViewProps {
  sets: QuizSet[];
  onSelect: (s: QuizSet) => void;
  onQuickTest: (s: QuizSet) => void;
  onResetSet: (s: QuizSet) => void;
  onBack: () => void;
  onLogout: () => void;
  user: User | null;
  setSize: number;
  setSetSize: (n: number) => void;
  onEditPack?: () => void;
}

export default function SelectionView({ sets, onSelect, onQuickTest, onResetSet, onBack, onLogout, user, setSize, setSetSize, onEditPack }: SelectionViewProps) {
  const totalQuestions = sets.reduce((acc, s) => acc + s.questions.length, 0);
  
  const fullSets = Math.floor(totalQuestions / setSize);
  const remainder = totalQuestions % setSize;
  const calcText = remainder === 0 
    ? `${totalQuestions} questions ÷ ${setSize} = ${fullSets} sets of ${setSize}`
    : `${totalQuestions} questions ÷ ${setSize} = ${fullSets} sets of ${setSize} + 1 set of ${remainder}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-20 pb-40">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <button 
            onClick={onBack}
            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2 flex items-center gap-1 hover:translate-x-[-4px] transition-transform"
          >
            ← Back to Packs
          </button>
          <h2 className="text-4xl font-black mb-2 tracking-tight">Select a Set</h2>
          <p className="text-gray-500 font-medium">Found {totalQuestions} questions.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onEditPack}
            className="px-6 py-3 bg-white hover:bg-gray-50 rounded-xl font-bold border border-gray-200 transition-all text-gray-600 shadow-sm"
          >
            Edit Questions
          </button>
          <button onClick={onLogout} className="p-3 bg-white hover:bg-red-50 text-red-500 rounded-xl border border-gray-200 transition-colors shadow-sm" title={user ? "Log out" : "Reset Session"}>
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Set Size Config */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-gray-800">How many questions per set?</h3>
            <p className="text-sm text-gray-500 font-medium">{calcText}</p>
          </div>
          <div className="flex items-center gap-4 bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100">
            <input 
              type="range" 
              min="10" 
              max="50" 
              value={setSize} 
              onChange={(e) => setSetSize(parseInt(e.target.value))}
              className="w-32 md:w-48 accent-indigo-600 cursor-pointer"
            />
            <span className="text-2xl font-black text-indigo-600 min-w-[2.5rem] text-center">{setSize}</span>
          </div>
        </div>
        
        <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
          <Info className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-900 font-medium leading-relaxed">
            <span className="font-bold">Science-backed tip:</span> Research suggests 20 questions per set for best memory retention. Smaller bites help you master concepts 100% before moving on.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8">
        {sets.map((set) => {
          const masteredCount = set.questions.filter(q => q.box === 3).length;
          const total = set.questions.length;
          const isMastered = masteredCount === total;
          const isNotStarted = masteredCount === 0 && set.questions.every(q => q.wrongCount === 0);
          
          return (
            <motion.div
              key={set.id}
              whileHover={{ y: -5 }}
              className={`p-8 bg-white rounded-[2.5rem] border ${isMastered ? 'border-emerald-100 bg-emerald-50/10' : 'border-gray-100'} shadow-lg flex flex-col items-start text-left relative overflow-hidden group`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${isMastered ? 'bg-emerald-100/50' : 'bg-indigo-50'} rounded-bl-full -mr-12 -mt-12 transition-colors`} />
              
              <div className="flex items-center gap-3 mb-6">
                 <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isMastered ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>Set {set.id}</span>
                 {isMastered && (
                   <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                     <CheckCircle2 className="w-3 h-3" />
                     Mastered
                   </span>
                 )}
              </div>

              <h3 className="text-3xl font-black mb-1">{total} Questions</h3>
              
              <div className="mb-8 w-full">
                <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 mb-2">
                  <span>{isMastered ? 'Goal Achieved' : isNotStarted ? 'Ready to Start' : 'Progress'}</span>
                  <span>{masteredCount}/{total}</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(masteredCount / total) * 100}%` }}
                    className={`h-full ${isMastered ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-auto w-full">
                {!isMastered ? (
                  <button
                    onClick={() => onSelect(set)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-200"
                  >
                    <span>{isNotStarted ? 'Start' : 'Continue'}</span>
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onResetSet(set)}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Review Again</span>
                    </button>
                    <button
                      onClick={() => onQuickTest(set)}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-bold transition-all"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Quick Test</span>
                    </button>
                  </>
                )}
              </div>
              
              {isMastered && set.mastery && (
                <div className="mt-4 w-full text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                    🏆 Best: {set.mastery.bestRounds} rounds
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
