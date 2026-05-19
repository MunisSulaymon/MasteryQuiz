import React, { useState } from 'react';
import { EditorQuestion } from '../../../hooks/useManualEditor';
import OptionRow from './OptionRow';
import HemisPreview from './HemisPreview';
import { ChevronDown, ChevronUp, Layers, Target, BrainCircuit } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { ValidationError } from '../../../hooks/useValidation';

interface QuestionFormPanelProps {
  question: EditorQuestion;
  onUpdateStem: (text: string) => void;
  onUpdateOption: (idx: number, text: string) => void;
  onSetCorrect: (idx: number) => void;
  onUpdateMetadata: (updates: any) => void;
  errors: ValidationError[];
}

const QuestionFormPanel = ({ 
  question, 
  onUpdateStem, 
  onUpdateOption, 
  onSetCorrect, 
  onUpdateMetadata,
  errors
}: QuestionFormPanelProps) => {
  const [showMetadata, setShowMetadata] = useState(false);

  const getFieldError = (field: string) => errors.find(e => e.field === field);
  const stemError = getFieldError('stem');
  const optionsError = getFieldError('options') || getFieldError('duplicates');
  const correctError = getFieldError('correct');

  return (
    <div className="space-y-8 pb-32">
      {/* Stem Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100 border border-gray-100">
         <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Savol matni</h3>
            {stemError && <span className="text-[10px] font-black text-rose-500 uppercase">{stemError.message}</span>}
         </div>
         <textarea
           value={question.text}
           onChange={(e) => onUpdateStem(e.target.value)}
           placeholder="Savol matnini kiriting..."
           className={cn(
             "w-full min-h-[120px] p-6 bg-gray-50 rounded-2xl border-2 transition-all focus:ring-0 outline-none text-lg font-bold placeholder:text-gray-300",
             stemError ? "border-rose-200 focus:border-rose-300" : "border-transparent focus:border-indigo-500"
           )}
         />
      </div>

      {/* Options Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100 border border-gray-100">
         <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">Variantlar</h3>
            <div className="flex items-center gap-2">
               {optionsError && <span className="text-[10px] font-black text-rose-500 uppercase">{optionsError.message}</span>}
               {correctError && <span className="text-[10px] font-black text-rose-500 uppercase">{correctError.message}</span>}
            </div>
         </div>
         
         <div className="space-y-3">
           {question.options.map((opt, idx) => (
             <OptionRow
               key={idx}
               index={idx}
               text={opt}
               isCorrect={question.correctIndex === idx}
               onTextChange={(text) => onUpdateOption(idx, text)}
               onSetCorrect={() => onSetCorrect(idx)}
               hasError={!!optionsError}
             />
           ))}
         </div>
      </div>

      {/* Metadata Section */}
      <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-lg shadow-gray-50">
        <button
          onClick={() => setShowMetadata(!showMetadata)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
              <Layers className="w-5 h-5" />
            </div>
            <span className="font-black text-sm uppercase tracking-wider text-gray-700">Qo'shimcha sozlamalar</span>
          </div>
          {showMetadata ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showMetadata && (
          <div className="p-8 border-t border-gray-50 bg-gray-50/30 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Difficulty */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Qiyinchilik darajasi</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['oson', 'orta', 'qiyin'] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => onUpdateMetadata({ difficulty: d })}
                      className={cn(
                        "py-3 rounded-xl text-xs font-black uppercase tracking-wider border-2 transition-all",
                        question.difficulty === d
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                          : "bg-white border-gray-100 text-gray-400 hover:border-indigo-200"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Mavzu / Bo'lim</label>
                <div className="relative">
                  <Target className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={question.topic || ''}
                    onChange={(e) => onUpdateMetadata({ topic: e.target.value })}
                    placeholder="Masalan: Anatomiya"
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-0 text-sm font-bold placeholder:text-gray-300"
                  />
                </div>
              </div>

              {/* Bloom's Taxonomy */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">Bloom taksonomiyasi</label>
                <div className="relative">
                  <BrainCircuit className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={question.bloomsLevel || ''}
                    onChange={(e) => onUpdateMetadata({ bloomsLevel: e.target.value as any })}
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border-2 border-gray-100 focus:border-indigo-500 focus:ring-0 text-sm font-bold appearance-none"
                  >
                    <option value="">Tanlanmagan</option>
                    <option value="Remember">Bilish (Remember)</option>
                    <option value="Understand">Tushunish (Understand)</option>
                    <option value="Apply">Qo'llash (Apply)</option>
                    <option value="Analyze">Tahlil (Analyze)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <HemisPreview question={question} />
    </div>
  );
};

export default React.memo(QuestionFormPanel);
