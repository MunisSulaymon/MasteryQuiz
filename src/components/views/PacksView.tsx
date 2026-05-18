import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Plus, 
  Folder, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Settings2, 
  Trash2,
  MoreVertical,
  Edit2,
  ArrowLeft,
  Target,
  Sparkles,
  Trash
} from 'lucide-react';
import { QuizPack } from '../../types';
import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface PacksViewProps {
  packs: QuizPack[];
  onSelect: (p: QuizPack) => void;
  onCreate: () => void;
  onEdit: (p: QuizPack) => void;
  onDelete: (p: QuizPack) => void;
  onLogout: () => void;
  user: User | null;
  onExtend: (p: QuizPack) => void;
}

const COLOR_MAP: Record<string, string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  amber: 'bg-amber-500',
  violet: 'bg-violet-500',
};

const TEXT_COLOR_MAP: Record<string, string> = {
  indigo: 'text-indigo-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
  violet: 'text-violet-600',
};

export default function PacksView({ 
  packs, 
  onSelect, 
  onCreate, 
  onEdit, 
  onDelete, 
  onLogout, 
  user,
  onExtend
}: PacksViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const weakId = searchParams.get('weak');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const weakPack = useMemo(() => packs.find(p => p.id === weakId), [packs, weakId]);

  // Check for auto-delete warnings
  const getDeleteWarning = (deleteAt: number | null) => {
    if (!deleteAt) return null;
    const now = Date.now();
    const diff = deleteAt - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) return { type: 'today', label: 'Deletes TODAY' };
    if (days === 1) return { type: 'tomorrow', label: 'Deletes tomorrow!' };
    if (days <= 3) return { type: 'critical', label: `${days} days left!` };
    if (days <= 7) return { type: 'warning', label: `${days} days left` };
    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-20 pb-40">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-100 shrink-0"
            title="Portalga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">My Packs</h2>
            <p className="text-gray-500 font-medium">Connect your sets to exams and deadlines.</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={onCreate}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-100"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Pack</span>
          </button>
          <button 
            onClick={onLogout}
            className="p-4 hover:bg-gray-100 rounded-2xl text-gray-500 transition-colors group"
            title="Log out"
          >
            <LogOut className="w-5 h-5 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {weakPack && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-12 bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-100"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Target className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-black text-amber-900 tracking-tight flex items-center gap-2">
                  🎯 {weakPack.name}
                </h3>
                <p className="text-amber-700 font-medium">{weakPack.questionCount} ta savol — Yakuniy Nazoratdan</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => onDelete(weakPack)}
                className="flex-1 md:flex-none px-6 py-4 bg-white border border-amber-200 text-amber-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-100 transition-all flex items-center justify-center gap-2"
              >
                <Trash className="w-4 h-4" />
                O'chirish
              </button>
              <button 
                onClick={() => onSelect(weakPack)}
                className="flex-1 md:flex-none px-10 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Boshlash
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {packs.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
            <div className="bg-indigo-50 p-8 rounded-full mb-6 relative">
              <Folder className="w-16 h-16 text-indigo-300" />
              <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-2 rounded-full shadow-lg animate-bounce">
                <Plus className="w-4 h-4" />
              </div>
            </div>
            <h3 className="text-3xl font-black mb-4">Welcome to MasteryQuiz! 🎓</h3>
            <p className="text-gray-500 max-w-sm font-medium leading-relaxed mb-8">
              Create your first pack to get started. Organise sets by subject or exam date with our unique auto-delete system.
            </p>
            <button 
              onClick={onCreate}
              className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-indigo-100 active:scale-95"
            >
              Get Started
            </button>
          </div>
        ) : (
          packs.map((pack) => {
            const warning = getDeleteWarning(pack.deleteAt);
            const isDeletingToday = warning?.type === 'today';

            return (
              <motion.div
                key={pack.id}
                whileHover={{ y: -5 }}
                className={`relative bg-white rounded-[2.5rem] border overflow-hidden group shadow-xl ${pack.isWeakPack ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-100'}`}
              >
                {/* Deleting Today Popup Overlay */}
                <AnimatePresence>
                  {isDeletingToday && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
                    >
                      <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
                      <h4 className="text-white text-lg font-black mb-2">Deletion Scheduled</h4>
                      <p className="text-slate-400 text-xs font-medium mb-8">
                        This pack is scheduled for deletion today. Delete now or extend by 30 days?
                      </p>
                      <div className="flex flex-col gap-3 w-full">
                        <button 
                          onClick={() => onExtend(pack)}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all"
                        >
                          Extend by 30 days
                        </button>
                        <button 
                          onClick={() => onDelete(pack)}
                          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
                        >
                          Delete Pack
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Color Strip */}
                <div className={`h-3 w-full ${COLOR_MAP[pack.color] || 'bg-indigo-500'}`} />

                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col">
                      {warning && (
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-3 ${
                          warning.type === 'warning' ? 'bg-amber-100 text-amber-700' : 
                          warning.type === 'critical' ? 'bg-orange-100 text-orange-700' : 
                          'bg-red-100 text-red-700 animate-pulse'
                        }`}>
                          {warning.type === 'today' ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {warning.label}
                        </div>
                      )}
                      {!warning && pack.deleteAt && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-3 bg-gray-100 text-gray-500">
                          <Clock className="w-3 h-3" />
                          {Math.ceil((pack.deleteAt - Date.now()) / (1000 * 60 * 60 * 24))} days left
                        </div>
                      )}
                      <h3 className="text-2xl font-black leading-tight group-hover:text-indigo-600 transition-colors uppercase">
                        {pack.isWeakPack ? '🎯 ' : ''}{pack.name}
                      </h3>
                    </div>
                    
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === pack.id ? null : pack.id);
                        }}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenu === pack.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setActiveMenu(null)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-40 overflow-hidden"
                            >
                              <button 
                                onClick={() => { onEdit(pack); setActiveMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                                Rename / Edit
                              </button>
                              <button 
                                onClick={() => { onDelete(pack); setActiveMenu(null); }}
                                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Pack
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-gray-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-widest leading-none">
                        Last studied: {new Date(pack.lastStudied).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-gray-400 mb-2">
                        <span>Pack Progress</span>
                        <span>{pack.questionCount} Questions</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: pack.questionCount > 0 ? '100%' : '0%' }}
                          className={`h-full ${COLOR_MAP[pack.color]}`} 
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelect(pack)}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg ${
                      COLOR_MAP[pack.color]
                    } hover:brightness-95 text-white active:scale-95`}
                  >
                    Open Pack
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
