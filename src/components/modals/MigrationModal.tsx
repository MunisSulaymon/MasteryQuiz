import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cloud, X, Check, Loader2, ArrowRight } from 'lucide-react';

interface MigrationModalProps {
  packCount: number;
  questionCount: number;
  onConfirm: () => void;
  onCancel: () => void;
  isMigrating: boolean;
}

export default function MigrationModal({ 
  packCount, 
  questionCount, 
  onConfirm, 
  onCancel, 
  isMigrating 
}: MigrationModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-6">
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-2">
            <Cloud className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black tracking-tight leading-tight text-gray-900 italic">
            Ma'lumotlarni ko'chirish
          </h2>
          <p className="text-gray-500 font-medium text-sm">
            Mahalliy ma'lumotlaringizni bulutga ko'chirishni xohlaysizmi? Bu progressni barcha qurilmalarda ko'rish imkonini beradi.
          </p>
          
          <div className="w-full bg-gray-50 rounded-3xl p-5 border border-gray-100 flex items-center justify-between">
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ko'chiriladigan ma'lumotlar</p>
              <p className="text-sm font-bold text-gray-700 mt-1">
                {packCount} ta to'plam, {questionCount} ta savol
              </p>
            </div>
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="flex flex-col w-full gap-3">
            <button 
              onClick={onConfirm}
              disabled={isMigrating}
              className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isMigrating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ko'chirilmoqda...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Ha, ko'chirish
                </>
              )}
            </button>
            <button 
              onClick={onCancel}
              disabled={isMigrating}
              className="w-full py-5 bg-white text-gray-400 rounded-[2rem] font-black uppercase tracking-widest text-[10px] transition-all hover:text-gray-600"
            >
              Keyinroq
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
