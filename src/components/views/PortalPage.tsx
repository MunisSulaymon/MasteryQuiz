import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, HelpCircle, Settings, LogIn, LogOut, ClipboardCheck, ArrowRight, Info, CheckCircle2, Cloud } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'firebase/auth';
import { QuizPack } from '../../types';

interface PortalPageProps {
  user: User | null;
  packs: QuizPack[];
  onLogin: () => void;
  onLogout: () => void;
  isAuthLoading: boolean;
  onStudy: () => void;
  onExam: () => void;
}

export default function PortalPage({ user, packs, onLogin, onLogout, isAuthLoading, onStudy, onExam }: PortalPageProps) {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = React.useState(false);
  const [dismissedTooltip, setDismissedTooltip] = React.useState(() => {
    return localStorage.getItem('portal_tooltip_dismissed') === 'true';
  });

  // Calculate stats
  const totalPacks = packs.length;
  const masteryPercentage = React.useMemo(() => {
    if (totalPacks === 0) return 0;
    // This is a rough estimation for the portal card
    // Real mastery would require loading all packs data, which we avoid to keep it fast
    // For now, we'll just use a placeholder or logic if we have it cached
    return 0; 
  }, [totalPacks]);

  const streak = 0; // Placeholder for now

  React.useEffect(() => {
    if (!dismissedTooltip && totalPacks === 0) {
      setShowTooltip(true);
    }
  }, [dismissedTooltip, totalPacks]);

  const handleDismissTooltip = () => {
    setShowTooltip(false);
    setDismissedTooltip(true);
    localStorage.setItem('portal_tooltip_dismissed', 'true');
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] text-gray-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="pt-12 pb-8 px-6 flex flex-col items-center text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl shadow-gray-200/50 flex items-center justify-center p-3 border border-gray-100">
            <div className="w-full h-full bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl italic tracking-tighter">
              MQ
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900 mt-4 leading-none">
            Mastery<span className="text-indigo-600">Quiz</span>
          </h1>
          <p className="text-gray-500 font-medium text-lg mt-2 tracking-tight">
            Ikki xil platforma — bir xil maqsad
          </p>
        </motion.div>
      </header>

      {/* Tooltip */}
      {showTooltip && (
        <div className="max-w-[400px] mx-auto px-6 mb-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-indigo-600 text-white p-5 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col gap-4 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg leading-tight">MasteryQuiz'ga xush kelibsiz!</h3>
                <p className="text-indigo-100 text-sm mt-1 leading-relaxed">
                  O'rganish yoki imtihon platformasini tanlang va bilimingizni boyiting.
                </p>
              </div>
            </div>
            <button 
              onClick={handleDismissTooltip}
              className="w-full py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-colors"
            >
              Tushundim
            </button>
          </motion.div>
        </div>
      )}

      {/* Login Banner */}
      {!user && !isAuthLoading && (
        <div className="max-w-[400px] mx-auto px-6 mb-6">
          <button 
            onClick={onLogin}
            className="w-full p-4 bg-emerald-600 text-white rounded-3xl flex items-center gap-4 hover:bg-emerald-700 transition-all group shadow-lg shadow-emerald-100"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-widest">Bulutga saqlash</p>
              <p className="text-sm font-bold truncate">☁️ Kirish qiling va progressizni saqlang</p>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-100 ml-auto group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <main className="max-w-[400px] mx-auto px-6 pb-24 flex flex-col gap-6">
        
        {/* Study Platform Card */}
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="bg-blue-50 border-2 border-blue-200 rounded-[2.5rem] p-8 flex flex-col gap-6 cursor-pointer relative overflow-hidden"
          onClick={onStudy}
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BookOpen className="w-24 h-24 text-blue-600" />
          </div>

          <div className="flex flex-col gap-4 relative">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center">
              <span className="text-3xl">📚</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-blue-900 tracking-tight leading-none italic">
                O'rganish platformasi
              </h2>
              <p className="text-blue-700/70 font-bold text-sm mt-2 leading-tight">
                Doimiy eslab qolish. Xatolaringizdan saboq oling.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-blue-700/50 pt-2 border-t border-blue-200/50">
            <div className="flex items-center gap-1.5">
              <span>📊 O'zlashtirish: {masteryPercentage}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>🔥 {streak} kun</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
             <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-200 active:scale-95 text-center">
                Platformaga o'tish
             </button>
             {totalPacks > 0 && (
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3" />
                  {totalPacks} ta to'plam mavjud
                </div>
             )}
          </div>
        </motion.div>

        {/* Exam Platform Card */}
        <motion.div
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          className="bg-emerald-50 border-2 border-emerald-200 rounded-[2.5rem] p-8 flex flex-col gap-6 cursor-pointer relative overflow-hidden"
          onClick={onExam}
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ClipboardCheck className="w-24 h-24 text-emerald-600" />
          </div>

          <div className="flex flex-col gap-4 relative">
            <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center">
              <span className="text-3xl">📝</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-emerald-900 tracking-tight leading-none italic">
                Sinov platformasi
              </h2>
              <p className="text-emerald-700/70 font-bold text-sm mt-2 leading-tight">
                Haqiqiy HEMIS imtihon simulyatsiyasi.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-emerald-700/50 pt-2 border-t border-emerald-200/50">
            <div className="flex items-center gap-1.5">
              <span>⏱️ Oxirgi natija: --</span>
            </div>
          </div>

          <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-200 active:scale-95 text-center">
            Platformaga o'tish
          </button>
        </motion.div>

      </main>

      {/* Footer / Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-gray-100 py-4 px-8 z-40">
        <div className="max-w-[400px] mx-auto flex items-center justify-between">
          <div className="flex gap-6">
            <button className="flex flex-col items-center gap-1 group">
              <Settings className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-indigo-600 transition-colors">Sozlamalar</span>
            </button>
            <button className="flex flex-col items-center gap-1 group">
              <HelpCircle className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-tighter text-gray-400 group-hover:text-indigo-600 transition-colors">Yordam</span>
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden xs:block">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter leading-none">Xush kelibsiz</p>
                <p className="text-xs font-bold text-gray-700 leading-tight truncate max-w-[80px]">{user.displayName || user.email?.split('@')[0]}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all border border-gray-100"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              disabled={isAuthLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-colors active:scale-95 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              Kirish
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
