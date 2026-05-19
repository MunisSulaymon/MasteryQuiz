import React from 'react';
import { cn } from '../../../lib/utils';
import { Check } from 'lucide-react';

interface OptionRowProps {
  index: number;
  text: string;
  isCorrect: boolean;
  onTextChange: (text: string) => void;
  onSetCorrect: () => void;
  hasError?: boolean;
}

const OptionRow = ({ index, text, isCorrect, onTextChange, onSetCorrect, hasError }: OptionRowProps) => {
  const letter = String.fromCharCode(65 + index);
  
  return (
    <div className={cn(
      "relative flex items-center gap-3 p-1 rounded-2xl border-2 transition-all group",
      isCorrect 
        ? "bg-emerald-50 border-emerald-200" 
        : hasError 
          ? "bg-rose-50 border-rose-200"
          : "bg-gray-50 border-transparent focus-within:border-indigo-200"
    )}>
      <button
        type="button"
        onClick={onSetCorrect}
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
          isCorrect 
            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" 
            : "bg-white text-gray-400 hover:text-indigo-600 shadow-sm border border-gray-100"
        )}
      >
        {isCorrect ? <Check className="w-6 h-6 stroke-[3px]" /> : <span className="font-black text-lg">{letter}</span>}
      </button>

      <div className="flex-1 min-w-0 flex items-center pr-4">
        <input
          type="text"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`${letter} javob variantini kiriting...`}
          className="w-full py-3 bg-transparent border-none focus:ring-0 text-sm font-semibold placeholder:text-gray-400"
        />
        {isCorrect && (
           <span className="hidden sm:inline text-[10px] font-black uppercase text-emerald-600 tracking-widest ml-2 shrink-0">
             To'g'ri javob
           </span>
        )}
      </div>

      {isCorrect && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
      )}
    </div>
  );
};

export default React.memo(OptionRow);
