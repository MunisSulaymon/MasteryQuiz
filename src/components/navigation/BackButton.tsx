import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { motion } from 'motion/react';

export const BackButton: React.FC = () => {
  const { state, pop } = useNavigation();
  const canPop = state.stack.length > 1;

  console.log(`[BackButton] Rendering BackButton. canPop=${canPop}, stack=`, state.stack);

  if (!canPop) return null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={() => {
        pop();
      }}
      className="px-3.5 py-2 min-h-[44px] bg-white/90 backdrop-blur-md rounded-xl border border-gray-200/80 shadow-xs hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5 group select-none cursor-pointer"
      aria-label="Ortga qaytish"
    >
      <ChevronLeft className="w-5 h-5 text-gray-700 transition-transform group-hover:-translate-x-0.5" />
      <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Ortga</span>
    </motion.button>
  );
};
