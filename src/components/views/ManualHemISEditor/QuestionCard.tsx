import React from 'react';
import { motion } from 'motion/react';
import { EditorQuestion } from '../../../hooks/useManualEditor';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface QuestionCardProps {
  question: EditorQuestion;
  index: number;
  isActive: boolean;
  onClick: () => void;
  hasErrors?: boolean;
}

const QuestionCard = ({ question, index, isActive, onClick, hasErrors }: QuestionCardProps) => {
  const correctLetter = question.correctIndex >= 0 ? String.fromCharCode(65 + question.correctIndex) : '?';
  
  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "cursor-pointer p-4 rounded-2xl border-2 transition-all mb-3",
        isActive 
          ? "bg-indigo-50 border-indigo-500 shadow-md" 
          : "bg-white border-gray-100 hover:border-gray-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0",
          isActive ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"
        )}>
          {index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-bold truncate",
            isActive ? "text-indigo-900" : "text-gray-700"
          )}>
            {question.text || <span className="italic text-gray-400">Matn yo'q...</span>}
          </p>
          
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1">
              <div className={cn(
                "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold",
                question.correctIndex >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
              )}>
                {correctLetter}
              </div>
              <span className="text-[10px] uppercase font-black text-gray-400 tracking-wider">To'g'ri javob</span>
            </div>

            {hasErrors && (
              <div className="flex items-center gap-1 text-rose-500 animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span className="text-[10px] font-black uppercase">Xatolik</span>
              </div>
            )}
            
            {question.isDirty && !hasErrors && (
              <div className="w-2 h-2 rounded-full bg-blue-500" title="Saqlanmagan" />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(QuestionCard);
