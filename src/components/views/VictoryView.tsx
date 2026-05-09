import { motion } from 'motion/react';
import { PartyPopper } from 'lucide-react';

export default function VictoryView({ onHome }: { onHome: () => void }) {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center text-center">
      <motion.div 
        initial={{ scale: 0, rotate: -45 }} 
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 10 }}
        className="bg-yellow-400 p-10 rounded-full mb-12 shadow-2xl shadow-yellow-200"
      >
        <PartyPopper className="w-24 h-24 text-white" />
      </motion.div>
      <h1 className="text-6xl font-black mb-6 tracking-tight text-slate-900">Victory!</h1>
      <p className="text-2xl text-gray-600 mb-12 max-w-2xl">
        You conquered your weak spots! All difficult concepts have been mastered through intense repetition.
      </p>
      <button
        onClick={onHome}
        className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl hover:scale-105 active:scale-95 transition-all"
      >
        Back to Sets
      </button>
    </div>
  );
}
