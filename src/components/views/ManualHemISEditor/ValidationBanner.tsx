import React from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { ValidationError } from '../../../hooks/useValidation';

interface ValidationBannerProps {
  errors: ValidationError[];
  onGoToError: (index: number) => void;
}

const ValidationBanner = ({ errors, onGoToError }: ValidationBannerProps) => {
  if (errors.length === 0) return null;

  // Group errors by unique question index
  const uniqueQuestionErrors = Array.from(new Set(errors.map(e => e.questionIndex))).length;

  return (
    <div className="bg-rose-50 border-b border-rose-100 p-4 sticky top-0 z-20 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-rose-500 p-1.5 rounded-lg text-white">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm font-black text-rose-900">
            {uniqueQuestionErrors} ta savolda xatolik bor
          </p>
          <p className="text-[11px] font-bold text-rose-600/80 leading-tight">
            Saqlashdan oldin barcha xatolarni tuzatish kerak
          </p>
        </div>
      </div>
      
      <div className="flex -space-x-2">
        {errors.slice(0, 3).map((err, i) => (
          <button
            key={i}
            onClick={() => onGoToError(err.questionIndex)}
            className="w-8 h-8 rounded-full bg-white border-2 border-rose-200 text-rose-600 flex items-center justify-center text-xs font-black hover:bg-rose-100 transition-colors shadow-sm"
          >
            {err.questionIndex + 1}
          </button>
        ))}
        {errors.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center text-[10px] font-black border-2 border-white">
            +{errors.length - 3}
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationBanner;
