import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { motion } from 'motion/react';

export const BackButton: React.FC = () => {
  const { state, pop } = useNavigation();
  const canPop = state.stack.length > 1;

  if (!canPop) return null;

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      onClick={pop}
      className="p-3 bg-white/80 backdrop-blur-md rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-2 group"
      aria-label="Ortga"
    >
      <ChevronLeft className="w-5 h-5 text-gray-600 transition-transform group-hover:-translate-x-0.5" />
      <span className="hidden md:inline text-xs font-black uppercase tracking-widest text-gray-500">Ortga</span>
    </motion.button>
  );
};
