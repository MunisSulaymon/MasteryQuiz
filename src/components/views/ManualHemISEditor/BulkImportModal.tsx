import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { parseHemisText, ParseError } from '../../../utils/hemisParser';
import { ExamQuestion } from '../../../types';
import { cn } from '../../../lib/utils';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: ExamQuestion[]) => void;
}

const BulkImportModal = ({ isOpen, onClose, onImport }: BulkImportModalProps) => {
  const [text, setText] = useState('');
  const [parsingResult, setParsingResult] = useState<{ questions: Partial<ExamQuestion>[], errors: ParseError[] } | null>(null);

  const handleAnalyze = () => {
    const result = parseHemisText(text);
    setParsingResult(result);
  };

  const handleImport = () => {
    if (!parsingResult) return;
    // Only import questions that don't have catastrophic errors if possible, 
    // or just import all and let the editor handle validation.
    // Given the requirement, we import the valid ones.
    onImport(parsingResult.questions as ExamQuestion[]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-lg shadow-indigo-200">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-none mb-1">Ommaviy yuklash</h2>
              <p className="text-sm font-bold text-gray-400">HEMIS formatidagi matnni joylashtiring</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10">
          {!parsingResult ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <p className="text-xs font-bold text-blue-700">
                  Siz matndagi barcha savollarni bir vaqtning o'zida import qilishingiz mumkin.
                </p>
              </div>
              
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"Sarlavha\n====\nVariant 1\n====\n#To'g'ri variant\n====\nVariant 3\n====\nVariant 4\n++++"}
                className="w-full h-80 p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 focus:border-indigo-500 focus:ring-0 outline-none transition-all font-mono text-sm"
              />
              
              <button
                onClick={handleAnalyze}
                disabled={!text.trim()}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-indigo-200"
              >
                Tahlil qilish
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Topilgan savollar</p>
                  <p className="text-3xl font-black text-emerald-900">{parsingResult.questions.length}</p>
                </div>
                <div className={cn(
                  "p-6 rounded-3xl border",
                  parsingResult.errors.length > 0 ? "bg-rose-50 border-rose-100" : "bg-gray-50 border-gray-100"
                )}>
                  <p className={cn(
                    "text-[10px] font-black uppercase mb-1",
                    parsingResult.errors.length > 0 ? "text-rose-600" : "text-gray-400"
                  )}>Xatoliklar</p>
                  <p className={cn(
                    "text-3xl font-black",
                    parsingResult.errors.length > 0 ? "text-rose-900" : "text-gray-300"
                  )}>{parsingResult.errors.length}</p>
                </div>
              </div>

              {parsingResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-gray-400">Xatolik tafsilotlari:</h4>
                  <div className="space-y-2">
                    {parsingResult.errors.map((err, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-rose-700">{err.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setParsingResult(null)}
                  className="flex-1 py-5 bg-white border-2 border-gray-100 hover:border-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-sm"
                >
                  Orqaga
                </button>
                <button
                  onClick={handleImport}
                  disabled={parsingResult.questions.length === 0}
                  className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Import qilish
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BulkImportModal;
