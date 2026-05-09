import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { LogIn, LogOut, Loader2, ClipboardList, ChevronRight, XCircle } from 'lucide-react';
import { QuizSet } from '../../types';
import { memo } from 'react';

interface LandingViewProps {
  inputText: string;
  setInputText: (v: string) => void;
  onParse: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isDataLoading: boolean;
  sets: QuizSet[];
  isParsing: boolean;
  parseProgress: number;
  parseError: string | null;
}

const LandingView = memo(function LandingView({ inputText, setInputText, onParse, user, onLogin, onLogout, isDataLoading, sets, isParsing, parseProgress, parseError }: LandingViewProps) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">
      <div className="w-full flex justify-end mb-8">
        {user ? (
          <div className="flex items-center gap-4 bg-white p-2 pr-4 rounded-full shadow-md border border-gray-100">
            {user.photoURL && <img referrerPolicy="no-referrer" src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />}
            <span className="text-sm font-bold text-gray-600 hidden sm:inline">{user.email}</span>
            <button onClick={onLogout} className="p-2 hover:bg-red-50 rounded-full text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-gray-50 text-indigo-600 font-bold rounded-xl shadow-md border border-gray-100 transition-all"
          >
            <LogIn className="w-5 h-5" />
            <span>Sign In to Sync</span>
          </button>
        )}
      </div>

      <div className="bg-indigo-600 p-4 rounded-3xl mb-8 shadow-xl shadow-indigo-200">
        <ClipboardList className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-5xl font-black mb-6 tracking-tight">MasteryQuiz</h1>
      <p className="text-xl text-gray-600 mb-12 max-w-2xl">
        Paste your questions below to start an adaptive mastery-based session. 
        We use the <span className="font-bold text-indigo-600">Leitner system</span> to ensure you 100% master every concept.
      </p>

      {isDataLoading && (
        <div className="flex items-center gap-2 text-indigo-600 font-bold mb-4 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Restoring your progress...</span>
        </div>
      )}

      {parseError && (
        <div className="w-full bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 text-left">
          <XCircle className="w-6 h-6 flex-shrink-0" />
          <p className="font-medium">{parseError}</p>
        </div>
      )}

      <div className="w-full bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 mb-8 text-left">
        <textarea
          id="question-input"
          className="w-full h-80 p-6 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-all font-mono text-sm resize-none"
          placeholder="What is X?&#10;====&#10;Option A&#10;====&#10;#Option B (correct)&#10;====&#10;Option C&#10;====&#10;Option D&#10;++++&#10;..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
      </div>

      <button
        id="parse-btn"
        onClick={onParse}
        disabled={!inputText.trim() || isParsing}
        className="group relative px-12 py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold text-xl shadow-xl transition-all hover:scale-105 active:scale-95 flex flex-col items-center gap-1 min-w-[280px]"
      >
        {isParsing ? (
          <>
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Parsing... {parseProgress}%</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full bg-white" 
                initial={{ width: 0 }}
                animate={{ width: `${parseProgress}%` }}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <span>{sets.length > 0 ? 'Continue Quiz' : 'Build Your Quiz'}</span>
            <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </button>
    </div>
  );
});

export default LandingView;
